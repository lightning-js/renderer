/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2023 Comcast Cable Communications Management, LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { CoreRenderer, type BufferInfo } from '../CoreRenderer.js';
import type { CoreContextTexture } from '../CoreContextTexture.js';
import {
  createIndexBuffer,
  type CoreWebGlParameters,
  type CoreWebGlExtensions,
  getWebGlParameters,
  getWebGlExtensions,
  type WebGlColor,
} from './internal/RendererUtils.js';
import { WebGlCtxTexture } from './WebGlCtxTexture.js';
import {
  Texture,
  TextureType,
  type TextureCoords,
} from '../../textures/Texture.js';
import { SubTexture } from '../../textures/SubTexture.js';
import { WebGlCtxSubTexture } from './WebGlCtxSubTexture.js';
import {
  BufferCollection,
  QUAD_VERTEX_STRIDE,
} from './internal/BufferCollection.js';
import {
  compareRect,
  getNormalizedRgbaComponents,
  type RectWithValid,
} from '../../lib/utils.js';
import { mergeColorAlpha } from '../../../utils.js';
import {
  SdfBuffer,
  SDF_PLAIN_GLYPH_STRIDE,
  SDF_RICH_GLYPH_STRIDE,
} from './SdfBuffer.js';
import { SdfRenderOp } from './SdfRenderOp.js';
import { WebGlShaderProgram } from './WebGlShaderProgram.js';
import { RenderTexture } from '../../textures/RenderTexture.js';
import { CoreNodeRenderState, CoreNode } from '../../CoreNode.js';
import { WebGlCtxRenderTexture } from './WebGlCtxRenderTexture.js';
import { Default } from '../../shaders/webgl/Default.js';
import { StencilClip } from '../../shaders/webgl/StencilClip.js';
import type { WebGlShaderType } from './WebGlShaderNode.js';
import { WebGlShaderNode } from './WebGlShaderNode.js';
import type { Dimensions } from '../../../common/CommonTypes.js';
import type { GlContextWrapper } from '../../platforms/GlContextWrapper.js';
import type { Stage } from '../../Stage.js';
import type { CoreTextNode } from '../../CoreTextNode.js';

interface CoreWebGlSystem {
  parameters: CoreWebGlParameters;
  extensions: CoreWebGlExtensions;
}

// Dirty-ratio cutoff that flips the per-frame quad upload from surgical
// `bufferSubData` (one call per changed node) to a single full `bufferData`.
// The surgical path wins when few nodes change per frame; when most of the
// scene moves at once a single bulk upload is cheaper than N driver
// round-trips, so when the number of nodes we would `bufferSubData` exceeds
// this fraction of the render list we upload everything in one call instead.
const FULL_UPLOAD_DIRTY_RATIO = 0.4;

// White (0xFFFFFFFF as 0xRRGGBBAA packed little-endian): all UNSIGNED_BYTE
// channels = 255 → 1.0. A span color of pure white means "no override".
const _PACKED_WHITE = 0xffffffff;

/**
 * Merge a node's packed color (with alpha) into a rich-text span color.
 *
 * Both colors are packed RGBA bytes (byte0 = R … byte3 = A, matching
 * `SdfTextRenderer._packColor`). The old per-node renderer combined these in
 * the fragment shader as `u_color * v_color`; the batched pipeline has no
 * `u_color` uniform, so the multiplication happens here on the CPU. RGB is
 * NOT premultiplied by alpha — the SDF fragment shader multiplies
 * `v_color.rgb` by the computed opacity (which includes `v_color.a`).
 */
const _mergeSdfSpanColor = (nodeColor: number, spanColor: number): number => {
  if (spanColor === _PACKED_WHITE) {
    return nodeColor;
  }
  const nr = nodeColor & 0xff;
  const ng = (nodeColor >>> 8) & 0xff;
  const nb = (nodeColor >>> 16) & 0xff;
  const na = (nodeColor >>> 24) & 0xff;
  const sr = spanColor & 0xff;
  const sg = (spanColor >>> 8) & 0xff;
  const sb = (spanColor >>> 16) & 0xff;
  const sa = (spanColor >>> 24) & 0xff;
  const r = (nr * sr + 127) >> 8;
  const g = (ng * sg + 127) >> 8;
  const b = (nb * sb + 127) >> 8;
  const a = (na * sa + 127) >> 8;
  return (r | (g << 8) | (b << 16) | (a << 24)) >>> 0;
};

/**
 * Pre-allocated sentinel op inserted into the renderOps array to bracket the
 * child quads of a node that uses rounded-corner stencil clipping.
 *
 * `kind === 0` = begin stencil write pass (before children)
 * `kind === 1` = end stencil region (after children)
 *
 * Objects are reused from a pool on WebGlRenderer — never heap-allocated per frame.
 */
export class StencilClipRenderOp {
  kind: 0 | 1 = 0;
  x: number = 0;
  y: number = 0;
  w: number = 0;
  h: number = 0;
  clipRadius: number = 0;
  pixelRatio: number = 1;
  canvasHeight: number = 0;
  parentHasRenderTexture: boolean = false;
  parentFramebufferH: number = 0;
  stencilRef: number = 0;
}

export type WebGlNodeRenderOp = CoreNode | CoreTextNode;
export type WebGlRenderOp =
  | WebGlNodeRenderOp
  | StencilClipRenderOp
  | SdfRenderOp;

export class WebGlRenderer extends CoreRenderer {
  //// WebGL Native Context and Data
  glw: GlContextWrapper;
  system: CoreWebGlSystem;

  //// Persistent data
  quadBuffer: ArrayBuffer;
  fQuadBuffer: Float32Array;
  uiQuadBuffer: Uint32Array;
  renderOps: WebGlRenderOp[] = [];

  //// Render Op / Buffer Filling State
  curBufferIdx = 0;
  curRenderOp: WebGlRenderOp | null = null;
  override rttNodes: CoreNode[] = [];
  activeRttNode: CoreNode | null = null;

  // When true the entire quad buffer is re-uploaded via bufferData instead of
  // the surgical per-node bufferSubData path. True on the first frame and
  // whenever the render list changes structurally (node added/removed/reordered)
  // or the buffer grows past the last uploaded size.
  needsFullUpload = true;
  // Number of float32 elements last uploaded to the GPU via bufferData. Used
  // to detect when curBufferIdx has grown beyond the GPU buffer's capacity,
  // requiring a full re-upload even when needsFullUpload is false.
  lastUploadedBufferSize = 0;
  // Count of main-scene nodes whose quad data changed this frame and which own
  // a buffer slot. Accumulated during the addQuad pass and consumed by render()
  // to choose between surgical uploads and a single full upload.
  dirtyQuadCount = 0;

  // Dedicated CPU buffer for RTT quad data. Main-scene nodes own permanent
  // slots in quadBuffer and only rewrite when dirty, so RTT writing into the
  // same backing storage at index 0 would silently corrupt non-dirty slots.
  // Allocated lazily on first RTT pass.
  rttQuadBuffer: ArrayBuffer | null = null;
  fRttQuadBuffer: Float32Array | null = null;
  uiRttQuadBuffer: Uint32Array | null = null;

  // Reusable 20-float scratch buffer for surgical uploads. Avoids allocating a
  // typed-array view per dirty node per frame (GC pressure in scroll-heavy
  // scenes). Mirrors the stencil scratch buffer pattern below.
  private readonly _quadScratchBuffer: ArrayBuffer = new ArrayBuffer(
    20 * Float32Array.BYTES_PER_ELEMENT,
  );
  private readonly _quadScratchF: Float32Array = new Float32Array(
    this._quadScratchBuffer,
  );

  //// Shared SDF Text Batching
  /**
   * Shared SDF vertex buffers — one per GPU layout.
   *
   * All SDF text of a given layout writes into a single pre-allocated CPU
   * buffer that is uploaded to the GPU in one `bufferData` per frame. Compatible
   * consecutive text nodes are merged into a single SdfRenderOp, producing one
   * draw call for many strings.
   *
   * The two layouts have different strides (6 floats plain / 7 floats rich) and
   * can therefore never share a draw call; each gets its own buffer, and each
   * SdfRenderOp carries the SdfBuffer it draws from.
   */
  sdfBufferPlain: SdfBuffer;
  sdfBufferRich: SdfBuffer;
  /**
   * Current SDF render op being extended by `finalizeSdfBatch`. Null when the
   * last op is not extendable (different atlas, clipping rect, or RTT state).
   */
  curSdfRenderOp: SdfRenderOp | null = null;
  /**
   * Deferred queue for SDF text render ops.
   *
   * All text encountered during the quad-fill pass is collected here and
   * appended to `renderOps` at the start of `render()` (see
   * `flushTextRenderOps`). This guarantees that all text in a frame draws in a
   * single contiguous run of draw calls, which is the whole point of text
   * batching. Text always draws on top of any non-text quads that came after it
   * in tree order (unless those quads carry an explicit zIndex, which forces an
   * early flush in addQuad).
   */
  coreTextRenderOps: WebGlRenderOp[] = [];

  override defaultTextureCoords: TextureCoords = {
    x1: 0,
    y1: 0,
    x2: 1,
    y2: 1,
  };

  //// Default Shader
  defaultShaderNode: WebGlShaderNode | null = null;
  quadBufferCollection: BufferCollection;

  //// Stencil clip program (compiled once, reused every frame)
  stencilClipProgram: WebGlShaderProgram | null = null;
  stencilDepth: number = 0;

  //// Dedicated VBO for the stencil write-pass quad.
  //// Completely separate from quadBufferCollection so the main quad buffer is
  //// never overwritten during a stencil pass — eliminates the O(N) restore uploads.
  private stencilQuadBufferCollection: BufferCollection | null = null;

  //// Pre-allocated pool of StencilClipRenderOp sentinels (avoids per-frame heap allocation)
  private stencilOpPool: StencilClipRenderOp[] = [];
  private stencilOpPoolIdx: number = 0;

  //// Scratch buffer for the single-quad stencil geometry (4 vertices × 5 floats = 20 floats)
  private readonly _stencilScratchBuffer: ArrayBuffer = new ArrayBuffer(
    20 * Float32Array.BYTES_PER_ELEMENT,
  );
  private readonly _stencilScratchF: Float32Array = new Float32Array(
    this._stencilScratchBuffer,
  );
  private readonly _stencilScratchU: Uint32Array = new Uint32Array(
    this._stencilScratchBuffer,
  );

  clearColor: WebGlColor = {
    raw: 0x00000000,
    normalized: [0, 0, 0, 0],
  };

  /**
   * White pixel texture used by default when no texture is specified.
   */

  quadBufferUsage = 0;
  numQuadsRendered = 0;
  /**
   * Whether the renderer is currently rendering to a texture.
   */
  public renderToTextureActive = false;

  constructor(stage: Stage) {
    super(stage);

    this.quadBuffer = new ArrayBuffer(stage.options.quadBufferSize);
    this.fQuadBuffer = new Float32Array(this.quadBuffer);
    this.uiQuadBuffer = new Uint32Array(this.quadBuffer);

    this.mode = 'webgl';

    const platform = stage.platform;
    const canvas = platform.canvas!;

    const glw = (this.glw = platform.createContext() as GlContextWrapper);
    glw.viewport(0, 0, canvas.width, canvas.height);

    this.updateClearColor(stage.clearColor);

    glw.setBlend(true);
    glw.blendFunc(glw.ONE, glw.ONE_MINUS_SRC_ALPHA);

    createIndexBuffer(glw, stage.bufferMemory);

    this.system = {
      parameters: getWebGlParameters(this.glw),
      extensions: getWebGlExtensions(this.glw),
    };
    const quadBuffer = glw.createBuffer();

    // Per-vertex stride is 5 floats (20 bytes): a_position (2 floats),
    // a_textureCoords (2 floats) and a_color (4 bytes packed into the 20-byte
    // stride). a_nodeCoords is provided by the separate static VBO below, so it
    // is no longer duplicated in every vertex.
    const stride = QUAD_VERTEX_STRIDE * Float32Array.BYTES_PER_ELEMENT;

    // Static node-coords VBO. Every quad maps its vertices onto the four
    // corners of a unit square [0,0],[1,0],[0,1],[1,1]. Because the data is
    // identical for every quad it is uploaded a single time and shared by all
    // BufferCollections, removing 2 floats per vertex from the main quad buffer.
    const maxQuads = ~~(this.stage.bufferMemory / 80); // same sizing as createIndexBuffer
    const nodeCoords = new Float32Array(maxQuads * 8);
    for (let i = 0; i < maxQuads * 8; i += 8) {
      nodeCoords[i] = 0;
      nodeCoords[i + 1] = 0;
      nodeCoords[i + 2] = 1;
      nodeCoords[i + 3] = 0;
      nodeCoords[i + 4] = 0;
      nodeCoords[i + 5] = 1;
      nodeCoords[i + 6] = 1;
      nodeCoords[i + 7] = 1;
    }
    const nodeCoordsBuffer = glw.createBuffer();
    glw.arrayBufferData(nodeCoordsBuffer, nodeCoords, glw.STATIC_DRAW);

    this.quadBufferCollection = new BufferCollection([
      {
        buffer: quadBuffer!,
        attributes: {
          a_position: {
            name: 'a_position',
            size: 2, // 2 components per iteration
            type: glw.FLOAT, // the data is 32bit floats
            normalized: false, // don't normalize the data
            stride, // 0 = move forward size * sizeof(type) each iteration to get the next position
            offset: 0, // start at the beginning of the buffer
          },
          a_textureCoords: {
            name: 'a_textureCoords',
            size: 2,
            type: glw.FLOAT,
            normalized: false,
            stride,
            offset: 2 * Float32Array.BYTES_PER_ELEMENT,
          },
          a_color: {
            name: 'a_color',
            size: 4,
            type: glw.UNSIGNED_BYTE,
            normalized: true,
            stride,
            offset: 4 * Float32Array.BYTES_PER_ELEMENT,
          },
        },
      },
      {
        buffer: nodeCoordsBuffer!,
        attributes: {
          a_nodeCoords: {
            name: 'a_nodeCoords',
            size: 2,
            type: glw.FLOAT,
            normalized: false,
            stride: 2 * Float32Array.BYTES_PER_ELEMENT,
            offset: 0,
          },
        },
      },
    ]);

    // Allocate a dedicated DYNAMIC_DRAW VBO for the stencil write-pass quad.
    // This is a fixed 20-float (80-byte) buffer that is written once per
    // stencil region and never touches the main quad buffer.
    const stencilBuf = glw.createBuffer();
    const stencilStride = QUAD_VERTEX_STRIDE * Float32Array.BYTES_PER_ELEMENT;
    glw.arrayBufferData(stencilBuf, new Float32Array(20), glw.DYNAMIC_DRAW);
    this.stencilQuadBufferCollection = new BufferCollection([
      {
        buffer: stencilBuf!,
        attributes: {
          a_position: {
            name: 'a_position',
            size: 2,
            type: glw.FLOAT,
            normalized: false,
            stride: stencilStride,
            offset: 0,
          },
        },
      },
      {
        buffer: nodeCoordsBuffer!,
        attributes: {
          a_nodeCoords: {
            name: 'a_nodeCoords',
            size: 2,
            type: glw.FLOAT,
            normalized: false,
            stride: 2 * Float32Array.BYTES_PER_ELEMENT,
            offset: 0,
          },
        },
      },
    ]);

    // Shared SDF vertex buffers — one per GPU layout (plain 6f / rich 7f).
    // Each owns its GL buffer, attribute layout, and upload-skip state.
    this.sdfBufferPlain = new SdfBuffer(glw, 'plain');
    this.sdfBufferRich = new SdfBuffer(glw, 'rich');
  }

  reset() {
    const { glw } = this;
    this.curBufferIdx = 0;
    this.curRenderOp = null;
    this.dirtyQuadCount = 0;
    this.curSdfRenderOp = null;
    this.renderOps.length = 0;
    this.coreTextRenderOps.length = 0;
    this.sdfBufferPlain.clear();
    this.sdfBufferRich.clear();
    this.stencilOpPoolIdx = 0;
    this.stencilDepth = 0;
    glw.setScissorTest(false);
    glw.setStencilTest(false);
    if (this.stage.options.enableClear !== false) {
      glw.clear();
    }
  }

  createShaderProgram(
    shaderType: WebGlShaderType,
    props: Record<string, unknown>,
  ): WebGlShaderProgram {
    return new WebGlShaderProgram(this, shaderType, props);
  }

  createShaderNode(
    shaderKey: string,
    shaderType: WebGlShaderType,
    props?: Record<string, unknown>,
    program?: WebGlShaderProgram,
  ) {
    return new WebGlShaderNode(
      shaderKey,
      shaderType,
      program!,
      this.stage,
      props,
    );
  }

  override supportsShaderType(shaderType: Readonly<WebGlShaderType>): boolean {
    //if shadertype doesnt have a fragment source we cant use it
    return shaderType.fragment !== undefined;
  }

  createCtxTexture(textureSource: Texture): CoreContextTexture {
    if (textureSource instanceof SubTexture) {
      return new WebGlCtxSubTexture(
        this.glw,
        this.stage.txMemManager,
        textureSource,
      );
    } else if (textureSource instanceof RenderTexture) {
      return new WebGlCtxRenderTexture(
        this.glw,
        this.stage.txMemManager,
        textureSource,
      );
    }
    return new WebGlCtxTexture(
      this.glw,
      this.stage.txMemManager,
      textureSource,
    );
  }

  /**
   * This function adds a quad (a rectangle composed of two triangles) to the WebGL rendering pipeline.
   *
   * It takes a set of options that define the quad's properties, such as its dimensions, colors, texture, shader, and transformation matrix.
   * The function first updates the shader properties with the current dimensions if necessary, then sets the default texture if none is provided.
   * It then checks if a new render operation is needed, based on the current shader and clipping rectangle.
   * If a new render operation is needed, it creates one and updates the current render operation.
   * The function then adjusts the texture coordinates based on the texture options and adds the texture to the texture manager.
   *
   * Finally, it calculates the vertices for the quad, taking into account any transformations, and adds them to the quad buffer.
   * The function updates the length and number of quads in the current render operation, and updates the current buffer index.
   */
  addQuad(node: CoreNode) {
    const isRTT = this.renderToTextureActive === true;
    let f = this.fQuadBuffer;
    let u = this.uiQuadBuffer;
    if (isRTT === true) {
      if (this.fRttQuadBuffer === null) {
        this.rttQuadBuffer = new ArrayBuffer(this.stage.options.quadBufferSize);
        this.fRttQuadBuffer = new Float32Array(this.rttQuadBuffer);
        this.uiRttQuadBuffer = new Uint32Array(this.rttQuadBuffer);
      }
      f = this.fRttQuadBuffer;
      u = this.uiRttQuadBuffer!;
    }

    let tx = (node.props.texture || this.stage.defaultTexture) as Texture;
    if (tx.type === TextureType.subTexture) {
      tx = (tx as SubTexture).parentTexture;
    }

    const ctx = tx.ctxTexture as WebGlCtxTexture | undefined;
    if (ctx === undefined) return;

    // Main scene: assign a permanent slot so render() can surgically
    // re-upload only dirty nodes. RTT: use ephemeral sequential slots and
    // leave the node's main-scene slot bookkeeping untouched.
    let i = this.curBufferIdx;
    if (isRTT === false) {
      node.quadBufferIndex = i;
    }
    this.curBufferIdx = i + 20;

    const reuse = this.reuseRenderOp(node);
    if (reuse === false) {
      this.newRenderOp(node, i);
    }

    let tidx = (this.curRenderOp as WebGlNodeRenderOp).addTexture(ctx);

    if (tidx === 0xffffffff) {
      this.newRenderOp(node, i);
      tidx = (this.curRenderOp as WebGlNodeRenderOp).addTexture(ctx);
    }

    // Accumulate the main-scene dirty count during the pass so render() can
    // pick full vs surgical upload without a second walk over the render list.
    if (isRTT === false && node.isQuadDirty === true) {
      this.dirtyQuadCount++;
    }

    const rc = node.renderCoords!;
    const tc = node.textureCoords || this.defaultTextureCoords;

    const cTl = node.premultipliedColorTl;
    const cTr = node.premultipliedColorTr;
    const cBl = node.premultipliedColorBl;
    const cBr = node.premultipliedColorBr;

    // Upper-Left
    f[i] = rc.x1;
    f[i + 1] = rc.y1;
    f[i + 2] = tc.x1;
    f[i + 3] = tc.y1;
    u[i + 4] = cTl;

    // Upper-Right
    f[i + 5] = rc.x2;
    f[i + 6] = rc.y2;
    f[i + 7] = tc.x2;
    f[i + 8] = tc.y1;
    u[i + 9] = cTr;

    // Lower-Left
    f[i + 10] = rc.x4;
    f[i + 11] = rc.y4;
    f[i + 12] = tc.x1;
    f[i + 13] = tc.y2;
    u[i + 14] = cBl;

    // Lower-Right
    f[i + 15] = rc.x3;
    f[i + 16] = rc.y3;
    f[i + 17] = tc.x2;
    f[i + 18] = tc.y2;
    u[i + 19] = cBr;

    (this.curRenderOp as WebGlNodeRenderOp).numQuads++;
  }

  /**
   * Replace the existing RenderOp with a new one that uses the specified Shader
   * and starts at the specified buffer index.
   *
   * @param shader
   * @param bufferIdx
   */
  private newRenderOp(node: CoreNode, bufferIdx: number) {
    const curRenderOp = node;
    curRenderOp.renderOpBufferIdx = bufferIdx;
    curRenderOp.numQuads = 0;
    curRenderOp.renderOpTextures.length = 0;
    curRenderOp.stencilDepth = this.stencilDepth;

    this.curRenderOp = curRenderOp;
    this.renderOps.push(curRenderOp);
  }

  /**
   * Test if the current Render operation can be reused for the specified parameters.
   * @param params
   * @returns
   */
  reuseRenderOp(node: CoreNode): boolean {
    const curRenderOp = this.curRenderOp;
    if (curRenderOp === null) {
      return false;
    }
    if (curRenderOp instanceof StencilClipRenderOp) {
      return false;
    }

    // SDF render ops are managed by the SdfBuffer batching pipeline and never
    // merge with regular node render ops.
    if (curRenderOp instanceof SdfRenderOp) {
      return false;
    }

    // Nodes at different stencil depths must not be batched — the GPU stencil
    // test state differs between inside and outside a stencil clip region.
    if (curRenderOp.stencilDepth !== this.stencilDepth) {
      return false;
    }

    const shader = node.props.shader as WebGlShaderNode;
    const curShader = curRenderOp.shader as WebGlShaderNode;

    if (curShader?.shaderKey !== shader?.shaderKey) {
      return false;
    }

    // Switching clipping rect will require a new render operation
    if (compareRect(curRenderOp.clippingRect, node.clippingRect) === false) {
      return false;
    }

    // Force new render operation if rendering to texture is different
    const curRtt = curRenderOp.rtt;
    if (
      curRenderOp.parentHasRenderTexture !== node.parentHasRenderTexture ||
      curRtt !== (node.props.rtt === true)
    ) {
      return false;
    }

    if (
      node.parentHasRenderTexture === true &&
      node.parentFramebufferDimensions !== null
    ) {
      const curFbDims = curRenderOp.isCoreNode
        ? curRenderOp.parentFramebufferDimensions
        : curRenderOp.framebufferDimensions;
      if (
        curFbDims === null ||
        curFbDims.w !== node.parentFramebufferDimensions.w ||
        curFbDims.h !== node.parentFramebufferDimensions.h
      ) {
        return false;
      }
    }

    if (curShader?.shaderKey === 'default' && shader?.shaderKey === 'default') {
      return true;
    }

    // Check if the shader can batch the shader properties
    if (curShader?.program.reuseRenderOp(node, curRenderOp) === false) {
      return false;
    }

    return true;
  }

  /**
   * add RenderOp to the render pipeline
   */
  addRenderOp(renderable: WebGlRenderOp) {
    this.renderOps.push(renderable);
    this.curRenderOp = null;
  }

  /**
   * Append pre-transformed SDF glyph vertices to the given shared SDF buffer
   * and manage SDF render op batching.
   *
   * @remarks
   * This method pre-transforms glyph positions from design units to world
   * pixel space on the CPU, packs per-vertex color and distanceRange, and
   * writes them into the shared SDF buffer of the given layout. Compatible
   * consecutive calls (same layout, atlas, clipping, RTT state) are merged
   * into a single SdfRenderOp, resulting in one draw call for many text nodes.
   *
   * The design-unit glyph records are `SDF_PLAIN_GLYPH_STRIDE` (8) or
   * `SDF_RICH_GLYPH_STRIDE` (12) floats per glyph depending on the layout:
   *   plain: x, y, w, h, u, v, uw, vh
   *   rich:  x, y, w, h, u, v, uw, vh, shearTop, shearBot, packed_span_color, style
   * where packed_span_color is RGBA bytes written via a Uint32 view of the
   * same ArrayBuffer (bit-identical read via `uGlyphs` below), shearTop/shearBot
   * are the per-corner x-deltas of the italic lean, and the decorated quads use
   * `u = -1.0` as a solid-fill sentinel.
   */
  addSdfQuads(
    sdfBuffer: SdfBuffer,
    glyphs: Float32Array,
    glyphCount: number,
    fontScale: number,
    transform: Float32Array,
    color: number,
    worldAlpha: number,
    distanceRange: number,
    atlasTexture: WebGlCtxTexture,
    clippingRect: RectWithValid,
    width: number,
    height: number,
    parentHasRenderTexture: boolean,
    framebufferDimensions: Dimensions | null,
    sdfShader: WebGlShaderNode,
  ): void {
    if (glyphCount === 0) {
      return;
    }

    // Full recompute writes fresh bytes — the GPU copy is now stale.
    sdfBuffer.changed = true;

    const isRich = sdfBuffer.layout === 'rich';
    const floatsPerVertex = sdfBuffer.floatsPerVertex;
    const glyphStride = isRich ? SDF_RICH_GLYPH_STRIDE : SDF_PLAIN_GLYPH_STRIDE;

    let idx = sdfBuffer.idx;
    sdfBuffer.ensureCapacity(idx + glyphCount * floatsPerVertex * 4);

    const f = sdfBuffer.fBuffer;
    const u = sdfBuffer.uiBuffer;
    // Uint32 view over the glyph records to read packed span colors bit-exactly
    // (float reads would canonicalize NaN bit patterns and corrupt them).
    const uGlyphs = new Uint32Array(
      glyphs.buffer,
      glyphs.byteOffset,
      glyphs.length,
    );

    // Pre-compute the merged node color (with alpha) packed as RGBA bytes for
    // the UNSIGNED_BYTE normalized attribute.
    // NOTE: Do NOT premultiply RGB by alpha here — the SDF fragment shader
    // already multiplies v_color.rgb by the computed opacity (which includes
    // v_color.a).
    const mergedColor = mergeColorAlpha(color, worldAlpha);
    const r = mergedColor >>> 24;
    const g = (mergedColor >>> 16) & 0xff;
    const b = (mergedColor >>> 8) & 0xff;
    const a = mergedColor & 0xff;
    // Pack as RGBA bytes (byte0 = R … byte3 = A), read little-endian as
    // vec4(r,g,b,a) normalized.
    const packedNodeColor = (r | (g << 8) | (b << 16) | (a << 24)) >>> 0;

    // Transform matrix components (column-major 3x3)
    // Pre-multiply fontScale here to save 4 multiplications per glyph in the
    // hot loop — mirrors the old shader's `a_position * u_size` then
    // `u_transform *` computation.
    const m0 = transform[0]! * fontScale;
    const m1 = transform[1]! * fontScale;
    const m3 = transform[3]! * fontScale;
    const m4 = transform[4]! * fontScale;
    const m6 = transform[6]!;
    const m7 = transform[7]!;

    // Record start quad for this batch segment
    const startQuad = sdfBuffer.quadCount;

    // Read packed glyph fields directly from the Float32Array.
    let go = 0;
    for (let gi = 0; gi < glyphCount; gi++) {
      // Glyph corners in design units
      const gx1 = glyphs[go]!;
      const gy1 = glyphs[go + 1]!;
      const gx2 = gx1 + glyphs[go + 2]!;
      const gy2 = gy1 + glyphs[go + 3]!;

      // Atlas UVs
      const u1 = glyphs[go + 4]!;
      const v1 = glyphs[go + 5]!;
      const u2 = u1 + glyphs[go + 6]!;
      const v2 = v1 + glyphs[go + 7]!;

      // Per-glyph color (merged with node color + alpha) and style.
      let packedColor = packedNodeColor;
      let style = 0;
      // Italic lean: x-delta applied to the top / bottom vertex rows. A glyph
      // quad becomes a trapezoid with four distinct x corners when sheared.
      let shearTop = 0;
      let shearBot = 0;
      if (isRich) {
        shearTop = glyphs[go + 8]!;
        shearBot = glyphs[go + 9]!;
        packedColor = _mergeSdfSpanColor(packedNodeColor, uGlyphs[go + 10]!);
        style = glyphs[go + 11]!;
      }
      go += glyphStride;

      const sx1t = gx1 + shearTop;
      const sx2t = gx2 + shearTop;
      const sx1b = gx1 + shearBot;
      const sx2b = gx2 + shearBot;

      // Transform to world space
      // Note: we use gx/gy directly since m0,m1,m3,m4 are already pre-scaled
      // Top-left
      const wx_tl = m0 * sx1t + m3 * gy1 + m6;
      const wy_tl = m1 * sx1t + m4 * gy1 + m7;
      // Top-right
      const wx_tr = m0 * sx2t + m3 * gy1 + m6;
      const wy_tr = m1 * sx2t + m4 * gy1 + m7;
      // Bottom-left
      const wx_bl = m0 * sx1b + m3 * gy2 + m6;
      const wy_bl = m1 * sx1b + m4 * gy2 + m7;
      // Bottom-right
      const wx_br = m0 * sx2b + m3 * gy2 + m6;
      const wy_br = m1 * sx2b + m4 * gy2 + m7;

      // 4 vertices per glyph: TL, TR, BL, BR
      // Index buffer supplies the two-triangle winding: [0,1,2, 2,1,3]
      // TL
      f[idx] = wx_tl;
      f[idx + 1] = wy_tl;
      f[idx + 2] = u1;
      f[idx + 3] = v1;
      u[idx + 4] = packedColor;
      if (isRich) {
        f[idx + 5] = style;
        f[idx + 6] = distanceRange;
      } else {
        f[idx + 5] = distanceRange;
      }
      idx += floatsPerVertex;
      // TR
      f[idx] = wx_tr;
      f[idx + 1] = wy_tr;
      f[idx + 2] = u2;
      f[idx + 3] = v1;
      u[idx + 4] = packedColor;
      if (isRich) {
        f[idx + 5] = style;
        f[idx + 6] = distanceRange;
      } else {
        f[idx + 5] = distanceRange;
      }
      idx += floatsPerVertex;
      // BL
      f[idx] = wx_bl;
      f[idx + 1] = wy_bl;
      f[idx + 2] = u1;
      f[idx + 3] = v2;
      u[idx + 4] = packedColor;
      if (isRich) {
        f[idx + 5] = style;
        f[idx + 6] = distanceRange;
      } else {
        f[idx + 5] = distanceRange;
      }
      idx += floatsPerVertex;
      // BR
      f[idx] = wx_br;
      f[idx + 1] = wy_br;
      f[idx + 2] = u2;
      f[idx + 3] = v2;
      u[idx + 4] = packedColor;
      if (isRich) {
        f[idx + 5] = style;
        f[idx + 6] = distanceRange;
      } else {
        f[idx + 5] = distanceRange;
      }
      idx += floatsPerVertex;
    }

    sdfBuffer.idx = idx;
    sdfBuffer.quadCount += glyphCount;

    this.finalizeSdfBatch(
      sdfBuffer,
      startQuad,
      glyphCount,
      atlasTexture,
      clippingRect,
      worldAlpha,
      width,
      height,
      parentHasRenderTexture,
      framebufferDimensions,
      sdfShader,
    );
  }

  /**
   * Fast path: copy pre-computed cached SDF vertex data into the shared
   * buffer and create/extend an SdfRenderOp.
   *
   * @remarks
   * When a text node hasn't changed (same layout, transform, color, alpha),
   * the per-glyph matrix multiplication is skipped entirely. The cached
   * Float32Array is written via a single `Float32Array.set()` (memcpy), which
   * is orders of magnitude faster than the per-glyph computation path.
   *
   * The cached data is already in the target SdfBuffer's GPU layout, so the
   * mem-copy must stay a typed-array `set` (bit-exact): packed RGBA colors
   * live in the same Float32Array and some bit patterns are float32 NaNs,
   * which element-wise float reads/writes may canonicalize and corrupt.
   *
   * Exact cache hits write byte-identical data at identical offsets, so this
   * path deliberately does NOT set `sdfBuffer.changed`.
   */
  addSdfCachedQuads(
    sdfBuffer: SdfBuffer,
    cachedVertices: Float32Array,
    numGlyphs: number,
    atlasTexture: WebGlCtxTexture,
    clippingRect: RectWithValid,
    worldAlpha: number,
    width: number,
    height: number,
    parentHasRenderTexture: boolean,
    framebufferDimensions: Dimensions | null,
    sdfShader: WebGlShaderNode,
  ): void {
    if (numGlyphs === 0) {
      return;
    }

    const startQuad = sdfBuffer.quadCount;

    sdfBuffer.ensureCapacity(sdfBuffer.idx + cachedVertices.length);

    // Single memcpy — much faster than per-glyph matrix math
    sdfBuffer.fBuffer.set(cachedVertices, sdfBuffer.idx);
    sdfBuffer.idx += cachedVertices.length;
    sdfBuffer.quadCount += numGlyphs;

    this.finalizeSdfBatch(
      sdfBuffer,
      startQuad,
      numGlyphs,
      atlasTexture,
      clippingRect,
      worldAlpha,
      width,
      height,
      parentHasRenderTexture,
      framebufferDimensions,
      sdfShader,
    );
  }

  /**
   * Append cached SDF vertices translated by (dx, dy) to the shared buffer.
   *
   * @remarks
   * The scroll fast path: a text node whose transform changed by pure
   * translation reuses its world-space vertex cache — one mem-copy plus two
   * adds per vertex instead of full per-glyph matrix math, and the cache
   * keeps its original base so nothing is re-snapshotted per frame.
   *
   * The copy MUST stay a typed-array `set` (bit-exact memcpy): packed RGBA
   * colors live in the same Float32Array and some bit patterns are float32
   * NaNs, which element-wise float reads/writes may canonicalize and corrupt.
   * Only the two position floats of each vertex are touched after the copy.
   */
  addSdfTranslatedQuads(
    sdfBuffer: SdfBuffer,
    cachedVertices: Float32Array,
    numGlyphs: number,
    dx: number,
    dy: number,
    atlasTexture: WebGlCtxTexture,
    clippingRect: RectWithValid,
    worldAlpha: number,
    width: number,
    height: number,
    parentHasRenderTexture: boolean,
    framebufferDimensions: Dimensions | null,
    sdfShader: WebGlShaderNode,
  ): void {
    if (numGlyphs === 0) {
      return;
    }

    // Translated positions are fresh bytes — the GPU copy is now stale.
    sdfBuffer.changed = true;

    const startQuad = sdfBuffer.quadCount;
    const idx = sdfBuffer.idx;

    sdfBuffer.ensureCapacity(idx + cachedVertices.length);

    // Read the buffer reference only after ensureCapacity — growth swaps the
    // backing store.
    const f = sdfBuffer.fBuffer;
    f.set(cachedVertices, idx);

    const end = idx + cachedVertices.length;
    const floatsPerVertex = sdfBuffer.floatsPerVertex;
    for (let i = idx; i < end; i += floatsPerVertex) {
      f[i] = f[i]! + dx;
      f[i + 1] = f[i + 1]! + dy;
    }

    sdfBuffer.idx = end;
    sdfBuffer.quadCount += numGlyphs;

    this.finalizeSdfBatch(
      sdfBuffer,
      startQuad,
      numGlyphs,
      atlasTexture,
      clippingRect,
      worldAlpha,
      width,
      height,
      parentHasRenderTexture,
      framebufferDimensions,
      sdfShader,
    );
  }

  /**
   * Shared batching logic for SDF render ops.
   * Called by all `addSdf*` write paths.
   */
  private finalizeSdfBatch(
    sdfBuffer: SdfBuffer,
    startQuad: number,
    glyphCount: number,
    atlasTexture: WebGlCtxTexture,
    clippingRect: RectWithValid,
    worldAlpha: number,
    width: number,
    height: number,
    parentHasRenderTexture: boolean,
    framebufferDimensions: Dimensions | null,
    sdfShader: WebGlShaderNode,
  ): void {
    // --- Batching: try to extend the current SDF render op ---------------
    const cur = this.curSdfRenderOp;
    let canBatch = false;

    if (cur !== null) {
      // Same SdfBuffer (layout)?
      if (cur.sdfBuffer === sdfBuffer) {
        // Same atlas texture?
        if (
          cur.renderOpTextures.length === 1 &&
          cur.renderOpTextures[0] === atlasTexture
        ) {
          // Same clipping rect?
          if (compareRect(cur.clippingRect, clippingRect)) {
            // Same RTT state?
            if (
              cur.parentHasRenderTexture === parentHasRenderTexture &&
              cur.rtt === false
            ) {
              canBatch = true;
            }
          }
        }
      }
    }

    if (canBatch && cur !== null) {
      // Extend existing op
      cur.numQuads += glyphCount;
    } else {
      // Create a new SdfRenderOp referencing the shared buffer
      const op = new SdfRenderOp(
        this,
        sdfShader,
        sdfBuffer,
        worldAlpha,
        clippingRect,
        width,
        height,
        false,
        parentHasRenderTexture,
        framebufferDimensions,
      );
      op.startQuad = startQuad;
      op.numQuads = glyphCount;
      op.addTexture(atlasTexture);

      this.coreTextRenderOps.push(op);
      this.curSdfRenderOp = op;

      // Break the regular quad render op chain so subsequent image/rect
      // nodes don't try to extend an SDF op.
      this.curRenderOp = null;
    }
  }

  /**
   * Append all deferred SDF text render ops to `renderOps`.
   *
   * Called at the start of each render pass (main and RTT) so all text in a
   * frame draws in a single contiguous run of draw calls. Also clears the
   * merge anchors so a stale op can never swallow a draw from another pass.
   */
  flushTextRenderOps() {
    const len = this.coreTextRenderOps.length;
    if (len === 0) {
      return;
    }
    for (let i = 0; i < len; i++) {
      this.renderOps.push(this.coreTextRenderOps[i]!);
    }
    this.coreTextRenderOps.length = 0;
    this.curRenderOp = null;
    this.curSdfRenderOp = null;
  }

  /**
   * Upload the shared SDF buffers for the main pass, skipping the driver-side
   * `bufferData` copy per layout when its bytes provably match what the GPU
   * already holds: every write this frame was an exact cache-hit mem-copy
   * (`changed` false) and the total size matches the previous upload.
   *
   * The skip is only sound because a cache hit that is NOT byte-identical to
   * the current GPU contents always raises `changed`:
   * - cache-miss recompute (`addSdfQuads`) and translated copies
   *   (`addSdfTranslatedQuads`) write fresh bytes;
   * - `renderQuads` marks the buffer dirty when a static cache hit would land
   *   at a shifted offset (a render-list reorder moves the node's quad range)
   *   or when the last write at that range was a translated copy;
   * - backing-store growth swaps the ArrayBuffer, and RTT partial uploads
   *   have their own dirty path.
   */
  private uploadSdfBuffer(): void {
    this.uploadSdfBufferLayout(this.sdfBufferPlain);
    this.uploadSdfBufferLayout(this.sdfBufferRich);
  }

  private uploadSdfBufferLayout(sdfBuffer: SdfBuffer): void {
    if (sdfBuffer.idx === 0) {
      return;
    }
    if (
      sdfBuffer.changed === false &&
      sdfBuffer.idx === sdfBuffer.lastUploadedSize
    ) {
      return;
    }
    const glw = this.glw;
    const sdfBuf =
      sdfBuffer.quadBufferCollection.getBuffer('a_position') || null;
    const sdfArr = new Float32Array(sdfBuffer.buffer, 0, sdfBuffer.idx);
    glw.arrayBufferData(sdfBuf, sdfArr, glw.DYNAMIC_DRAW);
    sdfBuffer.lastUploadedSize = sdfBuffer.idx;
    sdfBuffer.changed = false;
  }

  /**
   * Render the current set of RenderOps to render to the specified surface.
   *
   * TODO: 'screen' is the only supported surface at the moment.
   *
   * @param surface
   */
  render(_surface: 'screen' | CoreContextTexture = 'screen'): void {
    const { glw, quadBuffer } = this;

    // Append deferred SDF text ops so all text draws in one contiguous run.
    this.flushTextRenderOps();

    const buffer = this.quadBufferCollection.getBuffer('a_position') || null;
    const BYTES = Float32Array.BYTES_PER_ELEMENT;

    // Structural realloc (needsFullUpload) or buffer growth past the last
    // uploaded size always forces a full upload.
    let fullUpload =
      this.needsFullUpload || this.curBufferIdx > this.lastUploadedBufferSize;

    // Otherwise decide adaptively: if more than 40% of the render list would
    // need a surgical upload, a single bulk bufferData is cheaper than that
    // many bufferSubData calls. The count was accumulated for free during the
    // addQuad pass, so no separate counting loop is needed here.
    if (fullUpload === false) {
      fullUpload =
        this.dirtyQuadCount >
        this.stage.renderListLen * FULL_UPLOAD_DIRTY_RATIO;
    }

    const nodes = this.stage.renderListNodes;

    if (fullUpload === true) {
      const arr = new Float32Array(quadBuffer, 0, this.curBufferIdx);
      glw.arrayBufferData(buffer, arr, glw.DYNAMIC_DRAW);
      this.needsFullUpload = false;
      this.lastUploadedBufferSize = this.curBufferIdx;

      // Everything is on the GPU now; clear the dirty flags.
      for (let i = 0; i < this.stage.renderListLen; i++) {
        nodes[i]!.isQuadDirty = false;
      }
    } else {
      // Surgical: copy each dirty slot into the preallocated scratch buffer
      // and upload only those 20 floats. No per-node allocation.
      const scratch = this._quadScratchF;
      const f = this.fQuadBuffer;
      for (let i = 0; i < this.stage.renderListLen; i++) {
        const node = nodes[i]!;
        if (node.isQuadDirty === true && node.quadBufferIndex !== -1) {
          const slot = node.quadBufferIndex;
          for (let j = 0; j < 20; j++) {
            scratch[j] = f[slot + j]!;
          }
          glw.arrayBufferSubData(buffer, slot * BYTES, scratch);
          node.isQuadDirty = false;
        }
      }
    }

    // Upload the shared SDF buffers (each layout skips the driver copy when
    // its bytes provably match what the GPU already holds).
    this.uploadSdfBuffer();

    for (let i = 0, length = this.renderOps.length; i < length; i++) {
      const op = this.renderOps[i]!;
      if (op instanceof StencilClipRenderOp) {
        if (op.kind === 0) {
          this.drawStencilBegin(op);
        } else {
          this.drawStencilEnd(op);
        }
      } else {
        op.draw(this);
      }
    }

    this.quadBufferUsage = this.curBufferIdx * BYTES;

    // Calculate the size of each quad in bytes (4 vertices per quad) times the size of each vertex in bytes
    const QUAD_SIZE_IN_BYTES = 4 * (QUAD_VERTEX_STRIDE * BYTES);
    this.numQuadsRendered = this.quadBufferUsage / QUAD_SIZE_IN_BYTES;
  }

  getQuadCount(): number {
    return this.numQuadsRendered;
  }

  renderToTexture(node: CoreNode) {
    for (let i = 0; i < this.rttNodes.length; i++) {
      if (this.rttNodes[i] === node) {
        return;
      }
    }

    this.insertRTTNodeInOrder(node);
  }

  /**
   * Inserts an RTT node into `this.rttNodes` while maintaining the correct rendering order based on hierarchy.
   *
   * Rendering order for RTT nodes is critical when nested RTT nodes exist in a parent-child relationship.
   * Specifically:
   *  - Child RTT nodes must be rendered before their RTT-enabled parents to ensure proper texture composition.
   *  - If an RTT node is added and it has existing RTT children, it should be rendered after those children.
   *
   * This function addresses both cases by:
   * 1. **Checking Upwards**: It traverses the node's hierarchy upwards to identify any RTT parent
   *    already in `rttNodes`. If an RTT parent is found, the new node is placed before this parent.
   * 2. **Checking Downwards**: It traverses the node’s children recursively to find any RTT-enabled
   *    children that are already in `rttNodes`. If such children are found, the new node is inserted
   *    after the last (highest index) RTT child node.
   *
   * The final calculated insertion index ensures the new node is positioned in `rttNodes` to respect
   * both parent-before-child and child-before-parent rendering rules, preserving the correct order
   * for the WebGL renderer.
   *
   * @param node - The RTT-enabled CoreNode to be added to `rttNodes` in the appropriate hierarchical position.
   */
  private insertRTTNodeInOrder(node: CoreNode) {
    let insertIndex = this.rttNodes.length; // Default to the end of the array

    // Build a one-shot index map so all lookups below are O(1) instead of O(n).
    const rttNodes = this.rttNodes;
    const indexMap = new Map<number, number>();
    for (let i = 0; i < rttNodes.length; i++) {
      indexMap.set(rttNodes[i]!.id, i);
    }

    // 1. Traverse upwards to ensure the node is placed before its RTT parent (if any).
    let currentNode: CoreNode = node;
    while (currentNode.parent !== null) {
      const parentIndex = indexMap.get(currentNode.parent.id);
      if (parentIndex !== undefined) {
        insertIndex = parentIndex;
        break;
      }
      currentNode = currentNode.parent;
    }

    // 2. Traverse downwards to ensure the node is placed after any RTT children.
    const maxChildIndex = this.findMaxChildRTTIndex(node, indexMap);
    if (maxChildIndex !== -1) {
      insertIndex = Math.max(insertIndex, maxChildIndex + 1);
    }

    // 3. Insert the node at the calculated position
    this.rttNodes.splice(insertIndex, 0, node);
  }

  // Iterative DFS to find the highest rttNodes index among all RTT descendants of node.
  private findMaxChildRTTIndex(
    node: CoreNode,
    indexMap: Map<number, number>,
  ): number {
    let maxIndex = -1;
    // Explicit stack avoids recursive arrow function allocation and call-stack growth.
    const stack: CoreNode[] = [node];
    while (stack.length !== 0) {
      const current = stack.pop()!;
      const idx = indexMap.get(current.id);
      if (idx !== undefined && idx > maxIndex) {
        maxIndex = idx;
      }
      const children = current.children;
      for (let i = 0; i < children.length; i++) {
        stack.push(children[i]!);
      }
    }
    return maxIndex;
  }

  renderRTTNodes() {
    const { glw } = this;

    // Save main-scene buffer index so RTT rendering doesn't interfere with
    // the dirty quad buffer optimization.
    const savedBufferIdx = this.curBufferIdx;

    // Render all associated RTT nodes to their textures
    for (let i = 0; i < this.rttNodes.length; i++) {
      const node = this.rttNodes[i];

      // Skip nodes that don't have RTT updates
      if (node === undefined || node.hasRTTupdates === false) {
        continue;
      }

      // Skip nodes that are not visible
      if (
        node.worldAlpha === 0 ||
        node.renderState === CoreNodeRenderState.OutOfBounds
      ) {
        continue;
      }

      // Skip nodes that do not have a loaded texture
      if (node.texture === null || node.texture.state !== 'loaded') {
        continue;
      }

      // Set the active RTT node to the current node
      // So we can prevent rendering children of nested RTT nodes
      this.activeRttNode = node;
      const ctxTexture = node.texture.ctxTexture as WebGlCtxRenderTexture;
      this.renderToTextureActive = true;

      // Bind the the texture's framebuffer
      glw.bindFramebuffer(ctxTexture.framebuffer);

      glw.viewport(0, 0, ctxTexture.w, ctxTexture.h);
      // Set the clear color to transparent
      glw.clearColor(0, 0, 0, 0);
      glw.clear();

      // RTT uses its own sequential buffer from index 0, keeping the main
      // scene's permanent slot assignments untouched.
      this.curBufferIdx = 0;
      this.curRenderOp = null;

      // Render all associated quads to the texture
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];

        if (child === undefined) {
          continue;
        }

        this.stage.addSubtreeQuads(child);
        child.hasRTTupdates = false;
      }

      // Render all associated quads to the texture
      this.renderRTT();

      // Force a re-upload on the next pass: the main pass appends to these
      // same shared buffers, and an exact cache-hit fill could otherwise
      // pass the upload-skip test while the GPU still holds RTT-only bytes.
      this.sdfBufferPlain.changed = true;
      this.sdfBufferRich.changed = true;

      // Reset render operations
      this.renderOps.length = 0;
      node.hasRTTupdates = false;
    }

    // Restore the main-scene buffer index. The RTT pass replaced the GPU
    // buffer with a smaller RTT-sized buffer, so the main pass must re-upload
    // everything rather than only dirty slots.
    this.curBufferIdx = savedBufferIdx;
    this.curRenderOp = null;
    this.needsFullUpload = true;
    this.lastUploadedBufferSize = 0;

    const clearColor = this.clearColor.normalized;
    // Restore the default clear color
    glw.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);

    // Bind the default framebuffer
    glw.bindFramebuffer(null);

    glw.viewport(0, 0, this.glw.canvas.width, this.glw.canvas.height);
    this.renderToTextureActive = false;
  }

  // Render pass for RTT: always does a full buffer upload from the dedicated
  // RTT buffer, since RTT quads use temporary sequential slots that are
  // rebuilt from scratch for each RTT pass.
  private renderRTT(): void {
    const glw = this.glw;
    const buffer = this.quadBufferCollection.getBuffer('a_position') || null;

    // Append deferred SDF text ops so text inside the RTT subtree draws in a
    // single contiguous run (same as the main pass).
    this.flushTextRenderOps();

    const arr = new Float32Array(this.rttQuadBuffer!, 0, this.curBufferIdx);
    glw.arrayBufferData(buffer, arr, glw.STATIC_DRAW);

    // Upload the shared SDF buffers for the RTT pass.
    this.uploadSdfBuffer();

    for (let i = 0, length = this.renderOps.length; i < length; i++) {
      const op = this.renderOps[i]!;
      if (op instanceof StencilClipRenderOp) {
        if (op.kind === 0) {
          this.drawStencilBegin(op);
        } else {
          this.drawStencilEnd(op);
        }
      } else {
        op.draw(this);
      }
    }
  }

  updateViewport(): void {
    this.glw.viewport(0, 0, this.glw.canvas.width, this.glw.canvas.height);
  }

  removeRTTNode(node: CoreNode) {
    const index = this.rttNodes.indexOf(node);
    if (index === -1) {
      return;
    }
    this.rttNodes.splice(index, 1);
  }

  // Resets all per-node quad buffer slot assignments and schedules a full GPU
  // buffer re-upload on the next render call. Called by
  // Stage.requestRenderListUpdate() whenever the render list changes
  // structurally (node added, removed, or reordered). After this call, the
  // next addQuad() pass reassigns compact, contiguous slots starting from 0.
  override invalidateQuadBuffer(): void {
    const nodes = this.stage.renderListNodes;
    for (let i = 0; i < this.stage.renderListLen; i++) {
      const node = nodes[i]!;
      node.quadBufferIndex = -1;
      node.isQuadDirty = true;
    }
    this.curBufferIdx = 0;
    this.lastUploadedBufferSize = 0;
    this.needsFullUpload = true;
  }

  getBufferInfo(): BufferInfo | null {
    const bufferInfo: BufferInfo = {
      totalAvailable: this.stage.options.quadBufferSize,
      totalUsed: this.quadBufferUsage,
    };
    return bufferInfo;
  }

  getDefaultShaderNode(): WebGlShaderNode {
    if (this.defaultShaderNode !== null) {
      return this.defaultShaderNode as WebGlShaderNode;
    }
    this.stage.shManager.registerShaderType('default', Default);
    this.defaultShaderNode = this.stage.shManager.createShader(
      'default',
    ) as WebGlShaderNode;
    return this.defaultShaderNode;
  }

  override getTextureCoords(node: CoreNode): TextureCoords | undefined {
    const texture = node.texture;
    if (texture === null) {
      return undefined;
    }

    //this stuff needs to be properly moved to CtxSubTexture at some point in the future.
    const ctxTexture =
      (texture as SubTexture).parentTexture !== undefined
        ? (texture as SubTexture).parentTexture.ctxTexture
        : texture.ctxTexture;
    if (ctxTexture === undefined) {
      return undefined;
    }

    const textureOptions = node.props.textureOptions;

    //early exit for textures with no options unless its a subtexture
    if (
      texture.type !== TextureType.subTexture &&
      textureOptions === undefined
    ) {
      return (ctxTexture as WebGlCtxTexture).txCoords;
    }

    let { x1, x2, y1, y2 } = (ctxTexture as WebGlCtxTexture).txCoords;
    if (texture.type === TextureType.subTexture) {
      const { w: parentW, h: parentH } = (texture as SubTexture).parentTexture
        .dimensions!;
      const { x, y, w, h } = (texture as SubTexture).props;
      x1 = x / parentW;
      y1 = y / parentH;
      x2 = x1 + w / parentW;
      y2 = y1 + h / parentH;
    }

    const resizeMode = textureOptions.resizeMode;
    if (
      resizeMode !== undefined &&
      resizeMode.type === 'cover' &&
      texture.dimensions !== null
    ) {
      const dimensions = texture.dimensions as Dimensions;
      const w = node.props.w;
      const h = node.props.h;
      const scaleX = w / dimensions.w;
      const scaleY = h / dimensions.h;
      const scale = Math.max(scaleX, scaleY);
      const precision = 1 / scale;

      // Determine based on width
      if (scaleX < scale) {
        const desiredSize = precision * node.props.w;
        x1 = (1 - desiredSize / dimensions.w) * (resizeMode.clipX ?? 0.5);
        x2 = x1 + desiredSize / dimensions.w;
      }
      // Determine based on height
      if (scaleY < scale) {
        const desiredSize = precision * node.props.h;
        y1 = (1 - desiredSize / dimensions.h) * (resizeMode.clipY ?? 0.5);
        y2 = y1 + desiredSize / dimensions.h;
      }
    }

    if (textureOptions.flipX === true) {
      [x1, x2] = [x2, x1];
    }
    if (textureOptions.flipY === true) {
      [y1, y2] = [y2, y1];
    }
    return {
      x1,
      y1,
      x2,
      y2,
    };
  }

  /**
   * Sets the glClearColor to the specified color.   *
   * @param color - The color to set as the clear color, represented as a 32-bit integer.
   */
  updateClearColor(color: number) {
    if (this.clearColor.raw === color) {
      return;
    }
    const glw = this.glw;
    const normalizedColor = getNormalizedRgbaComponents(color);
    glw.clearColor(
      normalizedColor[0],
      normalizedColor[1],
      normalizedColor[2],
      normalizedColor[3],
    );
    this.clearColor = {
      raw: color,
      normalized: normalizedColor,
    };
  }

  /**
   * Lazily compiles the StencilClip shader program (once per renderer lifetime).
   */
  private getStencilClipProgram(): WebGlShaderProgram {
    if (this.stencilClipProgram !== null) {
      return this.stencilClipProgram;
    }
    this.stencilClipProgram = new WebGlShaderProgram(this, StencilClip, {});
    return this.stencilClipProgram;
  }

  /**
   * Returns a pre-allocated StencilClipRenderOp from the pool, growing the pool
   * if necessary. Pool objects are never GC'd between frames.
   */
  private allocStencilOp(): StencilClipRenderOp {
    const pool = this.stencilOpPool;
    const idx = this.stencilOpPoolIdx;
    if (idx >= pool.length) {
      pool.push(new StencilClipRenderOp());
    }
    this.stencilOpPoolIdx = idx + 1;
    return pool[idx]!;
  }

  /**
   * Inserts a "begin rounded clip" sentinel into renderOps for the given node.
   * Called by Stage.addQuads before processing a rounded-clip node's children.
   */
  override beginRoundedClip(node: CoreNode) {
    const cr = node.clippingRect;
    const pixelRatio = node.parentHasRenderTexture ? 1 : this.stage.pixelRatio;
    const canvas = this.stage.platform!.canvas!;

    this.stencilDepth++;
    const op = this.allocStencilOp();
    op.kind = 0;
    op.x = Math.round(cr.x * pixelRatio);
    op.w = Math.round(cr.w * pixelRatio);
    op.h = Math.round(cr.h * pixelRatio);
    op.y = Math.round(canvas.height - op.h - cr.y * pixelRatio);
    op.clipRadius = cr.clipRadius * pixelRatio;
    op.pixelRatio = pixelRatio;
    op.canvasHeight = canvas.height;
    op.parentHasRenderTexture = node.parentHasRenderTexture;
    op.parentFramebufferH =
      node.parentHasRenderTexture && node.parentFramebufferDimensions !== null
        ? node.parentFramebufferDimensions.h
        : 0;
    op.stencilRef = this.stencilDepth;

    // Break current render-op batch so the stencil sentinel lands at the right position
    this.curRenderOp = null;
    this.renderOps.push(op);
  }

  /**
   * Inserts an "end rounded clip" sentinel into renderOps for the given node.
   * Called by Stage.addSubtreeQuads after processing a rounded-clip node's children.
   */
  override endRoundedClip(_node: CoreNode) {
    const op = this.allocStencilOp();
    op.kind = 1;
    op.stencilRef = this.stencilDepth;
    this.stencilDepth--;
    // Do NOT null curRenderOp here — stencil state is restored to the pre-region
    // state by drawStencilEnd, so nodes after this sentinel can batch normally.
    this.renderOps.push(op);
  }

  /**
   * Executes the stencil write pass for a begin-rounded-clip sentinel.
   * Sets stencil test so subsequent draws are masked to the rounded region.
   */
  private drawStencilBegin(op: StencilClipRenderOp) {
    const glw = this.glw;
    const program = this.getStencilClipProgram();

    // Activate the stencil shader directly — bypassing shManager's detach/attach
    // cycle so we don't disable the scene shader's vertex attrib arrays.  After
    // the pass we null shManager.attachedShader so the next CoreNode.draw() does
    // a proper attach() at cost of exactly one gl.useProgram (the same as before).
    program.bindForStencil(this.stencilQuadBufferCollection!);

    // Set uniforms
    if (op.parentHasRenderTexture === true && op.parentFramebufferH !== 0) {
      glw.uniform1f('u_pixelRatio', 1.0);
      glw.uniform2f('u_resolution', op.w, op.parentFramebufferH);
    } else {
      glw.uniform1f('u_pixelRatio', op.pixelRatio);
      glw.uniform2f('u_resolution', glw.canvas.width, glw.canvas.height);
    }
    glw.uniform2f('u_dimensions', op.w / op.pixelRatio, op.h / op.pixelRatio);
    glw.uniform1f('u_radius', op.clipRadius / op.pixelRatio);

    // Scissor: coarse bounds for the stencil write region
    glw.setScissorTest(true);
    glw.scissor(op.x, op.y, op.w, op.h);

    // Stencil write pass: draw rounded rect shape, write stencilRef to stencil buffer
    glw.setStencilTest(true);
    glw.stencilMask(0xff);
    glw.stencilFunc(glw.ALWAYS, op.stencilRef, 0xff);
    glw.stencilOp(glw.KEEP, glw.KEEP, glw.REPLACE);
    // Disable color writes during stencil pass
    glw.colorMask(false, false, false, false);

    // Build the stencil quad in the scratch buffer and upload to the dedicated
    // stencil VBO.  The main quad buffer is never touched.
    const f = this._stencilScratchF;
    const u = this._stencilScratchU;
    const x1 = op.x / op.pixelRatio;
    const y1 =
      op.canvasHeight / op.pixelRatio -
      op.y / op.pixelRatio -
      op.h / op.pixelRatio;
    const x2 = x1 + op.w / op.pixelRatio;
    const y2 = y1 + op.h / op.pixelRatio;
    const white = 0xffffffff;
    // Upper-Left
    f[0] = x1;
    f[1] = y1;
    f[2] = 0;
    f[3] = 0;
    u[4] = white;
    // Upper-Right
    f[5] = x2;
    f[6] = y1;
    f[7] = 1;
    f[8] = 0;
    u[9] = white;
    // Lower-Left
    f[10] = x1;
    f[11] = y2;
    f[12] = 0;
    f[13] = 1;
    u[14] = white;
    // Lower-Right
    f[15] = x2;
    f[16] = y2;
    f[17] = 1;
    f[18] = 1;
    u[19] = white;

    const stencilBuf =
      this.stencilQuadBufferCollection!.getBuffer('a_position') || null;
    glw.arrayBufferData(stencilBuf, this._stencilScratchF, glw.DYNAMIC_DRAW);

    glw.drawElements(glw.TRIANGLES, 6, glw.UNSIGNED_SHORT, 0);

    // Restore color writes
    glw.colorMask(true, true, true, true);
    // Set stencil to EQUAL so only pixels inside the rounded shape pass
    glw.stencilMask(0x00);
    glw.stencilFunc(glw.EQUAL, op.stencilRef, 0xff);
    glw.stencilOp(glw.KEEP, glw.KEEP, glw.KEEP);

    // Invalidate shManager so the next CoreNode.draw() triggers a full attach()
    // on the scene shader (one gl.useProgram) — this re-binds the main VBO.
    this.stage.shManager.releaseShader();
  }

  /**
   * Tears down the stencil state after the rounded-clip subtree has been drawn.
   */
  private drawStencilEnd(op: StencilClipRenderOp) {
    const glw = this.glw;
    if (op.stencilRef <= 1) {
      // Top-level stencil region: disable stencil test entirely
      glw.setStencilTest(false);
      glw.stencilMask(0xff);
    } else {
      // Nested stencil: restore to outer stencil ref level
      glw.stencilMask(0xff);
      glw.stencilFunc(glw.EQUAL, op.stencilRef - 1, 0xff);
      glw.stencilOp(glw.KEEP, glw.KEEP, glw.KEEP);
      glw.stencilMask(0x00);
    }
  }

  override destroy(): void {
    const loseCtx = this.glw.getExtension(
      'WEBGL_lose_context',
    ) as WEBGL_lose_context | null;
    loseCtx?.loseContext();
  }

  override deleteBuffer(buffer: WebGLBuffer): void {
    this.glw.deleteBuffer(buffer);
  }
}
