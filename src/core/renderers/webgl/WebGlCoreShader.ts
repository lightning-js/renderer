import { CoreShader } from '../CoreShader.js';
import type { WebGlCoreCtxTexture } from './WebGlCoreCtxTexture.js';
import type { WebGlCoreRenderOp } from './WebGlCoreRenderOp.js';
import type { WebGlCoreRenderer } from './WebGlCoreRenderer.js';
import {
  createProgram,
  createShader,
  type AttributeInfo,
  type ShaderOptions,
  type UniformInfo,
  type UniformMethodMap,
  type UniformTupleToMap,
  type ShaderProgramSources,
} from './internal/ShaderUtils.js';
import { isWebGl2 } from './internal/WebGlUtils.js';

export abstract class WebGlCoreShader<
  Attributes extends string = string,
  Uniforms extends [
    { name: 'u_resolution'; uniform: 'uniform2f' },
    ...UniformInfo[],
  ] = [{ name: 'u_resolution'; uniform: 'uniform2f' }],
> extends CoreShader {
  protected program: WebGLProgram;
  /**
   * Vertex Array Object
   *
   * @remarks
   * Used by WebGL2 Only
   */
  protected vao: WebGLVertexArrayObject | undefined;
  protected renderer: WebGlCoreRenderer;
  protected gl: WebGLRenderingContext;
  protected attributeBuffers: Record<Attributes, WebGLBuffer>;
  protected attributeLocations: Record<Attributes, number>;
  protected attributeInfos: Record<Attributes, AttributeInfo>;
  protected uniformLocations: Record<
    Uniforms[number]['name'],
    WebGLUniformLocation
  >;
  protected uniformTypes: Record<
    Uniforms[number]['name'],
    keyof UniformMethodMap
  >;
  readonly supportsIndexedTextures: boolean;

  constructor(options: ShaderOptions<Uniforms>) {
    super();
    const renderer = (this.renderer = options.renderer);
    const gl = (this.gl = this.renderer.gl);
    this.supportsIndexedTextures = options.supportsIndexedTextures || false;

    // Check that extensions are supported
    const webGl2 = isWebGl2(gl);
    const requiredExtensions =
      (webGl2 && options.webgl2Extensions) ||
      (!webGl2 && options.webgl1Extensions) ||
      [];
    const glVersion = webGl2 ? '2.0' : '1.0';
    requiredExtensions.forEach((extensionName) => {
      if (!gl.getExtension(extensionName)) {
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
    const shaderSources = (this.constructor as typeof WebGlCoreShader)
      .shaderSources;
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

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertexShader || !fragmentShader) {
      throw new Error();
    }

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) {
      throw new Error();
    }
    this.program = program;

    if (webGl2) {
      const vao = gl.createVertexArray();
      if (!vao) {
        throw new Error();
      }
      this.vao = vao;

      gl.bindVertexArray(this.vao);
    }

    this.attributeLocations = {} as Record<Attributes, number>;
    this.attributeBuffers = {} as Record<Attributes, number>;
    this.attributeInfos = {} as Record<Attributes, AttributeInfo>;
    [...options.attributes].forEach((attributeInfo) => {
      const location = gl.getAttribLocation(this.program, attributeInfo.name);
      if (location < 0) {
        throw new Error(
          `Vertex shader must have an attribute "${attributeInfo.name}"!`,
        );
      }
      const buffer = gl.createBuffer();
      if (!buffer) {
        throw new Error(
          `Could not create buffer for attribute "${attributeInfo.name}"`,
        );
      }

      // Bind buffer/attributes to VAO (WebGL2 only)
      if (isWebGl2(this.gl)) {
        this._bindBufferAttributes(location, buffer, attributeInfo);
      }

      this.attributeLocations[attributeInfo.name as Attributes] = location;
      this.attributeBuffers[attributeInfo.name as Attributes] = buffer;
      this.attributeInfos[attributeInfo.name as Attributes] = attributeInfo;
    });

    this.uniformLocations = {} as Record<
      Uniforms[number]['name'],
      WebGLRenderingContext
    >;
    this.uniformTypes = {} as Record<
      Uniforms[number]['name'],
      keyof UniformMethodMap
    >;
    options.uniforms.forEach((uniform: UniformInfo) => {
      const location = gl.getUniformLocation(this.program, uniform.name);
      this.uniformTypes[uniform.name as Uniforms[number]['name']] =
        uniform.uniform;
      if (!location) {
        console.warn(
          `Shader "${this.constructor.name}" could not get uniform location for "${uniform.name}"`,
        );
        return;
      }
      this.uniformLocations[uniform.name as Uniforms[number]['name']] =
        location;
    });
  }

  private _bindBufferAttributes(
    location: number,
    buffer: WebGLBuffer,
    attribute: AttributeInfo,
  ) {
    const gl = this.gl;
    gl.enableVertexAttribArray(location);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    gl.vertexAttribPointer(
      location,
      attribute.size,
      attribute.type,
      attribute.normalized,
      attribute.stride,
      attribute.offset,
    );
  }

  bindRenderOp(renderOp: WebGlCoreRenderOp) {
    this.bindBuffer(renderOp.quadWebGlBuffer);
    if (renderOp.textures.length > 0) {
      this.bindTextures(renderOp.textures);
    }
    this.bindUniforms(renderOp);
  }

  setUniform<T extends keyof UniformTupleToMap<Uniforms>>(
    name: T,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: UniformTupleToMap<Uniforms>[T] extends [...any[]]
      ? UniformTupleToMap<Uniforms>[T]
      : never
  ): void {
    // @ts-expect-error Typing of args is too funky apparently for TS
    this.gl[this.uniformTypes[name]](this.uniformLocations[name], ...args);
  }

  bindBuffer(buffer: WebGLBuffer) {
    for (const loc in this.attributeLocations) {
      const resolvedBuffer = buffer || this.attributeBuffers[loc];
      this._bindBufferAttributes(
        this.attributeLocations[loc],
        resolvedBuffer,
        this.attributeInfos[loc],
      );
    }
  }

  bindTextures(textures: WebGlCoreCtxTexture[]) {
    //no defaults
  }

  bindUniforms(renderOp: WebGlCoreRenderOp) {
    const { gl } = renderOp;
    // @ts-expect-error to be fixed
    this.setUniform('u_resolution', gl.canvas.width, gl.canvas.height);
  }

  useProgram() {
    this.gl.useProgram(this.program);
    if (isWebGl2(this.gl) && this.vao) {
      this.gl.bindVertexArray(this.vao);
    }
  }

  protected static shaderSources?: ShaderProgramSources;
}
