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

import { createWebGLContext } from '../../../utils.js';
import {
  CoreRenderer,
  type BufferInfo,
  type CoreRendererOptions,
  type QuadOptions,
} from '../CoreRenderer.js';
import { WebGlRenderOp } from './WebGlRenderOp.js';
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
import { BufferCollection } from './internal/BufferCollection.js';
import { compareRect, getNormalizedRgbaComponents } from '../../lib/utils.js';
import { WebGlShaderProgram } from './WebGlShaderProgram.js';
import { WebGlContextWrapper } from '../../lib/WebGlContextWrapper.js';
import { RenderTexture } from '../../textures/RenderTexture.js';
import { CoreNodeRenderState, type CoreNode } from '../../CoreNode.js';
import { WebGlCtxRenderTexture } from './WebGlCtxRenderTexture.js';
import { Default } from '../../shaders/webgl/Default.js';
import type { WebGlShaderType } from './WebGlShaderNode.js';
import { WebGlShaderNode } from './WebGlShaderNode.js';
import type { Dimensions } from '../../../common/CommonTypes.js';

export type WebGlRendererOptions = CoreRendererOptions;

interface CoreWebGlSystem {
  parameters: CoreWebGlParameters;
  extensions: CoreWebGlExtensions;
}

export class WebGlRenderer extends CoreRenderer {
  //// WebGL Native Context and Data
  glw: WebGlContextWrapper;
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

  override defaultTextureCoords: TextureCoords = {
    x1: 0,
    y1: 0,
    x2: 1,
    y2: 1,
  };

  //// Default Shader
  defaultShaderNode: WebGlShaderNode | null = null;
  quadBufferCollection: BufferCollection;

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

  constructor(options: WebGlRendererOptions) {
    super(options);

    this.quadBuffer = new ArrayBuffer(this.stage.options.quadBufferSize);
    this.fQuadBuffer = new Float32Array(this.quadBuffer);
    this.uiQuadBuffer = new Uint32Array(this.quadBuffer);

    this.mode = 'webgl';

    const gl = createWebGLContext(
      options.canvas,
      options.forceWebGL2,
      options.contextSpy,
    );
    const glw = (this.glw = new WebGlContextWrapper(gl));
    glw.viewport(0, 0, options.canvas.width, options.canvas.height);

    this.updateClearColor(this.stage.clearColor);

    glw.setBlend(true);
    glw.blendFunc(glw.ONE, glw.ONE_MINUS_SRC_ALPHA);

    createIndexBuffer(glw, this.stage.bufferMemory);

    this.system = {
      parameters: getWebGlParameters(this.glw),
      extensions: getWebGlExtensions(this.glw),
    };
    const quadBuffer = glw.createBuffer();
    const stride = 8 * Float32Array.BYTES_PER_ELEMENT;
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
          a_textureIndex: {
            name: 'a_textureIndex',
            size: 1,
            type: glw.FLOAT,
            normalized: false,
            stride,
            offset: 5 * Float32Array.BYTES_PER_ELEMENT,
          },
          a_nodeCoords: {
            name: 'a_nodeCoords',
            size: 2,
            type: glw.FLOAT,
            normalized: false,
            stride,
            offset: 6 * Float32Array.BYTES_PER_ELEMENT,
          },
        },
      },
    ]);
  }

  reset() {
    const { glw } = this;
    this.curBufferIdx = 0;
    this.curRenderOp = null;
    this.renderOps.length = 0;
    glw.setScissorTest(false);
    glw.clear();
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
  addQuad(params: QuadOptions) {
    const f = this.fQuadBuffer;
    const u = this.uiQuadBuffer;
    let i = this.curBufferIdx;

    let ro = this.curRenderOp!;
    const reuse = this.reuseRenderOp(params) === false;
    if (reuse) {
      this.newRenderOp(params, i);
      ro = this.curRenderOp!;
    }

    let tx = params.texture!;
    if (tx.type === TextureType.subTexture) {
      tx = (tx as SubTexture).parentTexture;
    }

    const tidx = this.addTexture(tx.ctxTexture as WebGlCtxTexture, i);

    const rc = params.renderCoords!;
    const tc = params.textureCoords!;

    const cTl = params.colorTl;
    const cTr = params.colorTr;
    const cBl = params.colorBl;
    const cBr = params.colorBr;

    // Upper-Left
    f[i] = rc.x1;
    f[i + 1] = rc.y1;
    f[i + 2] = tc.x1;
    f[i + 3] = tc.y1;
    u[i + 4] = cTl;
    f[i + 5] = tidx;
    f[i + 6] = 0;
    f[i + 7] = 0;

    // Upper-Right
    f[i + 8] = rc.x2;
    f[i + 9] = rc.y2;
    f[i + 10] = tc.x2;
    f[i + 11] = tc.y1;
    u[i + 12] = cTr;
    f[i + 13] = tidx;
    f[i + 14] = 1;
    f[i + 15] = 0;

    // Lower-Left
    f[i + 16] = rc.x4;
    f[i + 17] = rc.y4;
    f[i + 18] = tc.x1;
    f[i + 19] = tc.y2;
    u[i + 20] = cBl;
    f[i + 21] = tidx;
    f[i + 22] = 0;
    f[i + 23] = 1;

    // Lower-Right
    f[i + 24] = rc.x3;
    f[i + 25] = rc.y3;
    f[i + 26] = tc.x2;
    f[i + 27] = tc.y2;
    u[i + 28] = cBr;
    f[i + 29] = tidx;
    f[i + 30] = 1;
    f[i + 31] = 1;

    ro.numQuads++;
    this.curBufferIdx = i + 32;
  }

  /**
   * Replace the existing RenderOp with a new one that uses the specified Shader
   * and starts at the specified buffer index.
   *
   * @param shader
   * @param bufferIdx
   */
  private newRenderOp(quad: QuadOptions | WebGlRenderOp, bufferIdx: number) {
    const curRenderOp = new WebGlRenderOp(this, quad, bufferIdx);
    this.curRenderOp = curRenderOp;
    this.renderOps.push(curRenderOp);
  }

  /**
   * Add a texture to the current RenderOp. If the texture cannot be added to the
   * current RenderOp, a new RenderOp will be created and the texture will be added
   * to that one.
   *
   * If the texture cannot be added to the new RenderOp, an error will be thrown.
   *
   * @param texture
   * @param bufferIdx
   * @param recursive
   * @returns Assigned Texture Index of the texture in the render op
   */
  private addTexture(
    texture: WebGlCtxTexture,
    bufferIdx: number,
    recursive?: boolean,
  ): number {
    const textureIdx = this.curRenderOp!.addTexture(texture);
    // TODO: Refactor to be more DRY
    if (textureIdx === 0xffffffff) {
      if (recursive) {
        throw new Error('Unable to add texture to render op');
      }
      this.newRenderOp(this.curRenderOp!, bufferIdx);
      return this.addTexture(texture, bufferIdx, true);
    }
    return textureIdx;
  }

  /**
   * Test if the current Render operation can be reused for the specified parameters.
   * @param params
   * @returns
   */
  reuseRenderOp(params: QuadOptions): boolean {
    // Switching shader program will require a new render operation
    if (
      this.curRenderOp?.shader.shaderKey !==
      (params.shader as WebGlShaderNode).shaderKey
    ) {
      return false;
    }

    // Switching clipping rect will require a new render operation
    if (
      compareRect(this.curRenderOp.clippingRect, params.clippingRect) === false
    ) {
      return false;
    }

    // Force new render operation if rendering to texture
    // @todo: This needs to be improved, render operations could also be reused
    // for rendering to texture
    if (
      params.parentHasRenderTexture !== undefined ||
      params.rtt !== undefined
    ) {
      return false;
    }

    if (
      this.curRenderOp.shader.shaderKey === 'default' &&
      params.shader?.shaderKey === 'default'
    ) {
      return true;
    }

    // Check if the shader can batch the shader properties
    if (
      this.curRenderOp.shader.program.reuseRenderOp(
        params,
        this.curRenderOp,
      ) === false
    ) {
      return false;
    }

    // Render operation can be reused
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
   * Render the current set of RenderOps to render to the specified surface.
   *
   * TODO: 'screen' is the only supported surface at the moment.
   *
   * @param surface
   */
  render(surface: 'screen' | CoreContextTexture = 'screen'): void {
    const { glw, quadBuffer } = this;

    const arr = new Float32Array(quadBuffer, 0, this.curBufferIdx);

    const buffer = this.quadBufferCollection.getBuffer('a_position') || null;
    glw.arrayBufferData(buffer, arr, glw.STATIC_DRAW);

    for (let i = 0, length = this.renderOps.length; i < length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.renderOps[i]!.draw();
    }
    this.quadBufferUsage = this.curBufferIdx * arr.BYTES_PER_ELEMENT;

    // Calculate the size of each quad in bytes (4 vertices per quad) times the size of each vertex in bytes
    const QUAD_SIZE_IN_BYTES = 4 * (8 * arr.BYTES_PER_ELEMENT); // 8 attributes per vertex
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

    // 1. Traverse upwards to ensure the node is placed before its RTT parent (if any).
    let currentNode: CoreNode = node;
    while (currentNode) {
      if (!currentNode.parent) {
        break;
      }

      const parentIndex = this.rttNodes.indexOf(currentNode.parent);
      if (parentIndex !== -1) {
        // Found an RTT parent in the list; set insertIndex to place node before the parent
        insertIndex = parentIndex;
        break;
      }

      currentNode = currentNode.parent;
    }

    // 2. Traverse downwards to ensure the node is placed after any RTT children.
    // Look through each child recursively to see if any are already in rttNodes.
    const maxChildIndex = this.findMaxChildRTTIndex(node);
    if (maxChildIndex !== -1) {
      // Adjust insertIndex to be after the last child RTT node
      insertIndex = Math.max(insertIndex, maxChildIndex + 1);
    }

    // 3. Insert the node at the calculated position
    this.rttNodes.splice(insertIndex, 0, node);
  }

  // Helper function to find the highest index of any RTT children of a node within rttNodes
  private findMaxChildRTTIndex(node: CoreNode): number {
    let maxIndex = -1;

    const traverseChildren = (currentNode: CoreNode) => {
      const currentIndex = this.rttNodes.indexOf(currentNode);
      if (currentIndex !== -1) {
        maxIndex = Math.max(maxIndex, currentIndex);
      }

      // Recursively check all children of the current node
      for (const child of currentNode.children) {
        traverseChildren(child);
      }
    };

    // Start traversal directly with the provided node
    traverseChildren(node);

    return maxIndex;
  }

  renderRTTNodes() {
    const { glw } = this;
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

      // Render all associated quads to the texture
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];

        if (child === undefined) {
          continue;
        }

        this.stage.addQuads(child);
        child.hasRTTupdates = false;
      }

      // Render all associated quads to the texture
      this.render();

      // Reset render operations
      this.renderOps.length = 0;
      node.hasRTTupdates = false;
    }

    const clearColor = this.clearColor.normalized;
    // Restore the default clear color
    glw.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);

    // Bind the default framebuffer
    glw.bindFramebuffer(null);

    glw.viewport(0, 0, this.glw.canvas.width, this.glw.canvas.height);
    this.renderToTextureActive = false;
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
}
