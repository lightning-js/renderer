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

import type { Dimensions } from '../../../common/CommonTypes.js';
import type { WebGlContextWrapper } from '../../lib/WebGlContextWrapper.js';
import { CoreShader, type ShaderConfig } from '../CoreShader.js';
import type { WebGlCoreCtxTexture } from './WebGlCoreCtxTexture.js';
import type {
  WebGlCoreRenderOp,
  WebGlRenderOpProps,
} from './WebGlCoreRenderOp.js';
import type { WebGlCoreRenderer } from './WebGlCoreRenderer.js';
import type { BufferCollection } from './internal/BufferCollection.js';
import {
  createProgram,
  createShader,
  type ShaderSource,
  DefaultVertexSource,
} from './internal/ShaderUtils.js';

export type WebGlShaderLifecycle = {
  /**
   * This function is called before drawing the node, here you can update the uniforms you use in the fragment / vertex shader.
   * @param glw WebGlContextWrapper with utilities to update uniforms, and other actions.
   * @param renderOp containing all information of the render operation that uses this shader
   * @returns
   */
  update?: (glw: WebGlContextWrapper, renderOp: WebGlCoreRenderOp) => void;
  /**
   * This function is used to check if the shader can bereused based on quad info
   * @param props
   * @returns
   */
  canBatch?: (
    renderOpA: WebGlRenderOpProps,
    renderOpB: WebGlRenderOpProps,
  ) => boolean;
};

export type WebGlShaderConfig<T = Record<string, any>> = ShaderConfig<T> &
  WebGlShaderLifecycle & {
    /**
     * fragment shader source for WebGl or WebGl2
     */
    fragment: ShaderSource;
    /**
     * vertex shader source for WebGl or WebGl2
     */
    vertex?: ShaderSource;
    /**
     * extensions required for specific shader?
     */
    webgl1Extensions?: string[];
    webgl2Extensions?: string[];
    supportsIndexedTextures?: boolean;
  };

export interface WebGlShaderBatchMap {
  dimensions: Dimensions;
  alpha: number;
  props: Record<string, unknown>;
}

export class WebGlCoreShader extends CoreShader {
  protected boundBufferCollection: BufferCollection | null = null;
  protected program: WebGLProgram;
  /**
   * Vertex Array Object
   *
   * @remarks
   * Used by WebGL2 Only
   */
  protected vao: WebGLVertexArrayObject | undefined;
  protected renderer: WebGlCoreRenderer;
  protected glw: WebGlContextWrapper;
  protected attributeLocations: Record<string, number>;
  protected lifecycle: WebGlShaderLifecycle;
  protected useSystemAlpha = false;
  protected useSystemDimensions = false;
  supportsIndexedTextures = false;

  constructor(renderer: WebGlCoreRenderer, config: WebGlShaderConfig) {
    super();
    this.renderer = renderer;
    const glw = (this.glw = renderer.glw);

    // Check that extensions are supported
    const webGl2 = glw.isWebGl2();
    let requiredExtensions: string[] = [];

    this.supportsIndexedTextures =
      config.supportsIndexedTextures || this.supportsIndexedTextures;
    requiredExtensions =
      (webGl2 && config.webgl2Extensions) ||
      (!webGl2 && config.webgl1Extensions) ||
      [];

    const glVersion = webGl2 ? '2.0' : '1.0';
    requiredExtensions.forEach((extensionName) => {
      if (!glw.getExtension(extensionName)) {
        throw new Error(
          `Shader "${this.constructor.name}" requires extension "${extensionName}" for WebGL ${glVersion} but wasn't found`,
        );
      }
    });

    const textureUnits =
      renderer.system.parameters.MAX_VERTEX_TEXTURE_IMAGE_UNITS;

    let vertexSource =
      config.vertex instanceof Function
        ? config.vertex(textureUnits)
        : config.vertex;

    if (vertexSource === undefined) {
      vertexSource = DefaultVertexSource;
    }

    const fragmentSource =
      config.fragment instanceof Function
        ? config.fragment(textureUnits)
        : config.fragment;

    const vertexShader = createShader(glw, glw.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(
      glw,
      glw.FRAGMENT_SHADER,
      fragmentSource,
    );
    if (!vertexShader || !fragmentShader) {
      throw new Error();
    }

    const program = createProgram(glw, vertexShader, fragmentShader);
    if (!program) {
      throw new Error();
    }

    this.program = program;
    this.attributeLocations = glw.getAttributeLocations(program);

    this.useSystemAlpha =
      this.glw.getUniformLocation(program, 'u_alpha') !== null;
    this.useSystemDimensions =
      this.glw.getUniformLocation(program, 'u_dimensions') !== null;

    this.lifecycle = {
      update: config.update,
      canBatch: config.canBatch,
    };
  }

  disableAttribute(location: number) {
    this.glw.disableVertexAttribArray(location);
  }

  disableAttributes() {
    const { glw } = this;
    const attribs = Object.keys(this.attributeLocations);
    const attribLen = attribs.length;
    for (let i = 0; i < attribLen; i++) {
      glw.disableVertexAttribArray(i);
    }
  }

  reuseRenderOp(
    renderOpA: WebGlRenderOpProps,
    renderOpB: WebGlRenderOpProps,
  ): boolean {
    const lifecycleCheck = this.lifecycle.canBatch
      ? this.lifecycle.canBatch(renderOpA, renderOpB)
      : true;
    if (!lifecycleCheck) {
      return false;
    }

    if (this.useSystemAlpha) {
      if (renderOpA.alpha !== renderOpB.alpha) {
        return false;
      }
    }

    if (this.useSystemDimensions) {
      if (
        renderOpA.dimensions.width !== renderOpB.dimensions.width ||
        renderOpA.dimensions.height !== renderOpB.dimensions.height
      ) {
        return false;
      }
    }

    if (renderOpA.shaderProps !== null && renderOpB.shaderProps !== null) {
      for (const key in renderOpA) {
        if (
          renderOpA[key as keyof WebGlRenderOpProps] !==
          renderOpB[key as keyof WebGlRenderOpProps]
        ) {
          return false;
        }
      }
    }

    return true;
  }

  bindRenderOp(renderOp: WebGlCoreRenderOp) {
    this.bindBufferCollection(renderOp.buffers);
    this.bindTextures(renderOp.textures);

    const { parentHasRenderTexture, rtt } = renderOp;

    // Skip if the parent and current operation both have render textures
    if (rtt && parentHasRenderTexture) {
      return;
    }

    // Bind render texture framebuffer dimensions as resolution
    // if the parent has a render texture
    if (parentHasRenderTexture) {
      const { width, height } = renderOp.framebufferDimensions;
      // Force pixel ratio to 1.0 for render textures since they are always 1:1
      // the final render texture will be rendered to the screen with the correct pixel ratio
      this.glw.uniform1f('u_pixelRatio', 1.0);

      // Set resolution to the framebuffer dimensions
      this.glw.uniform2f('u_resolution', width ?? 0, height ?? 0);
    } else {
      this.glw.uniform1f('u_pixelRatio', renderOp.renderer.options.pixelRatio);
      this.glw.uniform2f(
        'u_resolution',
        this.glw.canvas.width,
        this.glw.canvas.height,
      );
    }

    if (this.useSystemAlpha) {
      this.glw.uniform1f('u_alpha', renderOp.alpha);
    }

    if (this.useSystemDimensions) {
      this.glw.uniform2f(
        'u_dimensions',
        renderOp.dimensions.width,
        renderOp.dimensions.height,
      );
    }

    if (renderOp.shaderProps !== null && this.lifecycle.update !== undefined) {
      this.lifecycle.update(this.glw, renderOp);
    }
  }

  bindBufferCollection(buffer: BufferCollection) {
    const { glw } = this;
    const attribs = Object.keys(this.attributeLocations);
    const attribLen = attribs.length;

    for (let i = 0; i < attribLen; i++) {
      const name = attribs[i]!;
      const resolvedBuffer = buffer.getBuffer(name);
      const resolvedInfo = buffer.getAttributeInfo(name);
      if (!resolvedBuffer || !resolvedInfo) {
        continue;
      }
      glw.enableVertexAttribArray(i);
      glw.vertexAttribPointer(
        resolvedBuffer,
        i,
        resolvedInfo.size,
        resolvedInfo.type,
        resolvedInfo.normalized,
        resolvedInfo.stride,
        resolvedInfo.offset,
      );
    }
  }

  bindTextures(textures: WebGlCoreCtxTexture[]) {
    this.glw.activeTexture(0);
    this.glw.bindTexture(textures[0]!.ctxTexture);
  }

  override attach(): void {
    this.glw.useProgram(this.program);
    if (this.glw.isWebGl2() && this.vao) {
      this.glw.bindVertexArray(this.vao);
    }
  }

  override detach(): void {
    this.disableAttributes();
  }
}
