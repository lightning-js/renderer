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

import {
  assertTruthy,
  createWebGLContext,
  hasOwn,
  mergeColorAlphaPremultiplied,
} from '../../../utils.js';
import { CoreRenderer, type QuadOptions } from '../CoreRenderer.js';
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
import type { Stage } from '../../Stage.js';
import { SubTexture } from '../../textures/SubTexture.js';
import { WebGlCoreCtxSubTexture } from './WebGlCoreCtxSubTexture.js';
import type {
  CoreTextureManager,
  TextureOptions,
} from '../../CoreTextureManager.js';
import { CoreShaderManager } from '../../CoreShaderManager.js';
import type { CoreShader } from '../CoreShader.js';
import { BufferCollection } from './internal/BufferCollection.js';
import {
  compareRect,
  getNormalizedRgbaComponents,
  type Rect,
  type RectWithValid,
} from '../../lib/utils.js';
import type { Dimensions } from '../../../common/CommonTypes.js';
import { WebGlCoreShader } from './WebGlCoreShader.js';
import { RoundedRectangle } from './shaders/RoundedRectangle.js';
import { ContextSpy } from '../../lib/ContextSpy.js';
import { WebGlContextWrapper } from '../../lib/WebGlContextWrapper.js';
import { RenderTexture } from '../../textures/RenderTexture.js';
import type { CoreNode } from '../../CoreNode.js';

const WORDS_PER_QUAD = 24;
const BYTES_PER_QUAD = WORDS_PER_QUAD * 4;

export interface WebGlCoreRendererOptions {
  stage: Stage;
  canvas: HTMLCanvasElement | OffscreenCanvas;
  pixelRatio: number;
  txManager: CoreTextureManager;
  shManager: CoreShaderManager;
  clearColor: number;
  bufferMemory: number;
  contextSpy: ContextSpy | null;
}

interface CoreWebGlSystem {
  parameters: CoreWebGlParameters;
  extensions: CoreWebGlExtensions;
}

export class WebGlCoreRenderer extends CoreRenderer {
  //// WebGL Native Context and Data
  glw: WebGlContextWrapper;
  system: CoreWebGlSystem;

  //// Core Managers
  txManager: CoreTextureManager;
  shManager: CoreShaderManager;

  //// Options
  options: Required<WebGlCoreRendererOptions>;

  //// Persistent data
  quadBuffer: ArrayBuffer = new ArrayBuffer(1024 * 1024 * 4);
  fQuadBuffer: Float32Array = new Float32Array(this.quadBuffer);
  uiQuadBuffer: Uint32Array = new Uint32Array(this.quadBuffer);
  renderOps: WebGlCoreRenderOp[] = [];

  //// Render Op / Buffer Filling State
  curBufferIdx = 0;
  curRenderOp: WebGlCoreRenderOp | null = null;
  renderables: Array<QuadOptions | WebGlCoreRenderOp> = [];
  rttNodes: CoreNode[] = [];

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
    super(options.stage);
    const { canvas, clearColor, bufferMemory } = options;
    this.options = options;
    this.txManager = options.txManager;
    this.shManager = options.shManager;
    this.defaultTexture = new ColorTexture(this.txManager);
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
      return new WebGlCoreCtxSubTexture(this.glw, textureSource);
    }
    return new WebGlCoreCtxTexture(this.glw, textureSource);
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
      tx,
      ty,
      ta,
      tb,
      tc,
      td,
      rtt: renderToTexture,
      parentHasRenderTexture,
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    };
    const targetShader = shader || this.defaultShader;
    assertTruthy(targetShader instanceof WebGlCoreShader);
    if (curRenderOp) {
      // If the current render op is not the same shader, create a new one
      // If the current render op's shader props are not compatible with the
      // the new shader props, create a new one render op.
      if (
        renderToTexture ||
        curRenderOp.shader !== targetShader ||
        !compareRect(curRenderOp.clippingRect, clippingRect) ||
        (curRenderOp.shader !== this.defaultShader &&
          (!shaderProps ||
            !curRenderOp.shader.canBatchShaderProps(
              curRenderOp.shaderProps,
              shaderProps,
            )))
      ) {
        curRenderOp = null;
      }
    }

    assertTruthy(targetShader instanceof WebGlCoreShader);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    if (!curRenderOp) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      this.newRenderOp(
        targetShader,
        shaderProps as any,
        alpha,
        targetDims,
        clippingRect,
        bufferIdx,
        renderToTexture,
        parentHasRenderTexture,
      );
      curRenderOp = this.curRenderOp;
      assertTruthy(curRenderOp);
    }

    const flipX = textureOptions?.flipX ?? false;
    const flipY = textureOptions?.flipY ?? false;

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

    let textureIdx;

    if (texture instanceof RenderTexture) {
      textureIdx = this.addTexture(texture, bufferIdx);
    } else {
      const { txManager } = this.stage;
      const ctxTexture = txManager.getCtxTexture(texture);

      assertTruthy(ctxTexture instanceof WebGlCoreCtxTexture);
      textureIdx = this.addTexture(ctxTexture, bufferIdx);
    }

    curRenderOp = this.curRenderOp;
    assertTruthy(curRenderOp);

    // render quad advanced
    if (tb !== 0 || tc !== 0) {
      // Upper-Left
      fQuadBuffer[bufferIdx++] = tx; // vertexX
      fQuadBuffer[bufferIdx++] = ty; // vertexY
      fQuadBuffer[bufferIdx++] = texCoordX1; // texCoordX
      fQuadBuffer[bufferIdx++] = texCoordY1; // texCoordY
      uiQuadBuffer[bufferIdx++] = colorTl; // color
      fQuadBuffer[bufferIdx++] = textureIdx; // texIndex

      // Upper-Right
      fQuadBuffer[bufferIdx++] = tx + width * ta;
      fQuadBuffer[bufferIdx++] = ty + width * tc;
      fQuadBuffer[bufferIdx++] = texCoordX2;
      fQuadBuffer[bufferIdx++] = texCoordY1;
      uiQuadBuffer[bufferIdx++] = colorTr;
      fQuadBuffer[bufferIdx++] = textureIdx;

      // Lower-Left
      fQuadBuffer[bufferIdx++] = tx + height * tb;
      fQuadBuffer[bufferIdx++] = ty + height * td;
      fQuadBuffer[bufferIdx++] = texCoordX1;
      fQuadBuffer[bufferIdx++] = texCoordY2;
      uiQuadBuffer[bufferIdx++] = colorBl;
      fQuadBuffer[bufferIdx++] = textureIdx;

      // Lower-Right
      fQuadBuffer[bufferIdx++] = tx + width * ta + height * tb;
      fQuadBuffer[bufferIdx++] = ty + width * tc + height * td;
      fQuadBuffer[bufferIdx++] = texCoordX2;
      fQuadBuffer[bufferIdx++] = texCoordY2;
      uiQuadBuffer[bufferIdx++] = colorBr;
      fQuadBuffer[bufferIdx++] = textureIdx;
    } else {
      // Calculate the right corner of the quad
      // multiplied by the scale
      const rightCornerX = tx + width * ta;
      const rightCornerY = ty + height * td;

      // Upper-Left
      fQuadBuffer[bufferIdx++] = tx; // vertexX
      fQuadBuffer[bufferIdx++] = ty; // vertexY
      fQuadBuffer[bufferIdx++] = texCoordX1; // texCoordX
      fQuadBuffer[bufferIdx++] = texCoordY1; // texCoordY
      uiQuadBuffer[bufferIdx++] = colorTl; // color
      fQuadBuffer[bufferIdx++] = textureIdx; // texIndex

      // Upper-Right
      fQuadBuffer[bufferIdx++] = rightCornerX;
      fQuadBuffer[bufferIdx++] = ty;
      fQuadBuffer[bufferIdx++] = texCoordX2;
      fQuadBuffer[bufferIdx++] = texCoordY1;
      uiQuadBuffer[bufferIdx++] = colorTr;
      fQuadBuffer[bufferIdx++] = textureIdx;

      // Lower-Left
      fQuadBuffer[bufferIdx++] = tx;
      fQuadBuffer[bufferIdx++] = rightCornerY;
      fQuadBuffer[bufferIdx++] = texCoordX1;
      fQuadBuffer[bufferIdx++] = texCoordY2;
      uiQuadBuffer[bufferIdx++] = colorBl;
      fQuadBuffer[bufferIdx++] = textureIdx;

      // Lower-Right
      fQuadBuffer[bufferIdx++] = rightCornerX;
      fQuadBuffer[bufferIdx++] = rightCornerY;
      fQuadBuffer[bufferIdx++] = texCoordX2;
      fQuadBuffer[bufferIdx++] = texCoordY2;
      uiQuadBuffer[bufferIdx++] = colorBr;
      fQuadBuffer[bufferIdx++] = textureIdx;
    }

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
    texture: WebGlCoreCtxTexture | WebGLTexture,
    bufferIdx: number,
    recursive?: boolean,
  ): number {
    const { curRenderOp } = this;
    assertTruthy(curRenderOp);
    const textureIdx = curRenderOp.addTexture(texture as WebGlCoreCtxTexture);
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

    // clean up
    this.renderables = [];
  }

  renderToTexture(node: CoreNode) {
    this.rttNodes.push(node);
  }

  renderRTTNodes() {
    const { glw } = this;
    // Render all associated RTT nodes to their textures
    for (let i = 0; i < this.rttNodes.length; i++) {
      const node = this.rttNodes[i];

      // Skip nodes that don't have RTT updates
      if (!node || !node.hasRTTupdates) {
        continue;
      }

      const texture = node?.texture as RenderTexture;
      this.renderToTextureActive = true;

      // Bind the the texture's framebuffer
      glw.bindFramebuffer(texture.framebuffer);
      glw.viewport(0, 0, texture.width, texture.height);

      // Clear the framebuffer
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

      node.hasRTTupdates = false;
    }

    // Render all associated quads to the texture
    this.render();
    this.renderToTextureActive = false;

    // Unbind the framebuffer
    glw.viewport(0, 0, this.glw.canvas.width, this.glw.canvas.height);
    glw.bindFramebuffer(null);
  }
}
