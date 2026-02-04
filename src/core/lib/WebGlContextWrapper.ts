/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { assertTruthy, isProductionEnvironment } from '../../utils.js';
import type {
  Vec2,
  Vec3,
  Vec4,
} from '../renderers/webgl/internal/ShaderUtils.js';
import { isWebGl2 } from '../renderers/webgl/internal/WebGlUtils.js';

/**
 * Optimized WebGL Context Wrapper
 *
 * @remarks
 * This class contains the subset of the WebGLRenderingContext & WebGL2RenderingContext
 * API that is used by the renderer. Select high volume WebGL methods include
 * caching optimizations to avoid making WebGL calls if the state is already set
 * to the desired value.
 *
 * While most methods contained are direct passthroughs to the WebGL context,
 * some methods combine multiple WebGL calls into one for convenience, modify
 * arguments to be more convenient, or are replaced by more specific methods.
 *
 * Not all methods are optimized. Only methods that are called frequently
 * and/or have a high cost are optimized.
 *
 * A subset of GLenum constants are also exposed as properties on this class
 * for convenience.
 */
export class WebGlContextWrapper {
  //#region Cached WebGL State
  private activeTextureUnit = 0;
  private texture2dUnits: Array<WebGLTexture | null>;
  private texture2dParams: WeakMap<
    WebGLTexture,
    Record<number, number | undefined>
  > = new WeakMap();
  private scissorEnabled;
  private scissorX: number;
  private scissorY: number;
  private scissorWidth: number;
  private scissorHeight: number;
  private blendEnabled;
  private blendSrcRgb: number;
  private blendDstRgb: number;
  private blendSrcAlpha: number;
  private blendDstAlpha: number;
  private boundArrayBuffer: WebGLBuffer | null;
  private boundElementArrayBuffer: WebGLBuffer | null;
  private curProgram: WebGLProgram | null;
  private curUniformLocations: Record<string, WebGLUniformLocation> = {};
  //#endregion Cached WebGL State

  //#region Canvas
  public readonly canvas;
  //#endregion Canvas

  //#region WebGL Enums
  public readonly MAX_RENDERBUFFER_SIZE;
  public readonly MAX_TEXTURE_SIZE;
  public readonly MAX_VIEWPORT_DIMS;
  public readonly MAX_VERTEX_TEXTURE_IMAGE_UNITS;
  public readonly MAX_TEXTURE_IMAGE_UNITS;
  public readonly MAX_COMBINED_TEXTURE_IMAGE_UNITS;
  public readonly MAX_VERTEX_ATTRIBS;
  public readonly MAX_VARYING_VECTORS;
  public readonly MAX_VERTEX_UNIFORM_VECTORS;
  public readonly MAX_FRAGMENT_UNIFORM_VECTORS;
  public readonly TEXTURE_MAG_FILTER;
  public readonly TEXTURE_MIN_FILTER;
  public readonly TEXTURE_WRAP_S;
  public readonly TEXTURE_WRAP_T;
  public readonly LINEAR;
  public readonly LINEAR_MIPMAP_LINEAR;
  public readonly CLAMP_TO_EDGE;
  public readonly RGB;
  public readonly RGBA;
  public readonly UNSIGNED_BYTE;
  public readonly UNPACK_PREMULTIPLY_ALPHA_WEBGL;
  public readonly UNPACK_FLIP_Y_WEBGL;
  public readonly FLOAT;
  public readonly TRIANGLES;
  public readonly UNSIGNED_SHORT;
  public readonly ONE;
  public readonly ONE_MINUS_SRC_ALPHA;
  public readonly VERTEX_SHADER;
  public readonly FRAGMENT_SHADER;
  public readonly STATIC_DRAW;
  public readonly COMPILE_STATUS;
  public readonly LINK_STATUS;
  public readonly DYNAMIC_DRAW;
  public readonly COLOR_ATTACHMENT0;
  public readonly INVALID_ENUM: number;
  public readonly INVALID_OPERATION: number;
  //#endregion WebGL Enums

  constructor(private gl: WebGLRenderingContext | WebGL2RenderingContext) {
    // The following code extracts the current state of the WebGL context
    // to our local JavaScript cached version of it. This is so we can
    // avoid making WebGL calls if we don't need to.
    // We could assume that the WebGL context is in a default state, but
    // in the future we may want to support restoring a broken WebGL context
    // and this will help with that.
    this.activeTextureUnit =
      (gl.getParameter(gl.ACTIVE_TEXTURE) as number) - gl.TEXTURE0;
    const maxTextureUnits = gl.getParameter(
      gl.MAX_TEXTURE_IMAGE_UNITS,
    ) as number;
    // save current texture units
    this.texture2dUnits = new Array<undefined>(maxTextureUnits)
      .fill(undefined)
      .map((_, i) => {
        this.activeTexture(i);
        return gl.getParameter(gl.TEXTURE_BINDING_2D) as WebGLTexture;
      });
    // restore active texture unit
    this.activeTexture(this.activeTextureUnit);
    this.scissorEnabled = gl.isEnabled(gl.SCISSOR_TEST);

    const scissorBox = gl.getParameter(gl.SCISSOR_BOX) as [
      number,
      number,
      number,
      number,
    ];
    this.scissorX = scissorBox[0];
    this.scissorY = scissorBox[1];
    this.scissorWidth = scissorBox[2];
    this.scissorHeight = scissorBox[3];

    this.blendEnabled = gl.isEnabled(gl.BLEND);
    this.blendSrcRgb = gl.getParameter(gl.BLEND_SRC_RGB) as number;
    this.blendDstRgb = gl.getParameter(gl.BLEND_DST_RGB) as number;
    this.blendSrcAlpha = gl.getParameter(gl.BLEND_SRC_ALPHA) as number;
    this.blendDstAlpha = gl.getParameter(gl.BLEND_DST_ALPHA) as number;

    this.boundArrayBuffer = gl.getParameter(
      gl.ARRAY_BUFFER_BINDING,
    ) as WebGLBuffer;
    this.boundElementArrayBuffer = gl.getParameter(
      gl.ELEMENT_ARRAY_BUFFER_BINDING,
    ) as WebGLBuffer;

    this.curProgram = gl.getParameter(
      gl.CURRENT_PROGRAM,
    ) as WebGLProgram | null;

    this.canvas = gl.canvas;

    // Extract GLenums
    this.MAX_RENDERBUFFER_SIZE = gl.MAX_RENDERBUFFER_SIZE;
    this.MAX_TEXTURE_SIZE = gl.MAX_TEXTURE_SIZE;
    this.MAX_VIEWPORT_DIMS = gl.MAX_VIEWPORT_DIMS;
    this.MAX_VERTEX_TEXTURE_IMAGE_UNITS = gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS;
    this.MAX_TEXTURE_IMAGE_UNITS = gl.MAX_TEXTURE_IMAGE_UNITS;
    this.MAX_COMBINED_TEXTURE_IMAGE_UNITS = gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS;
    this.MAX_VERTEX_ATTRIBS = gl.MAX_VERTEX_ATTRIBS;
    this.MAX_VARYING_VECTORS = gl.MAX_VARYING_VECTORS;
    this.MAX_VERTEX_UNIFORM_VECTORS = gl.MAX_VERTEX_UNIFORM_VECTORS;
    this.MAX_FRAGMENT_UNIFORM_VECTORS = gl.MAX_FRAGMENT_UNIFORM_VECTORS;
    this.TEXTURE_MAG_FILTER = gl.TEXTURE_MAG_FILTER;
    this.TEXTURE_MIN_FILTER = gl.TEXTURE_MIN_FILTER;
    this.TEXTURE_WRAP_S = gl.TEXTURE_WRAP_S;
    this.TEXTURE_WRAP_T = gl.TEXTURE_WRAP_T;
    this.LINEAR = gl.LINEAR;
    this.LINEAR_MIPMAP_LINEAR = gl.LINEAR_MIPMAP_LINEAR;
    this.CLAMP_TO_EDGE = gl.CLAMP_TO_EDGE;
    this.RGB = gl.RGB;
    this.RGBA = gl.RGBA;
    this.UNSIGNED_BYTE = gl.UNSIGNED_BYTE;
    this.UNPACK_PREMULTIPLY_ALPHA_WEBGL = gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL;
    this.UNPACK_FLIP_Y_WEBGL = gl.UNPACK_FLIP_Y_WEBGL;
    this.FLOAT = gl.FLOAT;
    this.TRIANGLES = gl.TRIANGLES;
    this.UNSIGNED_SHORT = gl.UNSIGNED_SHORT;
    this.ONE = gl.ONE;
    this.ONE_MINUS_SRC_ALPHA = gl.ONE_MINUS_SRC_ALPHA;
    this.MAX_VERTEX_TEXTURE_IMAGE_UNITS = gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS;
    this.TRIANGLES = gl.TRIANGLES;
    this.UNSIGNED_SHORT = gl.UNSIGNED_SHORT;
    this.VERTEX_SHADER = gl.VERTEX_SHADER;
    this.FRAGMENT_SHADER = gl.FRAGMENT_SHADER;
    this.STATIC_DRAW = gl.STATIC_DRAW;
    this.COMPILE_STATUS = gl.COMPILE_STATUS;
    this.LINK_STATUS = gl.LINK_STATUS;
    this.DYNAMIC_DRAW = gl.DYNAMIC_DRAW;
    this.COLOR_ATTACHMENT0 = gl.COLOR_ATTACHMENT0;
    this.INVALID_ENUM = gl.INVALID_ENUM;
    this.INVALID_OPERATION = gl.INVALID_OPERATION;
  }
  /**
   * Returns true if the WebGL context is WebGL2
   *
   * @returns
   */
  isWebGl2() {
    return isWebGl2(this.gl);
  }

  /**
   * ```
   * gl.activeTexture(textureUnit + gl.TEXTURE0);
   * ```
   *
   * @remarks
   * **WebGL Difference**: `textureUnit` is based from 0, not `gl.TEXTURE0`.
   *
   * @param textureUnit
   */
  activeTexture(textureUnit: number) {
    if (this.activeTextureUnit !== textureUnit) {
      this.gl.activeTexture(textureUnit + this.gl.TEXTURE0);
      this.activeTextureUnit = textureUnit;
    }
  }

  /**
   * ```
   * gl.bindTexture(gl.TEXTURE_2D, texture);
   * ```
   * @remarks
   * **WebGL Difference**: Bind target is always `gl.TEXTURE_2D`
   *
   * @param texture
   */
  bindTexture(texture: WebGLTexture | null) {
    if (this.texture2dUnits[this.activeTextureUnit] === texture) {
      return;
    }
    this.texture2dUnits[this.activeTextureUnit] = texture;

    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
  }

  private _getActiveTexture(): WebGLTexture | null {
    return this.texture2dUnits[this.activeTextureUnit]!;
  }

  /**
   * ```
   * gl.texParameteri(gl.TEXTURE_2D, pname, param);
   * ```
   * @remarks
   * **WebGL Difference**: Bind target is always `gl.TEXTURE_2D`
   *
   * @param pname
   * @param param
   * @returns
   */
  texParameteri(pname: number, param: number) {
    const activeTexture = this._getActiveTexture();
    if (!activeTexture) {
      throw new Error('No active texture');
    }
    let textureParams = this.texture2dParams.get(activeTexture);
    if (!textureParams) {
      textureParams = {};
      this.texture2dParams.set(activeTexture, textureParams);
    }
    if (textureParams[pname] === param) {
      return;
    }
    textureParams[pname] = param;
    this.gl.texParameteri(this.gl.TEXTURE_2D, pname, param);
  }

  /**
   * ```
   * gl.texImage2D(
   *   gl.TEXTURE_2D,
   *   level,
   *   internalFormat,
   *   width,
   *   height,
   *   border,
   *   format,
   *   type,
   *   pixels,
   * );
   * ```
   * @remarks
   * **WebGL Difference**: Bind target is always `gl.TEXTURE_2D`
   *
   * @param level
   * @param internalFormat
   * @param width
   * @param height
   * @param border
   * @param format
   * @param type
   * @param pixels
   */
  texImage2D(
    level: GLint,
    internalformat: GLint,
    width: GLsizei,
    height: GLsizei,
    border: GLint,
    format: GLenum,
    type: GLenum,
    pixels: ArrayBufferView | null,
  ): void;
  texImage2D(
    level: GLint,
    internalformat: GLint,
    format: GLenum,
    type: GLenum,
    source: TexImageSource | Uint8Array,
  ): void;
  texImage2D(
    level: any,
    internalFormat: any,
    widthOrFormat: any,
    heightOrType: any,
    borderOrSource: any,
    format?: any,
    type?: any,
    pixels?: any,
  ) {
    if (format) {
      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        level,
        internalFormat,
        widthOrFormat,
        heightOrType,
        borderOrSource,
        format,
        type,
        pixels,
      );
    } else {
      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        level,
        internalFormat,
        widthOrFormat,
        heightOrType,
        borderOrSource,
      );
    }
  }
  /**
   * ```
   * gl.compressedTexImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, data);
   * ```
   *
   * @remarks
   * **WebGL Difference**: Bind target is always `gl.TEXTURE_2D`
   */

  compressedTexImage2D(
    level: GLint,
    internalformat: GLenum,
    width: GLsizei,
    height: GLsizei,
    border: GLint,
    data?: ArrayBufferView,
  ): void {
    this.gl.compressedTexImage2D(
      this.gl.TEXTURE_2D,
      level,
      internalformat,
      width,
      height,
      border,
      data as ArrayBufferView,
    );
  }
  /**
   * ```
   * gl.pixelStorei(pname, param);
   * ```
   *
   * @param pname
   * @param param
   */
  pixelStorei(pname: GLenum, param: GLint | GLboolean) {
    this.gl.pixelStorei(pname, param);
  }

  /**
   * ```
   * gl.generateMipmap(gl.TEXTURE_2D);
   * ```
   *
   * @remarks
   * **WebGL Difference**: Bind target is always `gl.TEXTURE_2D`
   */
  generateMipmap() {
    this.gl.generateMipmap(this.gl.TEXTURE_2D);
  }

  /**
   * ```
   * gl.createTexture();
   * ```
   *
   * @returns
   */
  createTexture() {
    return this.gl.createTexture();
  }

  /**
   * ```
   * gl.deleteTexture(texture);
   * ```
   *
   * @param texture
   */
  deleteTexture(texture: WebGLTexture | null) {
    if (texture) {
      this.texture2dParams.delete(texture);
    }
    this.gl.deleteTexture(texture);
  }

  /**
   * ```
   * gl.deleteFramebuffer(framebuffer);
   *
   * @param framebuffer
   */
  deleteFramebuffer(framebuffer: WebGLFramebuffer | null) {
    this.gl.deleteFramebuffer(framebuffer);
  }

  /**
   * ```
   * gl.viewport(x, y, width, height);
   * ```
   */
  viewport(x: GLint, y: GLint, width: GLsizei, height: GLsizei) {
    this.gl.viewport(x, y, width, height);
  }

  /**
   * ```
   * gl.clearColor(red, green, blue, alpha);
   * ```
   *
   * @param red
   * @param green
   * @param blue
   * @param alpha
   */
  clearColor(red: GLclampf, green: GLclampf, blue: GLclampf, alpha: GLclampf) {
    this.gl.clearColor(red, green, blue, alpha);
  }

  /**
   * ```
   * gl["enable"|"disable"](gl.SCISSOR_TEST);
   * ```
   * @param enable
   */
  setScissorTest(enable: boolean) {
    if (enable === this.scissorEnabled) {
      return;
    }
    if (enable) {
      this.gl.enable(this.gl.SCISSOR_TEST);
    } else {
      this.gl.disable(this.gl.SCISSOR_TEST);
    }
    this.scissorEnabled = enable;
  }

  /**
   * ```
   * gl.scissor(x, y, width, height);
   * ```
   *
   * @param x
   * @param y
   * @param width
   * @param height
   */
  scissor(x: GLint, y: GLint, width: GLsizei, height: GLsizei) {
    if (
      x !== this.scissorX ||
      y !== this.scissorY ||
      width !== this.scissorWidth ||
      height !== this.scissorHeight
    ) {
      this.gl.scissor(x, y, width, height);
      this.scissorX = x;
      this.scissorY = y;
      this.scissorWidth = width;
      this.scissorHeight = height;
    }
  }

  /**
   * ```
   * gl["enable"|"disable"](gl.BLEND);
   * ```
   *
   * @param blend
   * @returns
   */
  setBlend(blend: boolean) {
    if (blend === this.blendEnabled) {
      return;
    }
    if (blend) {
      this.gl.enable(this.gl.BLEND);
    } else {
      this.gl.disable(this.gl.BLEND);
    }
    this.blendEnabled = blend;
  }

  /**
   * ```
   * gl.blendFunc(src, dst);
   * ```
   *
   * @param src
   * @param dst
   */
  blendFunc(src: GLenum, dst: GLenum) {
    if (
      src !== this.blendSrcRgb ||
      dst !== this.blendDstRgb ||
      src !== this.blendSrcAlpha ||
      dst !== this.blendDstAlpha
    ) {
      this.gl.blendFunc(src, dst);
      this.blendSrcRgb = src;
      this.blendDstRgb = dst;
      this.blendSrcAlpha = src;
      this.blendDstAlpha = dst;
    }
  }

  /**
   * ```
   * gl.createBuffer();
   * ```
   *
   * @returns
   */
  createBuffer() {
    return this.gl.createBuffer();
  }

  /**
   * ```
   * gl.createFramebuffer();
   * ```
   * @returns
   */
  createFramebuffer() {
    return this.gl.createFramebuffer();
  }

  /**
   * ```
   * gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
   * ```
   *
   * @param framebuffer
   */
  bindFramebuffer(framebuffer: WebGLFramebuffer | null) {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
  }

  /**
   * ```
   * gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
   * ```
   * @remarks
   * **WebGL Difference**: Bind target is always `gl.FRAMEBUFFER` and textarget is always `gl.TEXTURE_2D`
   */

  framebufferTexture2D(
    attachment: GLenum,
    texture: WebGLTexture | null,
    level: GLint,
  ) {
    const gl = this.gl;
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      attachment,
      gl.TEXTURE_2D,
      texture,
      level,
    );
  }

  /**
   * ```
   * gl.clear(gl.COLOR_BUFFER_BIT);
   * ```
   *
   * @remarks
   * **WebGL Difference**: Clear mask is always `gl.COLOR_BUFFER_BIT`
   */
  clear() {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  /**
   * ```
   * gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   * gl.bufferData(gl.ARRAY_BUFFER, data, usage);
   * ```
   *
   * @remarks
   * **WebGL Combo**: `gl.bindBuffer` and `gl.bufferData` are combined into one function.
   *
   * @param buffer
   * @param data
   * @param usage
   */
  arrayBufferData(
    buffer: WebGLBuffer | null,
    data: ArrayBufferView,
    usage: GLenum,
  ) {
    if (this.boundArrayBuffer !== buffer) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
      this.boundArrayBuffer = buffer;
    }
    this.gl.bufferData(this.gl.ARRAY_BUFFER, data, usage);
  }

  /**
   * ```
   * gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
   * gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, usage);
   * ```
   * @remarks
   * **WebGL Combo**: `gl.bindBuffer` and `gl.bufferData` are combined into one function.
   *
   * @param buffer
   * @param data
   * @param usage
   */
  elementArrayBufferData(
    buffer: WebGLBuffer | null,
    data: ArrayBufferView,
    usage: GLenum,
  ) {
    if (this.boundElementArrayBuffer !== buffer) {
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer);
      this.boundElementArrayBuffer = buffer;
    }
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, data, usage);
  }

  /**
   * ```
   * gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   * gl.vertexAttribPointer(index, size, type, normalized, stride, offset);
   * ```
   *
   * @remarks
   * **WebGL Combo**: `gl.bindBuffer` and `gl.vertexAttribPointer` are combined into one function.
   *
   * @param buffer
   * @param index
   * @param size
   * @param type
   * @param normalized
   * @param stride
   * @param offset
   */
  vertexAttribPointer(
    buffer: WebGLBuffer,
    index: GLuint,
    size: GLint,
    type: GLenum,
    normalized: GLboolean,
    stride: GLsizei,
    offset: GLintptr,
  ) {
    if (this.boundArrayBuffer !== buffer) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
      this.boundArrayBuffer = buffer;
    }
    this.gl.vertexAttribPointer(index, size, type, normalized, stride, offset);
  }

  /**
   * Returns object with Attribute names as key and numbers as location values
   *
   * @param program
   * @returns object with numbers
   */
  getUniformLocations(
    program: WebGLProgram,
  ): Record<string, WebGLUniformLocation> {
    const gl = this.gl;
    const length = gl.getProgramParameter(
      program,
      gl.ACTIVE_UNIFORMS,
    ) as number;
    const result = {} as Record<string, WebGLUniformLocation>;
    for (let i = 0; i < length; i++) {
      const info = gl.getActiveUniform(program, i) as WebGLActiveInfo;
      //remove bracket + value from uniform name;
      let name = info.name.replace(/\[.*?\]/g, '');
      result[name] = gl.getUniformLocation(
        program,
        name,
      ) as WebGLUniformLocation;
    }
    return result;
  }

  /**
   * Returns object with Attribute names as key and numbers as location values
   * @param program
   * @returns object with numbers
   */
  getAttributeLocations(program: WebGLProgram): string[] {
    const gl = this.gl;
    const length = gl.getProgramParameter(
      program,
      gl.ACTIVE_ATTRIBUTES,
    ) as number;

    const result: string[] = [];
    for (let i = 0; i < length; i++) {
      const { name } = gl.getActiveAttrib(program, i) as WebGLActiveInfo;
      result[gl.getAttribLocation(program, name)] = name;
    }
    return result;
  }

  /**
   * ```
   * gl.useProgram(program);
   * ```
   *
   * @param program
   * @returns
   */
  useProgram(
    program: WebGLProgram | null,
    uniformLocations: Record<string, WebGLUniformLocation>,
  ) {
    if (this.curProgram === program) {
      return;
    }
    this.gl.useProgram(program);
    this.curProgram = program;
    this.curUniformLocations = uniformLocations;
  }

  /**
   * Sets the value of a single float uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param v0 - The value to set.
   */
  uniform1f(location: string, v0: number) {
    this.gl.uniform1f(this.curUniformLocations[location] || null, v0);
  }

  /**
   * Sets the value of a float array uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param value - The array of values to set.
   */
  uniform1fv(location: string, value: Float32Array) {
    this.gl.uniform1fv(this.curUniformLocations[location] || null, value);
  }

  /**
   * Sets the value of a single integer uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param v0 - The value to set.
   */
  uniform1i(location: string, v0: number) {
    this.gl.uniform1i(this.curUniformLocations[location] || null, v0);
  }

  /**
   * Sets the value of an integer array uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param value - The array of values to set.
   */
  uniform1iv(location: string, value: Int32Array) {
    this.gl.uniform1iv(this.curUniformLocations[location] || null, value);
  }

  /**
   * Sets the value of a vec2 uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param v0 - The first component of the vector.
   * @param v1 - The second component of the vector.
   */
  uniform2f(location: string, v0: number, v1: number) {
    this.gl.uniform2f(this.curUniformLocations[location] || null, v0, v1);
  }

  /**
   * Sets the value of a vec3 uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param v - array of 4 numbers.
   */
  uniform2fa(location: string, value: Vec2) {
    this.gl.uniform2f(
      this.curUniformLocations[location] || null,
      value[0],
      value[1],
    );
  }

  /**
   * Sets the value of a vec2 array uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param value - The array of vec2 values to set.
   */
  uniform2fv(location: string, value: Float32Array) {
    this.gl.uniform2fv(this.curUniformLocations[location] || null, value);
  }

  /**
   * Sets the value of a ivec2 uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param v0 - The first component of the vector.
   * @param v1 - The second component of the vector.
   */
  uniform2i(location: string, v0: number, v1: number) {
    this.gl.uniform2i(this.curUniformLocations[location] || null, v0, v1);
  }

  /**
   * Sets the value of an ivec2 array uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param value - The array of ivec2 values to set.
   */
  uniform2iv(location: string, value: Int32Array) {
    this.gl.uniform2iv(this.curUniformLocations[location] || null, value);
  }

  /**
   * Sets the value of a vec3 uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param v0 - The first component of the vector.
   * @param v1 - The second component of the vector.
   * @param v2 - The third component of the vector.
   */
  uniform3f(location: string, v0: number, v1: number, v2: number) {
    this.gl.uniform3f(this.curUniformLocations[location] || null, v0, v1, v2);
  }

  /**
   * Sets the value of a vec3 uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param v - array of 4 numbers.
   */
  uniform3fa(location: string, value: Vec3) {
    this.gl.uniform3f(
      this.curUniformLocations[location] || null,
      value[0],
      value[1],
      value[2],
    );
  }

  /**
   * Sets the value of a vec3 array uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param value - The array of vec3 values to set.
   */
  uniform3fv(location: string, value: Float32Array) {
    this.gl.uniform3fv(this.curUniformLocations[location] || null, value);
  }

  /**
   * Sets the value of a ivec3 uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param v0 - The first component of the vector.
   * @param v1 - The second component of the vector.
   * @param v2 - The third component of the vector.
   */
  uniform3i(location: string, v0: number, v1: number, v2: number) {
    this.gl.uniform3i(this.curUniformLocations[location] || null, v0, v1, v2);
  }

  /**
   * Sets the value of an ivec3 array uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param value - The array of ivec3 values to set.
   */
  uniform3iv(location: string, value: Int32Array) {
    this.gl.uniform3iv(this.curUniformLocations[location] || null, value);
  }

  /**
   * Sets the value of a vec4 uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param v0 - The first component of the vector.
   * @param v1 - The second component of the vector.
   * @param v2 - The third component of the vector.
   * @param v3 - The fourth component of the vector.
   */
  uniform4f(location: string, v0: number, v1: number, v2: number, v3: number) {
    this.gl.uniform4f(
      this.curUniformLocations[location] || null,
      v0,
      v1,
      v2,
      v3,
    );
  }

  /**
   * Sets the value of a vec4 uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param v - array of 4 numbers.
   */
  uniform4fa(location: string, value: Vec4) {
    this.gl.uniform4f(
      this.curUniformLocations[location] || null,
      value[0],
      value[1],
      value[2],
      value[3],
    );
  }

  /**
   * Sets the value of a vec4 array uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param value - The array of vec4 values to set.
   */
  uniform4fv(location: string, value: Float32Array) {
    this.gl.uniform4fv(this.curUniformLocations[location] || null, value);
  }

  /**
   * Sets the value of a ivec4 uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param v0 - The first component of the vector.
   * @param v1 - The second component of the vector.
   * @param v2 - The third component of the vector.
   * @param v3 - The fourth component of the vector.
   */
  uniform4i(location: string, v0: number, v1: number, v2: number, v3: number) {
    this.gl.uniform4i(
      this.curUniformLocations[location] || null,
      v0,
      v1,
      v2,
      v3,
    );
  }

  /**
   * Sets the value of an ivec4 array uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param value - The array of ivec4 values to set.
   */
  uniform4iv(location: string, value: Int32Array) {
    this.gl.uniform4iv(this.curUniformLocations[location] || null, value);
  }

  /**
   * Sets the value of a mat2 uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param transpose - Whether to transpose the matrix.
   * @param value - The array of mat2 values to set.
   */
  uniformMatrix2fv(location: string, value: Float32Array) {
    this.gl.uniformMatrix2fv(
      this.curUniformLocations[location] || null,
      false,
      value,
    );
  }

  /**
   * Sets the value of a mat2 uniform variable.
   * @param location - The location of the uniform variable.
   * @param value - The array of mat2 values to set.
   */
  uniformMatrix3fv(location: string, value: Float32Array) {
    this.gl.uniformMatrix3fv(
      this.curUniformLocations[location] || null,
      false,
      value,
    );
  }

  /**
   * Sets the value of a mat4 uniform variable.
   * @param location - The location of the uniform variable.
   * @param value - The array of mat4 values to set.
   */
  uniformMatrix4fv(location: string, value: Float32Array) {
    this.gl.uniformMatrix4fv(
      this.curUniformLocations[location] || null,
      false,
      value,
    );
  }

  /**
   * ```
   * gl.getParameter(pname);
   * ```
   *
   * @param pname
   * @returns
   */
  getParameter(pname: GLenum): any {
    return this.gl.getParameter(pname);
  }

  /**
   * ```
   * gl.drawElements(mode, count, type, offset);
   * ```
   *
   * @param mode
   * @param count
   * @param type
   * @param offset
   */
  drawElements(mode: GLenum, count: GLsizei, type: GLenum, offset: GLintptr) {
    this.gl.drawElements(mode, count, type, offset);
  }

  /**
   * ```
   * gl.drawArrays(mode, first, count);
   * ```
   *
   * @param mode
   * @param first
   * @param count
   */
  drawArrays(mode: GLenum, first: GLint, count: GLsizei) {
    this.gl.drawArrays(mode, first, count);
  }

  /**
   * ```
   * gl.drawArrays(mode, first, count);
   * ```
   *
   * @param name
   * @returns
   */
  getExtension(name: string) {
    return this.gl.getExtension(name);
  }

  /**
   * ```
   * gl.getError(type);
   * ```
   *
   * @returns
   */
  getError() {
    return this.gl.getError();
  }

  /**
   * ```
   * gl.createVertexArray();
   * ```
   *
   * @returns
   */
  createVertexArray() {
    if (this.gl instanceof WebGL2RenderingContext) {
      return this.gl.createVertexArray();
    }
    return undefined;
  }

  /**
   * ```
   * gl.bindVertexArray(vertexArray);
   * ```
   *
   * @param vertexArray
   */
  bindVertexArray(vertexArray: WebGLVertexArrayObject | null) {
    if (this.gl instanceof WebGL2RenderingContext) {
      this.gl.bindVertexArray(vertexArray);
    }
  }

  /**
   * ```
   * gl.getAttribLocation(program, name);
   * ```
   *
   * @param program
   * @param name
   * @returns
   */
  getAttribLocation(program: WebGLProgram, name: string) {
    return this.gl.getAttribLocation(program, name);
  }

  /**
   * ```
   * gl.getUniformLocation(program, name);
   * ```
   *
   * @param program
   * @param name
   * @returns
   */
  getUniformLocation(program: WebGLProgram, name: string) {
    return this.gl.getUniformLocation(program, name);
  }

  /**
   * ```
   * gl.enableVertexAttribArray(index);
   * ```
   *
   * @param index
   */
  enableVertexAttribArray(index: number) {
    this.gl.enableVertexAttribArray(index);
  }

  /**
   * ```
   * gl.disableVertexAttribArray(index);
   * ```
   *
   * @param index
   */
  disableVertexAttribArray(index: number) {
    this.gl.disableVertexAttribArray(index);
  }

  /**
   * ```
   * gl.createShader(type);
   * ```
   *
   * @param type
   * @returns
   */
  createShader(type: number) {
    return this.gl.createShader(type);
  }

  /**
   * ```
   * gl.compileShader(shader);
   * ```
   *
   * @param shader
   * @returns
   */
  compileShader(shader: WebGLShader) {
    this.gl.compileShader(shader);
  }

  /**
   * ```
   * gl.attachShader(program, shader);
   * ```
   *
   * @param program
   * @param shader
   */
  attachShader(program: WebGLProgram, shader: WebGLShader) {
    this.gl.attachShader(program, shader);
  }

  /**
   * ```
   * gl.linkProgram(program);
   * ```
   *
   * @param program
   */
  linkProgram(program: WebGLProgram) {
    this.gl.linkProgram(program);
  }

  /**
   * ```
   * gl.deleteProgram(shader);
   * ```
   *
   * @param shader
   */
  deleteProgram(shader: WebGLProgram) {
    this.gl.deleteProgram(shader);
  }

  /**
   * ```
   * gl.getShaderParameter(shader, pname);
   * ```
   *
   * @param shader
   * @param pname
   */
  getShaderParameter(shader: WebGLShader, pname: GLenum) {
    return this.gl.getShaderParameter(shader, pname);
  }

  /**
   * ```
   * gl.getShaderInfoLog(shader);
   * ```
   *
   * @param shader
   */
  getShaderInfoLog(shader: WebGLShader) {
    return this.gl.getShaderInfoLog(shader);
  }

  /**
   * ```
   * gl.createProgram();
   * ```
   *
   * @returns
   */
  createProgram() {
    return this.gl.createProgram();
  }

  /**
   * ```
   * gl.getProgramParameter(program, pname);
   * ```
   *
   * @param program
   * @param pname
   * @returns
   */
  getProgramParameter(program: WebGLProgram, pname: GLenum) {
    return this.gl.getProgramParameter(program, pname);
  }

  /**
   * ```
   * gl.getProgramInfoLog(program);
   * ```
   *
   * @param program
   * @returns
   */
  getProgramInfoLog(program: WebGLProgram) {
    return this.gl.getProgramInfoLog(program);
  }

  /**
   * ```
   * gl.shaderSource(shader, source);
   * ```
   *
   * @param shader
   * @param source
   */
  shaderSource(shader: WebGLShader, source: string) {
    this.gl.shaderSource(shader, source);
  }

  /**
   * ```
   * gl.deleteShader(shader);
   * ```
   *
   * @param shader
   */
  deleteShader(shader: WebGLShader) {
    this.gl.deleteShader(shader);
  }

  /**
   * ```
   * gl.deleteBuffer(buffer);
   * ```
   *
   * @param buffer - The buffer to delete
   */
  deleteBuffer(buffer: WebGLBuffer) {
    const { gl } = this;
    gl.deleteBuffer(buffer);

    // Reset bound buffers if they match the deleted buffer
    if (this.boundArrayBuffer === buffer) {
      this.boundArrayBuffer = null;
    }
  }

  /**
   * ```
   * gl.deleteVertexArray(vertexArray);
   * ```
   *
   * @param vertexArray - The vertex array object to delete
   */
  deleteVertexArray(vertexArray: WebGLVertexArrayObject) {
    if (this.isWebGl2()) {
      (this.gl as WebGL2RenderingContext).deleteVertexArray(vertexArray);
    }
  }

  /**
   * Check for WebGL errors and return error information
   * @param operation Description of the operation for error reporting
   * @returns Object with error information or null if no error
   */
  checkError(
    operation: string,
  ): { error: number; errorName: string; message: string } | null {
    const error = this.getError();
    if (error !== 0) {
      // 0 is GL_NO_ERROR
      let errorName = 'UNKNOWN_ERROR';
      switch (error) {
        case this.INVALID_ENUM:
          errorName = 'INVALID_ENUM';
          break;
        case 0x0501: // GL_INVALID_VALUE
          errorName = 'INVALID_VALUE';
          break;
        case this.INVALID_OPERATION:
          errorName = 'INVALID_OPERATION';
          break;
        case 0x0505: // GL_OUT_OF_MEMORY
          errorName = 'OUT_OF_MEMORY';
          break;
        case 0x9242: // GL_CONTEXT_LOST_WEBGL
          errorName = 'CONTEXT_LOST_WEBGL';
          break;
      }

      const message = `WebGL ${errorName} (0x${error.toString(
        16,
      )}) during ${operation}`;
      return { error, errorName, message };
    }
    return null;
  }
}

// prettier-ignore
type IsUniformMethod<MethodName, MethodType> = MethodName extends `uniform${string}`
  ?
  MethodType extends (location: WebGLUniformLocation | null, ...args: any[]) => void
  ? true
  : false
  : false;

// prettier-ignore
export type UniformMethodMap = {
  [Key in keyof WebGLRenderingContext as IsUniformMethod<Key, WebGLRenderingContext[Key]> extends true ? Key : never]: WebGLRenderingContext[Key] extends (
    location: WebGLUniformLocation | null,
    ...args: infer T
  ) => void
  ? T
  : never;
};

/**
 * Compare two arrays for equality.
 *
 * @remarks
 * This function will not try to compare nested arrays or Float32Arrays and
 * instead will always return false when they are encountered.
 *
 * @param a
 * @param b
 * @returns
 */
export function compareArrays<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = false;
  for (let i = 0; i < a.length; i++) {
    if (Array.isArray(a[i]) || a[i] instanceof Float32Array) {
      result = false;
      break;
    }

    if (a[i] !== b[i]) {
      result = false;
      break;
    }

    result = true;
  }

  return result;
}
