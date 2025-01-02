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

import type { CoreNode } from '../../CoreNode.js';
import type { WebGlContextWrapper } from '../../lib/WebGlContextWrapper.js';
import type { QuadOptions } from '../CoreRenderer.js';
import type { CoreShaderType } from '../CoreShaderNode.js';
import type { CoreShaderProgram } from '../CoreShaderProgram.js';
import type { WebGlCoreCtxTexture } from './WebGlCoreCtxTexture.js';
import type { WebGlCoreRenderOp } from './WebGlCoreRenderOp.js';
import type { WebGlCoreRenderer } from './WebGlCoreRenderer.js';
import type { WebGlShaderNode } from './WebGlShaderNode.js';
import type { BufferCollection } from './internal/BufferCollection.js';
import {
  createProgram,
  createShader,
  DefaultVertexSource,
  type UniformSet1Param,
  type UniformSet2Params,
  type UniformSet3Params,
  type UniformSet4Params,
} from './internal/ShaderUtils.js';

type ShaderSource<T> =
  | string
  | ((renderer: WebGlCoreRenderer, props: T) => string);

export type WebGlShaderType<T extends object = Record<string, unknown>> =
  CoreShaderType<T> & {
    /**
     * fragment shader source for WebGl or WebGl2
     */
    fragment: ShaderSource<T>;
    /**
     * vertex shader source for WebGl or WebGl2
     */
    vertex?: ShaderSource<T>;
    /**
     * This function is called when one of the props is changed, here you can update the uniforms you use in the fragment / vertex shader.
     * @param node WebGlContextWrapper with utilities to update uniforms, and other actions.
     * @returns
     */
    update?: (this: WebGlShaderNode<T>, node: CoreNode) => void;
    /**
     * This function is used to check if the shader can bereused based on quad info
     * @param props
     * @returns
     */
    canBatch?: (renderOpA: QuadOptions, renderOpB: QuadOptions) => boolean;
    /**
     * extensions required for specific shader?
     */
    webgl1Extensions?: string[];
    webgl2Extensions?: string[];
    supportsIndexedTextures?: boolean;
  };

export class WebGlShaderProgram implements CoreShaderProgram {
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
  protected lifecycle: Pick<WebGlShaderType, 'update' | 'canBatch'>;
  protected useSystemAlpha = false;
  protected useSystemDimensions = false;
  supportsIndexedTextures = false;

  constructor(
    renderer: WebGlCoreRenderer,
    config: WebGlShaderType,
    resolvedProps: Record<string, any>,
  ) {
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

    let vertexSource =
      config.vertex instanceof Function
        ? config.vertex(renderer, resolvedProps)
        : config.vertex;

    if (vertexSource === undefined) {
      vertexSource = DefaultVertexSource;
    }

    const fragmentSource =
      config.fragment instanceof Function
        ? config.fragment(renderer, resolvedProps)
        : config.fragment;

    const vertexShader = createShader(glw, glw.VERTEX_SHADER, vertexSource);
    if (!vertexShader) {
      throw new Error('Vertex shader creation failed');
    }

    const fragmentShader = createShader(
      glw,
      glw.FRAGMENT_SHADER,
      fragmentSource,
    );

    if (!fragmentShader) {
      throw new Error('fragment shader creation failed');
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

  reuseRenderOp(renderOpA: QuadOptions, renderOpB: QuadOptions): boolean {
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
        renderOpA.width !== renderOpB.width ||
        renderOpA.height !== renderOpB.height
      ) {
        return false;
      }
    }

    const shaderPropsA = renderOpA.shader?.getResolvedProps();
    const shaderPropsB = renderOpB.shader?.getResolvedProps();
    if (shaderPropsA !== undefined && shaderPropsB !== undefined) {
      for (const key in shaderPropsA) {
        if (shaderPropsA[key] !== shaderPropsB[key]) {
          return false;
        }
      }
    }

    return true;
  }

  bindRenderOp(renderOp: WebGlCoreRenderOp) {
    this.bindBufferCollection(renderOp.buffers);
    this.bindTextures(renderOp.textures);

    const { parentHasRenderTexture } = renderOp.quad;

    // Skip if the parent and current operation both have render textures
    if (renderOp.quad.rtt && parentHasRenderTexture) {
      return;
    }

    // Bind render texture framebuffer dimensions as resolution
    // if the parent has a render texture
    if (parentHasRenderTexture) {
      const { width, height } = renderOp.quad.framebufferDimensions!;
      // Force pixel ratio to 1.0 for render textures since they are always 1:1
      // the final render texture will be rendered to the screen with the correct pixel ratio
      this.glw.uniform1f('u_pixelRatio', 1.0);

      // Set resolution to the framebuffer dimensions
      this.glw.uniform2f('u_resolution', width, height);
    } else {
      this.glw.uniform1f('u_pixelRatio', renderOp.renderer.options.pixelRatio);
      this.glw.uniform2f(
        'u_resolution',
        this.glw.canvas.width,
        this.glw.canvas.height,
      );
    }

    if (this.useSystemAlpha) {
      this.glw.uniform1f('u_alpha', renderOp.quad.alpha);
    }

    if (this.useSystemDimensions) {
      this.glw.uniform2f(
        'u_dimensions',
        renderOp.quad.width,
        renderOp.quad.height,
      );
    }

    for (const key in renderOp.shader.uniforms.single) {
      const { method, value } = renderOp.shader.uniforms.single[key]!;
      this.glw[method as keyof UniformSet1Param](key, value as never);
    }

    for (const key in renderOp.shader.uniforms.vec2) {
      const { method, value } = renderOp.shader.uniforms.vec2[key]!;
      this.glw[method as keyof UniformSet2Params](key, value[0], value[1]);
    }

    for (const key in renderOp.shader.uniforms.vec3) {
      const { method, value } = renderOp.shader.uniforms.vec3[key]!;
      this.glw[method as keyof UniformSet3Params](
        key,
        value[0],
        value[1],
        value[2],
      );
    }

    for (const key in renderOp.shader.uniforms.vec4) {
      const { method, value } = renderOp.shader.uniforms.vec4[key]!;
      this.glw[method as keyof UniformSet4Params](
        key,
        value[0],
        value[1],
        value[2],
        value[3],
      );
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

  attach(): void {
    this.glw.useProgram(this.program);
    if (this.glw.isWebGl2() && this.vao) {
      this.glw.bindVertexArray(this.vao);
    }
  }

  detach(): void {
    this.disableAttributes();
  }
}
