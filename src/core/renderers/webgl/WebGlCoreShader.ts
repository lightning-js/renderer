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
import { assertTruthy, hasOwn } from '../../../utils.js';
import type { WebGlContextWrapper } from '../../lib/WebGlContextWrapper.js';
import { CoreShader } from '../CoreShader.js';
import type { WebGlCoreCtxTexture } from './WebGlCoreCtxTexture.js';
import type { WebGlCoreRenderOp } from './WebGlCoreRenderOp.js';
import type { WebGlCoreRenderer } from './WebGlCoreRenderer.js';
import type { BufferCollection } from './internal/BufferCollection.js';
import {
  createProgram,
  createShader,
  type AttributeInfo,
  type ShaderOptions,
  type UniformInfo,
  type UniformMethodMap,
  type ShaderProgramSources,
} from './internal/ShaderUtils.js';

/**
 * Automatic shader prop for the dimensions of the Node being rendered
 *
 * @remarks
 * Shader's who's rendering depends on the dimensions of the Node being rendered
 * should extend this interface from their Prop interface type.
 */
export interface DimensionsShaderProp {
  /**
   * Dimensions of the Node being rendered (Auto-set by the renderer)
   *
   * @remarks
   * DO NOT SET THIS. It is set automatically by the renderer.
   * Any values set here will be ignored.
   */
  $dimensions?: Dimensions;
}

export interface AlphaShaderProp {
  /**
   * Alpha of the Node being rendered (Auto-set by the renderer)
   *
   * @remarks
   * DO NOT SET THIS. It is set automatically by the renderer.
   * Any values set here will be ignored.
   */
  $alpha?: number;
}

export abstract class WebGlCoreShader extends CoreShader {
  protected boundBufferCollection: BufferCollection | null = null;
  protected buffersBound = false;
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
  protected attributeBuffers: Record<string, WebGLBuffer>;
  protected attributeLocations: Record<string, number>;
  protected attributeNames: string[];
  protected uniformLocations: Record<string, WebGLUniformLocation>;
  protected uniformTypes: Record<string, keyof UniformMethodMap>;
  readonly supportsIndexedTextures: boolean;

  constructor(options: ShaderOptions) {
    super();
    const renderer = (this.renderer = options.renderer);
    const glw = (this.glw = this.renderer.glw);
    this.supportsIndexedTextures = options.supportsIndexedTextures || false;

    // Check that extensions are supported
    const webGl2 = glw.isWebGl2();
    const requiredExtensions =
      (webGl2 && options.webgl2Extensions) ||
      (!webGl2 && options.webgl1Extensions) ||
      [];
    const glVersion = webGl2 ? '2.0' : '1.0';
    requiredExtensions.forEach((extensionName) => {
      if (!glw.getExtension(extensionName)) {
        throw new Error(
          `Shader "${this.constructor.name}" requires extension "${extensionName}" for WebGL ${glVersion} but wasn't found`,
        );
      }
    });

    // Gather shader sources
    // - If WebGL 2 and special WebGL 2 sources are provided, we copy those sources and delete
    // the extra copy of them to save memory.
    // TODO: This could be further made optimal by just caching the compiled shaders and completely deleting
    // the source code
    const shaderSources =
      options.shaderSources ||
      (this.constructor as typeof WebGlCoreShader).shaderSources;
    if (!shaderSources) {
      throw new Error(
        `Shader "${this.constructor.name}" is missing shaderSources.`,
      );
    } else if (webGl2 && shaderSources?.webGl2) {
      shaderSources.fragment = shaderSources.webGl2.fragment;
      shaderSources.vertex = shaderSources.webGl2.vertex;
      delete shaderSources.webGl2;
    }

    const textureUnits =
      renderer.system.parameters.MAX_VERTEX_TEXTURE_IMAGE_UNITS;

    const vertexSource =
      shaderSources.vertex instanceof Function
        ? shaderSources.vertex(textureUnits)
        : shaderSources.vertex;

    const fragmentSource =
      shaderSources.fragment instanceof Function
        ? shaderSources.fragment(textureUnits)
        : shaderSources.fragment;

    const vertexShader = createShader(glw, glw.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(
      glw,
      glw.FRAGMENT_SHADER,
      fragmentSource,
    );

    if (!vertexShader || !fragmentShader) {
      throw new Error(
        `Unable to create the following shader(s): ${[
          !vertexShader && 'VERTEX_SHADER',
          !fragmentShader && 'FRAGMENT_SHADER',
        ]
          .filter(Boolean)
          .join(' and ')}`,
      );
    }

    const program = createProgram(glw, vertexShader, fragmentShader);
    if (!program) {
      throw new Error('Unable to create program');
    }
    this.program = program;

    this.attributeLocations = {} as Record<string, number>;
    this.attributeBuffers = {} as Record<string, number>;
    this.attributeNames = [];

    [...options.attributes].forEach((attributeName) => {
      const location = glw.getAttribLocation(this.program, attributeName);
      if (location < 0) {
        throw new Error(
          `${this.constructor.name}: Vertex shader must have an attribute "${attributeName}"!`,
        );
      }
      const buffer = glw.createBuffer();
      if (!buffer) {
        throw new Error(
          `${this.constructor.name}: Could not create buffer for attribute "${attributeName}"`,
        );
      }

      this.attributeLocations[attributeName] = location;
      this.attributeBuffers[attributeName] = buffer;
      this.attributeNames.push(attributeName);
    });

    this.uniformLocations = {} as Record<string, WebGLRenderingContext>;
    this.uniformTypes = {} as Record<string, keyof UniformMethodMap>;
    options.uniforms.forEach((uniform: UniformInfo) => {
      const location = glw.getUniformLocation(this.program, uniform.name);
      this.uniformTypes[uniform.name] = uniform.uniform;
      if (!location) {
        console.warn(
          `Shader "${this.constructor.name}" could not get uniform location for "${uniform.name}"`,
        );
        return;
      }
      this.uniformLocations[uniform.name] = location;
    });
  }

  private bindBufferAttribute(
    location: number,
    buffer: WebGLBuffer,
    attribute: AttributeInfo,
  ) {
    const { glw } = this;
    glw.enableVertexAttribArray(location);

    glw.vertexAttribPointer(
      buffer,
      location,
      attribute.size,
      attribute.type,
      attribute.normalized,
      attribute.stride,
      attribute.offset,
    );
  }

  disableAttribute(location: number) {
    this.glw.disableVertexAttribArray(location);
  }

  disableAttributes() {
    for (const loc in this.attributeLocations) {
      this.disableAttribute(this.attributeLocations[loc] as number);
    }
    this.boundBufferCollection = null;
  }

  /**
   * Given two sets of Shader props destined for this Shader, determine if they can be batched together
   * to reduce the number of draw calls.
   *
   * @remarks
   * This is used by the {@link WebGlCoreRenderer} to determine if it can batch multiple consecutive draw
   * calls into a single draw call.
   *
   * By default, this returns false (meaning no batching is allowed), but can be
   * overridden by child classes to provide more efficient batching.
   *
   * @param propsA
   * @param propsB
   * @returns
   */
  canBatchShaderProps(
    propsA: Record<string, unknown>,
    propsB: Record<string, unknown>,
  ): boolean {
    return false;
  }

  bindRenderOp(
    renderOp: WebGlCoreRenderOp,
    props: Record<string, unknown> | null,
  ) {
    this.bindBufferCollection(renderOp.buffers);
    if (renderOp.textures.length > 0) {
      this.bindTextures(renderOp.textures);
    }

    const { glw, parentHasRenderTexture, renderToTexture } = renderOp;

    // Skip if the parent and current operation both have render textures
    if (renderToTexture && parentHasRenderTexture) {
      return;
    }

    // Bind render texture framebuffer dimensions as resolution
    // if the parent has a render texture
    if (parentHasRenderTexture) {
      const { width, height } = renderOp.framebufferDimensions || {};
      // Force pixel ratio to 1.0 for render textures since they are always 1:1
      // the final render texture will be rendered to the screen with the correct pixel ratio
      glw.uniform1f(this.getUniformLocation('u_pixelRatio'), 1.0);

      // Set resolution to the framebuffer dimensions
      glw.uniform2f(
        this.getUniformLocation('u_resolution'),
        width ?? 0,
        height ?? 0,
      );
    } else {
      glw.uniform1f(
        this.getUniformLocation('u_pixelRatio'),
        renderOp.options.pixelRatio,
      );
      glw.uniform2f(
        this.getUniformLocation('u_resolution'),
        glw.canvas.width,
        glw.canvas.height,
      );
    }

    if (props) {
      // Bind optional automatic uniforms
      // These are only bound if their keys are present in the props.
      if (hasOwn(props, '$dimensions')) {
        let dimensions = props.$dimensions as Dimensions | null;
        if (!dimensions) {
          dimensions = renderOp.dimensions;
        }
        glw.uniform2f(
          this.getUniformLocation('u_dimensions'),
          dimensions.width,
          dimensions.height,
        );
      }
      if (hasOwn(props, '$alpha')) {
        let alpha = props.$alpha as number | null;
        if (!alpha) {
          alpha = renderOp.alpha;
        }
        glw.uniform1f(this.getUniformLocation('u_alpha'), alpha);
      }
      this.bindProps(props);
    }
  }

  getUniformLocation(name: string): WebGLUniformLocation | null {
    return this.uniformLocations[name] || null;
  }

  bindBufferCollection(buffer: BufferCollection) {
    if (this.boundBufferCollection === buffer) {
      return;
    }
    for (const attributeName in this.attributeLocations) {
      const resolvedBuffer = buffer.getBuffer(attributeName);
      const resolvedInfo = buffer.getAttributeInfo(attributeName);
      assertTruthy(resolvedBuffer, `Buffer for "${attributeName}" not found`);
      assertTruthy(resolvedInfo);
      this.bindBufferAttribute(
        this.attributeLocations[attributeName]!,
        resolvedBuffer,
        resolvedInfo,
      );
    }
    this.boundBufferCollection = buffer;
  }

  protected override bindProps(props: Record<string, unknown>) {
    // Implement in child class
  }

  bindTextures(textures: WebGlCoreCtxTexture[]) {
    // no defaults
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

  /**
   * Destroys this shader and cleans up all WebGL resources.
   *
   * @remarks
   * This method will delete the WebGL program, all attribute buffers, and the VAO if one exists.
   * It must be called when the shader is no longer needed to prevent memory leaks.
   */
  destroy(): void {
    const { glw } = this;

    // Detach first to disable all attributes
    this.detach();

    // Delete all attribute buffers
    for (const attributeName in this.attributeBuffers) {
      const buffer = this.attributeBuffers[attributeName];
      if (buffer) {
        glw.deleteBuffer(buffer);
      }
    }

    // Delete VAO if it exists (WebGL2 only)
    if (this.vao !== undefined && glw.isWebGl2() === true) {
      glw.deleteVertexArray(this.vao);
      this.vao = undefined;
    }

    // Delete the program
    if (this.program) {
      glw.deleteProgram(this.program);
    }

    this.program = null as unknown as WebGLProgram;

    // Clear references
    this.attributeBuffers = {} as Record<string, WebGLBuffer>;
    this.attributeLocations = {} as Record<string, number>;
    this.uniformLocations = {} as Record<string, WebGLUniformLocation>;
    this.uniformTypes = {} as Record<string, keyof UniformMethodMap>;
    this.boundBufferCollection = null;
    this.glw = null as unknown as WebGlContextWrapper;
    this.renderer = null as unknown as WebGlCoreRenderer;

    // Mark the shader as destroyed
    this.isDestroyed = true;
  }

  protected static shaderSources?: ShaderProgramSources;
}
