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
import type { WebGlContextWrapper } from '../../lib/WebGlContextWrapper.js';
import { Default } from '../../shaders/webgl/Default.js';
import type { QuadOptions } from '../CoreRenderer.js';
import type { CoreShaderProgram } from '../CoreShaderProgram.js';
import type { WebGlCtxTexture } from './WebGlCtxTexture.js';
import type { WebGlRenderOp } from './WebGlRenderOp.js';
import type { WebGlRenderer } from './WebGlRenderer.js';
import type { WebGlShaderType } from './WebGlShaderNode.js';
import type { BufferCollection } from './internal/BufferCollection.js';
import {
  createProgram,
  createShader,
  type UniformSet1Param,
  type UniformSet2Params,
  type UniformSet3Params,
  type UniformSet4Params,
} from './internal/ShaderUtils.js';

export class WebGlShaderProgram implements CoreShaderProgram {
  protected program: WebGLProgram | null;
  /**
   * Vertex Array Object
   *
   * @remarks
   * Used by WebGL2 Only
   */
  protected vao: WebGLVertexArrayObject | undefined;
  protected renderer: WebGlRenderer;
  protected glw: WebGlContextWrapper;
  protected attributeLocations: Record<string, number>;
  protected uniformLocations: Record<string, WebGLUniformLocation> | null;
  protected lifecycle: Pick<WebGlShaderType, 'update' | 'canBatch'>;
  protected useSystemAlpha = false;
  protected useSystemDimensions = false;
  public isDestroyed = false;
  supportsIndexedTextures = false;

  constructor(
    renderer: WebGlRenderer,
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
      vertexSource = Default.vertex as string;
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

    const uniLocs = (this.uniformLocations = glw.getUniformLocations(program));

    this.useSystemAlpha = uniLocs['u_alpha'] !== undefined;
    this.useSystemDimensions = uniLocs['u_dimensions'] !== undefined;

    this.lifecycle = {
      update: config.update,
      canBatch: config.canBatch,
    };
  }

  disableAttribute(location: number) {
    this.glw.disableVertexAttribArray(location);
  }

  disableAttributes() {
    const glw = this.glw;
    const attribs = Object.keys(this.attributeLocations);
    const attribLen = attribs.length;
    for (let i = 0; i < attribLen; i++) {
      glw.disableVertexAttribArray(i);
    }
  }

  reuseRenderOp(
    incomingQuad: QuadOptions,
    currentRenderOp: WebGlRenderOp,
  ): boolean {
    if (this.lifecycle.canBatch !== undefined) {
      return this.lifecycle.canBatch(incomingQuad, currentRenderOp);
    }

    if (this.useSystemAlpha === true) {
      if (incomingQuad.alpha !== currentRenderOp.alpha) {
        return false;
      }
    }

    if (this.useSystemDimensions === true) {
      if (
        incomingQuad.w !== currentRenderOp.w ||
        incomingQuad.h !== currentRenderOp.h
      ) {
        return false;
      }
    }
    let shaderPropsA: Record<string, unknown> | undefined = undefined;
    let shaderPropsB: Record<string, unknown> | undefined = undefined;

    if (incomingQuad.shader !== null) {
      shaderPropsA = incomingQuad.shader.resolvedProps;
    }
    if (currentRenderOp.shader !== null) {
      shaderPropsB = currentRenderOp.shader.resolvedProps;
    }

    if (
      (shaderPropsA === undefined && shaderPropsB !== undefined) ||
      (shaderPropsA !== undefined && shaderPropsB === undefined)
    ) {
      return false;
    }

    if (shaderPropsA !== undefined && shaderPropsB !== undefined) {
      for (const key in shaderPropsA) {
        if (shaderPropsA[key] !== shaderPropsB[key]) {
          return false;
        }
      }
    }

    return true;
  }

  bindRenderOp(renderOp: WebGlRenderOp) {
    this.bindBufferCollection(renderOp.buffers);
    this.bindTextures(renderOp.textures);

    const { parentHasRenderTexture } = renderOp;

    // Skip if the parent and current operation both have render textures
    if (renderOp.rtt === true && parentHasRenderTexture === true) {
      return;
    }

    // Bind render texture framebuffer dimensions as resolution
    // if the parent has a render texture
    if (parentHasRenderTexture === true) {
      const { w, h } = renderOp.framebufferDimensions!;
      // Force pixel ratio to 1.0 for render textures since they are always 1:1
      // the final render texture will be rendered to the screen with the correct pixel ratio
      this.glw.uniform1f('u_pixelRatio', 1.0);

      // Set resolution to the framebuffer dimensions
      this.glw.uniform2f('u_resolution', w, h);
    } else {
      this.glw.uniform1f('u_pixelRatio', renderOp.renderer.stage.pixelRatio);
      this.glw.uniform2f('u_resolution', this.glw.canvas.w, this.glw.canvas.h);
    }

    if (this.useSystemAlpha === true) {
      this.glw.uniform1f('u_alpha', renderOp.alpha);
    }

    if (this.useSystemDimensions === true) {
      this.glw.uniform2f('u_dimensions', renderOp.w, renderOp.h);
    }

    /**temporary fix to make sdf texts work */
    if (renderOp.sdfShaderProps !== undefined) {
      (renderOp.shader.shaderType as WebGlShaderType).onSdfBind?.call(
        this.glw,
        renderOp.sdfShaderProps,
      );
      return;
    }

    if (renderOp.shader.props !== undefined) {
      /**
       * loop over all precalculated uniform types
       */
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
  }

  bindBufferCollection(buffer: BufferCollection) {
    const { glw } = this;
    const attribs = Object.keys(this.attributeLocations);
    const attribLen = attribs.length;

    for (let i = 0; i < attribLen; i++) {
      const name = attribs[i]!;
      const resolvedBuffer = buffer.getBuffer(name);
      const resolvedInfo = buffer.getAttributeInfo(name);
      if (resolvedBuffer === undefined || resolvedInfo === undefined) {
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

  bindTextures(textures: WebGlCtxTexture[]) {
    this.glw.activeTexture(0);
    this.glw.bindTexture(textures[0]!.ctxTexture);
  }

  attach(): void {
    if (this.isDestroyed === true) {
      return;
    }
    this.glw.useProgram(this.program, this.uniformLocations!);
    if (this.glw.isWebGl2() && this.vao) {
      this.glw.bindVertexArray(this.vao);
    }
  }

  detach(): void {
    this.disableAttributes();
  }

  destroy() {
    if (this.isDestroyed === true) {
      return;
    }
    const glw = this.glw;

    this.detach();

    glw.deleteProgram(this.program!);
    this.program = null;
    this.uniformLocations = null;

    const attribs = Object.keys(this.attributeLocations);
    const attribLen = attribs.length;
    for (let i = 0; i < attribLen; i++) {
      this.glw.deleteBuffer(attribs[i]!);
    }
  }
}
