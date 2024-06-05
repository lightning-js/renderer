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
import { Texture } from '../../textures/Texture.js';
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
  quadBuffer: ArrayBuffer = new ArrayBuffer(1024 * 1024 * 4);
  fQuadBuffer: Float32Array = new Float32Array(this.quadBuffer);
  uiQuadBuffer: Uint32Array = new Uint32Array(this.quadBuffer);
  renderOps: WebGlCoreRenderOp[] = [];

  //// Render Op / Buffer Filling State
  curBufferIdx = 0;
  curRenderOp: WebGlCoreRenderOp | null = null;
  override rttNodes: CoreNode[] = [];
  activeRttNode: CoreNode | null = null;

  //// Default Shader
  defaultShader: WebGlCoreShader;
  quadBufferCollection: BufferCollection;

  /**
   * White pixel texture used by default when no texture is specified.
   */
  defaultTexture: Texture;

  /**
   * Whether the renderer is currently rendering to a texture.
   */
  public renderToTextureActive = false;

  constructor(options: WebGlCoreRendererOptions) {
    super(options);
    this.mode = 'webgl';

    const { canvas, clearColor, bufferMemory } = options;

    this.defaultTexture = new ColorTexture(this.txManager);

    // Mark the default texture as ALWAYS renderable
    // This prevents it from ever being garbage collected.
    // Fixes https://github.com/lightning-js/renderer/issues/262
    this.defaultTexture.setRenderableOwner(this, true);

    // When the default texture is loaded, request a render in case the
    // RAF is paused. Fixes: https://github.com/lightning-js/renderer/issues/123
    this.defaultTexture.once('loaded', () => {
      this.stage.requestRender();
    });

    const gl = createWebGLContext(canvas, options.contextSpy);
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
    this.defaultShader = this.shManager.loadShader('DefaultShader').shader;
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
    const {
      width,
      height,
      colorTl,
      colorTr,
      colorBl,
      colorBr,
      textureOptions,
      shader,
      shaderProps,
      alpha,
      clippingRect,
      transform,
      renderCoords,
      rtt: renderToTexture,
      parentHasRenderTexture,
      framebufferDimensions,
    } = params;
    let { texture } = params;

    /**
     * If the shader props contain any automatic properties, update it with the
     * current dimensions that will be used to render the quad.
     */
    if (shaderProps && hasOwn(shaderProps, '$dimensions')) {
      const dimensions = shaderProps.$dimensions as Dimensions;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      dimensions.width = width;
      dimensions.height = height;
    }

    texture = texture ?? this.defaultTexture;
    assertTruthy(texture instanceof Texture, 'Invalid texture type');

    let { curBufferIdx: bufferIdx, curRenderOp } = this;
    const targetDims = {
      width,
      height,
    };
    const targetShader = shader || this.defaultShader;
    assertTruthy(targetShader instanceof WebGlCoreShader);

    if (!this.reuseRenderOp(params)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      this.newRenderOp(
        targetShader,
        shaderProps as Record<string, unknown>,
        alpha,
        targetDims,
        clippingRect,
        bufferIdx,
        renderToTexture,
        parentHasRenderTexture,
        framebufferDimensions,
      );
      curRenderOp = this.curRenderOp;
      assertTruthy(curRenderOp);
    }

    const flipX = textureOptions?.flipX ?? false;
    let flipY = textureOptions?.flipY ?? false;

    // always flip Y for render textures
    if (texture instanceof RenderTexture) {
      flipY = true;
    }

    let texCoordX1 = 0;
    let texCoordY1 = 0;
    let texCoordX2 = 1;
    let texCoordY2 = 1;

    if (texture instanceof SubTexture) {
      const { x: tx, y: ty, width: tw, height: th } = texture.props;
      const { width: parentW = 0, height: parentH = 0 } = texture.parentTexture
        .dimensions || { width: 0, height: 0 };
      texCoordX1 = tx / parentW;
      texCoordX2 = texCoordX1 + tw / parentW;
      texCoordY1 = ty / parentH;
      texCoordY2 = texCoordY1 + th / parentH;
      texture = texture.parentTexture;
    }

    // Flip texture coordinates if dictated by texture options
    if (flipX) {
      [texCoordX1, texCoordX2] = [texCoordX2, texCoordX1];
    }
    if (flipY) {
      [texCoordY1, texCoordY2] = [texCoordY2, texCoordY1];
    }

    const { txManager } = this.stage;
    const ctxTexture = txManager.getCtxTexture(texture);
    assertTruthy(ctxTexture instanceof WebGlCoreCtxTexture);
    const textureIdx = this.addTexture(ctxTexture, bufferIdx);

    curRenderOp = this.curRenderOp;
    assertTruthy(curRenderOp);
    assertTruthy(renderCoords);
    // if(renderCoords) {
    const { x1, x2, x3, x4, y1, y2, y3, y4 } = renderCoords;
    // Upper-Left
    fQuadBuffer[bufferIdx++] = x1; // vertexX
    fQuadBuffer[bufferIdx++] = y1; // vertexY
    fQuadBuffer[bufferIdx++] = texCoordX1; // texCoordX
    fQuadBuffer[bufferIdx++] = texCoordY1; // texCoordY
    uiQuadBuffer[bufferIdx++] = colorTl; // color
    fQuadBuffer[bufferIdx++] = textureIdx; // texIndex

    // Upper-Right
    fQuadBuffer[bufferIdx++] = x2;
    fQuadBuffer[bufferIdx++] = y2;
    fQuadBuffer[bufferIdx++] = texCoordX2;
    fQuadBuffer[bufferIdx++] = texCoordY1;
    uiQuadBuffer[bufferIdx++] = colorTr;
    fQuadBuffer[bufferIdx++] = textureIdx;

    // Lower-Left
    fQuadBuffer[bufferIdx++] = x4;
    fQuadBuffer[bufferIdx++] = y4;
    fQuadBuffer[bufferIdx++] = texCoordX1;
    fQuadBuffer[bufferIdx++] = texCoordY2;
    uiQuadBuffer[bufferIdx++] = colorBl;
    fQuadBuffer[bufferIdx++] = textureIdx;

    // Lower-Right
    fQuadBuffer[bufferIdx++] = x3;
    fQuadBuffer[bufferIdx++] = y3;
    fQuadBuffer[bufferIdx++] = texCoordX2;
    fQuadBuffer[bufferIdx++] = texCoordY2;
    uiQuadBuffer[bufferIdx++] = colorBr;
    fQuadBuffer[bufferIdx++] = textureIdx;

    // Update the length of the current render op
    curRenderOp.length += WORDS_PER_QUAD;
    curRenderOp.numQuads++;
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

      const { shader, shaderProps, dimensions, clippingRect, alpha } =
        curRenderOp;
      this.newRenderOp(
        shader,
        shaderProps,
        alpha,
        dimensions,
        clippingRect,
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
  reuseRenderOp(params: QuadOptions) {
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

    this.renderOps.forEach((renderOp, i) => {
      if (doLog) {
        console.log('Quads per operation', renderOp.numQuads);
      }
      renderOp.draw();
    });
  }

  renderToTexture(node: CoreNode) {
    for (let i = 0; i < this.rttNodes.length; i++) {
      if (this.rttNodes[i] === node) {
        return;
      }
    }

    // @todo: Better bottom up rendering order
    this.rttNodes.unshift(node);
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
      const ctxTexture = txManager.getCtxTexture(node.texture);
      assertTruthy(ctxTexture instanceof WebGlCoreCtxRenderTexture);
      this.renderToTextureActive = true;

      // Bind the the texture's framebuffer
      glw.bindFramebuffer(ctxTexture.framebuffer);

      glw.viewport(0, 0, ctxTexture.w, ctxTexture.h);
      glw.clear();

      // Render all associated quads to the texture
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (!child) {
          continue;
        }
        child.update(this.stage.deltaTime, {
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          valid: false,
        });

        this.stage.addQuads(child);
        child.hasRTTupdates = false;
      }

      // Render all associated quads to the texture
      this.render();

      // Reset render operations
      this.renderOps.length = 0;
      node.hasRTTupdates = false;
    }

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
}
