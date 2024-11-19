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

import { assertTruthy, createWebGLContext, hasOwn } from '../../../utils.js';
import {
  CoreRenderer,
  type BufferInfo,
  type CoreRendererOptions,
  type QuadOptions,
} from '../CoreRenderer.js';
import { WebGlCoreRenderOp } from './WebGlCoreRenderOp.js';
import type { CoreContextTexture } from '../CoreContextTexture.js';
import {
  createIndexBuffer,
  type CoreWebGlParameters,
  type CoreWebGlExtensions,
  getWebGlParameters,
  getWebGlExtensions,
} from './internal/RendererUtils.js';
import { WebGlCoreCtxTexture } from './WebGlCoreCtxTexture.js';
import { Texture, TextureType } from '../../textures/Texture.js';
import { ColorTexture } from '../../textures/ColorTexture.js';
import { SubTexture } from '../../textures/SubTexture.js';
import { WebGlCoreCtxSubTexture } from './WebGlCoreCtxSubTexture.js';
import { CoreShaderManager } from '../../CoreShaderManager.js';
import { BufferCollection } from './internal/BufferCollection.js';
import {
  compareRect,
  getNormalizedRgbaComponents,
  type RectWithValid,
} from '../../lib/utils.js';
import type { Dimensions } from '../../../common/CommonTypes.js';
import { WebGlCoreShader } from './WebGlCoreShader.js';
import { WebGlContextWrapper } from '../../lib/WebGlContextWrapper.js';
import { RenderTexture } from '../../textures/RenderTexture.js';
import type { CoreNode } from '../../CoreNode.js';
import { WebGlCoreCtxRenderTexture } from './WebGlCoreCtxRenderTexture.js';
import type { BaseShaderController } from '../../../main-api/ShaderController.js';
import { ImageTexture } from '../../textures/ImageTexture.js';

const WORDS_PER_QUAD = 24;
// const BYTES_PER_QUAD = WORDS_PER_QUAD * 4;

export type WebGlCoreRendererOptions = CoreRendererOptions;

interface CoreWebGlSystem {
  parameters: CoreWebGlParameters;
  extensions: CoreWebGlExtensions;
}

export class WebGlCoreRenderer extends CoreRenderer {
  //// WebGL Native Context and Data
  glw: WebGlContextWrapper;
  system: CoreWebGlSystem;

  //// Persistent data
  quadBuffer: ArrayBuffer;
  fQuadBuffer: Float32Array;
  uiQuadBuffer: Uint32Array;
  renderOps: WebGlCoreRenderOp[] = [];

  //// Render Op / Buffer Filling State
  curBufferIdx = 0;
  curRenderOp: WebGlCoreRenderOp | null = null;
  override rttNodes: CoreNode[] = [];
  activeRttNode: CoreNode | null = null;

  //// Default Shader
  defShaderCtrl: BaseShaderController;
  defaultShader: WebGlCoreShader;
  quadBufferCollection: BufferCollection;

  /**
   * White pixel texture used by default when no texture is specified.
   */
  defaultTexture: Texture;

  quadBufferUsage = 0;
  /**
   * Whether the renderer is currently rendering to a texture.
   */
  public renderToTextureActive = false;

  constructor(options: WebGlCoreRendererOptions) {
    super(options);

    this.quadBuffer = new ArrayBuffer(this.stage.options.quadBufferSize);
    this.fQuadBuffer = new Float32Array(this.quadBuffer);
    this.uiQuadBuffer = new Uint32Array(this.quadBuffer);

    this.mode = 'webgl';

    const { canvas, clearColor, bufferMemory } = options;

    this.defaultTexture = new ColorTexture(this.txManager);

    // Mark the default texture as ALWAYS renderable
    // This prevents it from ever being cleaned up.
    // Fixes https://github.com/lightning-js/renderer/issues/262
    this.defaultTexture.setRenderableOwner(this, true);

    // When the default texture is loaded, request a render in case the
    // RAF is paused. Fixes: https://github.com/lightning-js/renderer/issues/123
    this.defaultTexture.once('loaded', () => {
      this.stage.requestRender();
    });

    const gl = createWebGLContext(
      canvas,
      options.forceWebGL2,
      options.contextSpy,
    );
    const glw = (this.glw = new WebGlContextWrapper(gl));

    const color = getNormalizedRgbaComponents(clearColor);
    glw.viewport(0, 0, canvas.width, canvas.height);
    glw.clearColor(color[0]!, color[1]!, color[2]!, color[3]!);
    glw.setBlend(true);
    glw.blendFunc(glw.ONE, glw.ONE_MINUS_SRC_ALPHA);

    createIndexBuffer(glw, bufferMemory);

    this.system = {
      parameters: getWebGlParameters(this.glw),
      extensions: getWebGlExtensions(this.glw),
    };
    this.shManager.renderer = this;
    this.defShaderCtrl = this.shManager.loadShader('DefaultShader');
    this.defaultShader = this.defShaderCtrl.shader as WebGlCoreShader;
    const quadBuffer = glw.createBuffer();
    assertTruthy(quadBuffer);
    const stride = 6 * Float32Array.BYTES_PER_ELEMENT;
    this.quadBufferCollection = new BufferCollection([
      {
        buffer: quadBuffer,
        attributes: {
          a_position: {
            name: 'a_position',
            size: 2, // 2 components per iteration
            type: glw.FLOAT, // the data is 32bit floats
            normalized: false, // don't normalize the data
            stride, // 0 = move forward size * sizeof(type) each iteration to get the next position
            offset: 0, // start at the beginning of the buffer
          },
          a_textureCoordinate: {
            name: 'a_textureCoordinate',
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

  override getShaderManager(): CoreShaderManager {
    return this.shManager;
  }

  override createCtxTexture(textureSource: Texture): CoreContextTexture {
    if (textureSource instanceof SubTexture) {
      return new WebGlCoreCtxSubTexture(
        this.glw,
        this.txMemManager,
        textureSource,
      );
    } else if (textureSource instanceof RenderTexture) {
      return new WebGlCoreCtxRenderTexture(
        this.glw,
        this.txMemManager,
        textureSource,
      );
    }
    return new WebGlCoreCtxTexture(this.glw, this.txMemManager, textureSource);
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
    const { fQuadBuffer, uiQuadBuffer } = this;
    let texture = params.texture || this.defaultTexture;

    /**
     * If the shader props contain any automatic properties, update it with the
     * current dimensions and or alpha that will be used to render the quad.
     */
    if (params.shaderProps !== null) {
      if (hasOwn(params.shaderProps, '$dimensions') == true) {
        const dimensions = params.shaderProps.$dimensions as Dimensions;
        dimensions.width = params.width;
        dimensions.height = params.height;
      }

      if (hasOwn(params.shaderProps, '$alpha') === true) {
        params.shaderProps.$alpha = params.alpha;
      }
    }

    assertTruthy(texture.ctxTexture !== undefined, 'Invalid texture type');

    let { curBufferIdx: bufferIdx, curRenderOp } = this;
    const targetDims = { width: -1, height: -1 };
    targetDims.width = params.width;
    targetDims.height = params.height;

    const targetShader =
      (params.shader as WebGlCoreShader) || this.defaultShader;
    assertTruthy(
      targetShader.getUniformLocation !== undefined,
      'Invalid WebGL shader',
    );

    if (this.reuseRenderOp(params) === false) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      this.newRenderOp(
        targetShader,
        params.shaderProps as Record<string, unknown>,
        params.alpha,
        targetDims,
        params.clippingRect,
        bufferIdx,
        params.rtt,
        params.parentHasRenderTexture,
        params.framebufferDimensions,
      );
      curRenderOp = this.curRenderOp;
      assertTruthy(curRenderOp);
    }

    let texCoordX1 = 0;
    let texCoordY1 = 0;
    let texCoordX2 = 1;
    let texCoordY2 = 1;

    if (texture.type === TextureType.subTexture) {
      const {
        x: tx,
        y: ty,
        width: tw,
        height: th,
      } = (texture as SubTexture).props;
      const { width: parentW = 0, height: parentH = 0 } = (
        texture as SubTexture
      ).parentTexture.dimensions || { width: 0, height: 0 };
      texCoordX1 = tx / parentW;
      texCoordX2 = texCoordX1 + tw / parentW;
      texCoordY1 = ty / parentH;
      texCoordY2 = texCoordY1 + th / parentH;
      texture = (texture as SubTexture).parentTexture;
    }

    if (
      texture.type === TextureType.image &&
      params.textureOptions !== null &&
      params.textureOptions.resizeMode !== undefined &&
      texture.dimensions !== null
    ) {
      const resizeMode = params.textureOptions.resizeMode;
      const { width: tw, height: th } = texture.dimensions;
      if (resizeMode.type === 'cover') {
        const scaleX = params.width / tw;
        const scaleY = params.height / th;
        const scale = Math.max(scaleX, scaleY);
        const precision = 1 / scale;
        // Determine based on width
        if (scale && scaleX && scaleX < scale) {
          const desiredSize = precision * params.width;
          texCoordX1 = (1 - desiredSize / tw) * (resizeMode.clipX ?? 0.5);
          texCoordX2 = texCoordX1 + desiredSize / tw;
        }
        // Determine based on height
        if (scale && scaleY && scaleY < scale) {
          const desiredSize = precision * params.height;
          texCoordY1 = (1 - desiredSize / th) * (resizeMode.clipY ?? 0.5);
          texCoordY2 = texCoordY1 + desiredSize / th;
        }
      }
    }

    // Flip texture coordinates if dictated by texture options
    let flipY = 0;
    if (params.textureOptions !== null) {
      if (params.textureOptions.flipX === true) {
        [texCoordX1, texCoordX2] = [texCoordX2, texCoordX1];
      }

      // convert to integer for bitwise operation below
      flipY = +(params.textureOptions.flipY || false);
    }

    // Eitherone should be true
    if (flipY ^ +(texture.type === TextureType.renderToTexture)) {
      [texCoordY1, texCoordY2] = [texCoordY2, texCoordY1];
    }

    const ctxTexture = texture.ctxTexture as WebGlCoreCtxTexture;
    assertTruthy(ctxTexture.ctxTexture !== undefined);
    const textureIdx = this.addTexture(ctxTexture, bufferIdx);

    assertTruthy(this.curRenderOp !== null);
    if (params.renderCoords) {
      // Upper-Left
      fQuadBuffer[bufferIdx++] = params.renderCoords.x1; // vertexX
      fQuadBuffer[bufferIdx++] = params.renderCoords.y1; // vertexY
      fQuadBuffer[bufferIdx++] = texCoordX1; // texCoordX
      fQuadBuffer[bufferIdx++] = texCoordY1; // texCoordY
      uiQuadBuffer[bufferIdx++] = params.colorTl; // color
      fQuadBuffer[bufferIdx++] = textureIdx; // texIndex

      // Upper-Right
      fQuadBuffer[bufferIdx++] = params.renderCoords.x2;
      fQuadBuffer[bufferIdx++] = params.renderCoords.y2;
      fQuadBuffer[bufferIdx++] = texCoordX2;
      fQuadBuffer[bufferIdx++] = texCoordY1;
      uiQuadBuffer[bufferIdx++] = params.colorTr;
      fQuadBuffer[bufferIdx++] = textureIdx;

      // Lower-Left
      fQuadBuffer[bufferIdx++] = params.renderCoords.x4;
      fQuadBuffer[bufferIdx++] = params.renderCoords.y4;
      fQuadBuffer[bufferIdx++] = texCoordX1;
      fQuadBuffer[bufferIdx++] = texCoordY2;
      uiQuadBuffer[bufferIdx++] = params.colorBl;
      fQuadBuffer[bufferIdx++] = textureIdx;

      // Lower-Right
      fQuadBuffer[bufferIdx++] = params.renderCoords.x3;
      fQuadBuffer[bufferIdx++] = params.renderCoords.y3;
      fQuadBuffer[bufferIdx++] = texCoordX2;
      fQuadBuffer[bufferIdx++] = texCoordY2;
      uiQuadBuffer[bufferIdx++] = params.colorBr;
      fQuadBuffer[bufferIdx++] = textureIdx;
    } else if (params.tb !== 0 || params.tc !== 0) {
      // Upper-Left
      fQuadBuffer[bufferIdx++] = params.tx; // vertexX
      fQuadBuffer[bufferIdx++] = params.ty; // vertexY
      fQuadBuffer[bufferIdx++] = texCoordX1; // texCoordX
      fQuadBuffer[bufferIdx++] = texCoordY1; // texCoordY
      uiQuadBuffer[bufferIdx++] = params.colorTl; // color
      fQuadBuffer[bufferIdx++] = textureIdx; // texIndex

      // Upper-Right
      fQuadBuffer[bufferIdx++] = params.tx + params.width * params.ta;
      fQuadBuffer[bufferIdx++] = params.ty + params.width * params.tc;
      fQuadBuffer[bufferIdx++] = texCoordX2;
      fQuadBuffer[bufferIdx++] = texCoordY1;
      uiQuadBuffer[bufferIdx++] = params.colorTr;
      fQuadBuffer[bufferIdx++] = textureIdx;

      // Lower-Left
      fQuadBuffer[bufferIdx++] = params.tx + params.height * params.tb;
      fQuadBuffer[bufferIdx++] = params.ty + params.height * params.td;
      fQuadBuffer[bufferIdx++] = texCoordX1;
      fQuadBuffer[bufferIdx++] = texCoordY2;
      uiQuadBuffer[bufferIdx++] = params.colorBl;
      fQuadBuffer[bufferIdx++] = textureIdx;

      // Lower-Right
      fQuadBuffer[bufferIdx++] =
        params.tx + params.width * params.ta + params.height * params.tb;
      fQuadBuffer[bufferIdx++] =
        params.ty + params.width * params.tc + params.height * params.td;
      fQuadBuffer[bufferIdx++] = texCoordX2;
      fQuadBuffer[bufferIdx++] = texCoordY2;
      uiQuadBuffer[bufferIdx++] = params.colorBr;
      fQuadBuffer[bufferIdx++] = textureIdx;
    } else {
      // Calculate the right corner of the quad
      // multiplied by the scale
      const rightCornerX = params.tx + params.width * params.ta;
      const rightCornerY = params.ty + params.height * params.td;

      // Upper-Left
      fQuadBuffer[bufferIdx++] = params.tx; // vertexX
      fQuadBuffer[bufferIdx++] = params.ty; // vertexY
      fQuadBuffer[bufferIdx++] = texCoordX1; // texCoordX
      fQuadBuffer[bufferIdx++] = texCoordY1; // texCoordY
      uiQuadBuffer[bufferIdx++] = params.colorTl; // color
      fQuadBuffer[bufferIdx++] = textureIdx; // texIndex

      // Upper-Right
      fQuadBuffer[bufferIdx++] = rightCornerX;
      fQuadBuffer[bufferIdx++] = params.ty;
      fQuadBuffer[bufferIdx++] = texCoordX2;
      fQuadBuffer[bufferIdx++] = texCoordY1;
      uiQuadBuffer[bufferIdx++] = params.colorTr;
      fQuadBuffer[bufferIdx++] = textureIdx;

      // Lower-Left
      fQuadBuffer[bufferIdx++] = params.tx;
      fQuadBuffer[bufferIdx++] = rightCornerY;
      fQuadBuffer[bufferIdx++] = texCoordX1;
      fQuadBuffer[bufferIdx++] = texCoordY2;
      uiQuadBuffer[bufferIdx++] = params.colorBl;
      fQuadBuffer[bufferIdx++] = textureIdx;

      // Lower-Right
      fQuadBuffer[bufferIdx++] = rightCornerX;
      fQuadBuffer[bufferIdx++] = rightCornerY;
      fQuadBuffer[bufferIdx++] = texCoordX2;
      fQuadBuffer[bufferIdx++] = texCoordY2;
      uiQuadBuffer[bufferIdx++] = params.colorBr;
      fQuadBuffer[bufferIdx++] = textureIdx;
    }
    // Update the length of the current render op
    this.curRenderOp.length += WORDS_PER_QUAD;
    this.curRenderOp.numQuads++;
    this.curBufferIdx = bufferIdx;
  }

  /**
   * Replace the existing RenderOp with a new one that uses the specified Shader
   * and starts at the specified buffer index.
   *
   * @param shader
   * @param bufferIdx
   */
  private newRenderOp(
    shader: WebGlCoreShader,
    shaderProps: Record<string, unknown>,
    alpha: number,
    dimensions: Dimensions,
    clippingRect: RectWithValid,
    bufferIdx: number,
    renderToTexture?: boolean,
    parentHasRenderTexture?: boolean,
    framebufferDimensions?: Dimensions,
  ) {
    const curRenderOp = new WebGlCoreRenderOp(
      this.glw,
      this.options,
      this.quadBufferCollection,
      shader,
      shaderProps,
      alpha,
      clippingRect,
      dimensions,
      bufferIdx,
      0, // Z-Index is only used for explictly added Render Ops
      renderToTexture,
      parentHasRenderTexture,
      framebufferDimensions,
    );
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
    texture: WebGlCoreCtxTexture,
    bufferIdx: number,
    recursive?: boolean,
  ): number {
    const { curRenderOp } = this;
    assertTruthy(curRenderOp);
    const textureIdx = curRenderOp.addTexture(texture);
    // TODO: Refactor to be more DRY
    if (textureIdx === 0xffffffff) {
      if (recursive) {
        throw new Error('Unable to add texture to render op');
      }

      this.newRenderOp(
        curRenderOp.shader,
        curRenderOp.shaderProps,
        curRenderOp.alpha,
        curRenderOp.dimensions,
        curRenderOp.clippingRect,
        bufferIdx,
      );
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
    const { shader, shaderProps, parentHasRenderTexture, rtt, clippingRect } =
      params;

    const targetShader = shader || this.defaultShader;

    // Switching shader program will require a new render operation
    if (this.curRenderOp?.shader !== targetShader) {
      return false;
    }

    // Switching clipping rect will require a new render operation
    if (!compareRect(this.curRenderOp.clippingRect, clippingRect)) {
      return false;
    }

    // Force new render operation if rendering to texture
    // @todo: This needs to be improved, render operations could also be reused
    // for rendering to texture
    if (parentHasRenderTexture || rtt) {
      return false;
    }

    // Check if the shader can batch the shader properties
    if (
      this.curRenderOp.shader !== this.defaultShader &&
      (!shaderProps ||
        !this.curRenderOp.shader.canBatchShaderProps(
          this.curRenderOp.shaderProps,
          shaderProps,
        ))
    ) {
      return false;
    }

    // Render operation can be reused
    return true;
  }

  /**
   * add RenderOp to the render pipeline
   */
  addRenderOp(renderable: WebGlCoreRenderOp) {
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

    const buffer = this.quadBufferCollection.getBuffer('a_position') ?? null;
    glw.arrayBufferData(buffer, arr, glw.STATIC_DRAW);

    const doLog = false; // idx++ % 100 === 0;
    if (doLog) {
      console.log('renderOps', this.renderOps.length);
    }

    for (let i = 0, length = this.renderOps.length; i < length; i++) {
      const renderOp = this.renderOps[i] as WebGlCoreRenderOp;
      if (doLog) {
        console.log('Quads per operation', renderOp.numQuads);
      }
      renderOp.draw();
    }
    this.quadBufferUsage = this.curBufferIdx * arr.BYTES_PER_ELEMENT;
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
    const { txManager } = this.stage;

    // Render all associated RTT nodes to their textures
    for (let i = 0; i < this.rttNodes.length; i++) {
      const node = this.rttNodes[i];

      // Skip nodes that don't have RTT updates
      if (!node || !node.hasRTTupdates) {
        continue;
      }

      // Set the active RTT node to the current node
      // So we can prevent rendering children of nested RTT nodes
      this.activeRttNode = node;

      assertTruthy(node.texture, 'RTT node missing texture');
      const ctxTexture = node.texture.ctxTexture;
      assertTruthy(ctxTexture instanceof WebGlCoreCtxRenderTexture);
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

        if (!child) {
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

    const color = getNormalizedRgbaComponents(this.stage.options.clearColor);
    // Restore the default clear color
    glw.clearColor(color[0]!, color[1]!, color[2]!, color[3]!);

    // Bind the default framebuffer
    glw.bindFramebuffer(null);

    glw.viewport(0, 0, this.glw.canvas.width, this.glw.canvas.height);
    this.renderToTextureActive = false;
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

  override getDefShaderCtr(): BaseShaderController {
    return this.defShaderCtrl;
  }

  /**
   * Updates the WebGL context's clear color and clears the color buffer.
   *
   * @param color - The color to set as the clear color, represented as a 32-bit integer.
   */
  updateClearColor(color: number) {
    const glw = this.glw;
    const normalizedColor = getNormalizedRgbaComponents(color);
    glw.clearColor(
      normalizedColor[0],
      normalizedColor[1],
      normalizedColor[2],
      normalizedColor[3],
    );
    glw.clear();
  }
}
