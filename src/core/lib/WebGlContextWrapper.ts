/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { assertTruthy } from '../../utils.js';
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
  private programUniforms: WeakMap<
    WebGLProgram,
    Map<WebGLUniformLocation, any[]>
  > = new WeakMap();
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
  public readonly CLAMP_TO_EDGE;
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
    this.CLAMP_TO_EDGE = gl.CLAMP_TO_EDGE;
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
    const { gl } = this;
    if (this.activeTextureUnit !== textureUnit) {
      gl.activeTexture(textureUnit + gl.TEXTURE0);
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
    const { gl, activeTextureUnit, texture2dUnits } = this;

    if (texture2dUnits[activeTextureUnit] === texture) {
      return;
    }
    texture2dUnits[activeTextureUnit] = texture;

    gl.bindTexture(this.gl.TEXTURE_2D, texture);
  }

  private _getActiveTexture(): WebGLTexture | null {
    const { activeTextureUnit, texture2dUnits } = this;
    return texture2dUnits[activeTextureUnit]!;
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
    const { gl, texture2dParams } = this;

    const activeTexture = this._getActiveTexture();
    if (!activeTexture) {
      throw new Error('No active texture');
    }
    let textureParams = texture2dParams.get(activeTexture);
    if (!textureParams) {
      textureParams = {};
      texture2dParams.set(activeTexture, textureParams);
    }
    if (textureParams[pname] === param) {
      return;
    }
    textureParams[pname] = param;
    gl.texParameteri(gl.TEXTURE_2D, pname, param);
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
    source: TexImageSource,
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
    const { gl } = this;
    if (format) {
      gl.texImage2D(
        gl.TEXTURE_2D,
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
      gl.texImage2D(
        gl.TEXTURE_2D,
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
    const { gl } = this;
    gl.compressedTexImage2D(
      gl.TEXTURE_2D,
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
    const { gl } = this;
    gl.pixelStorei(pname, param);
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
    const { gl } = this;
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  /**
   * ```
   * gl.createTexture();
   * ```
   *
   * @returns
   */
  createTexture() {
    const { gl } = this;
    return gl.createTexture();
  }

  /**
   * ```
   * gl.deleteTexture(texture);
   * ```
   *
   * @param texture
   */
  deleteTexture(texture: WebGLTexture | null) {
    const { gl } = this;
    if (texture) {
      this.texture2dParams.delete(texture);
    }
    gl.deleteTexture(texture);
  }

  /**
   * ```
   * gl.viewport(x, y, width, height);
   * ```
   */
  viewport(x: GLint, y: GLint, width: GLsizei, height: GLsizei) {
    const { gl } = this;
    gl.viewport(x, y, width, height);
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
    const { gl } = this;
    gl.clearColor(red, green, blue, alpha);
  }

  /**
   * ```
   * gl["enable"|"disable"](gl.SCISSOR_TEST);
   * ```
   * @param enable
   */
  setScissorTest(enable: boolean) {
    const { gl, scissorEnabled } = this;
    if (enable === scissorEnabled) {
      return;
    }
    if (enable) {
      gl.enable(gl.SCISSOR_TEST);
    } else {
      gl.disable(gl.SCISSOR_TEST);
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
    const { gl, scissorX, scissorY, scissorWidth, scissorHeight } = this;
    if (
      x !== scissorX ||
      y !== scissorY ||
      width !== scissorWidth ||
      height !== scissorHeight
    ) {
      gl.scissor(x, y, width, height);
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
    const { gl, blendEnabled } = this;
    if (blend === blendEnabled) {
      return;
    }
    if (blend) {
      gl.enable(gl.BLEND);
    } else {
      gl.disable(gl.BLEND);
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
    const { gl, blendSrcRgb, blendDstRgb, blendSrcAlpha, blendDstAlpha } = this;
    if (
      src !== blendSrcRgb ||
      dst !== blendDstRgb ||
      src !== blendSrcAlpha ||
      dst !== blendDstAlpha
    ) {
      gl.blendFunc(src, dst);
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
    const { gl } = this;
    return gl.createBuffer();
  }

  /**
   * ```
   * gl.createFramebuffer();
   * ```
   * @returns
   */
  createFramebuffer() {
    const { gl } = this;
    return gl.createFramebuffer();
  }

  /**
   * ```
   * gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
   * ```
   *
   * @param framebuffer
   */
  bindFramebuffer(framebuffer: WebGLFramebuffer | null) {
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
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
    const { gl } = this;
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
    const { gl } = this;
    gl.clear(gl.COLOR_BUFFER_BIT);
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
    const { gl, boundArrayBuffer } = this;
    if (boundArrayBuffer !== buffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      this.boundArrayBuffer = buffer;
    }
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
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
    const { gl, boundElementArrayBuffer } = this;
    if (boundElementArrayBuffer !== buffer) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
      this.boundElementArrayBuffer = buffer;
    }
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, usage);
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
    const { gl, boundArrayBuffer } = this;
    if (boundArrayBuffer !== buffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      this.boundArrayBuffer = buffer;
    }
    gl.vertexAttribPointer(index, size, type, normalized, stride, offset);
  }

  /**
   * ```
   * gl.useProgram(program);
   * ```
   *
   * @param program
   * @returns
   */
  useProgram(program: WebGLProgram | null) {
    const { gl, curProgram } = this;
    if (curProgram === program) {
      return;
    }
    gl.useProgram(program);
    this.curProgram = program;
  }

  setUniform<T extends keyof UniformMethodMap>(
    type: T,
    location: WebGLUniformLocation,
    ...args: UniformMethodMap[T]
  ) {
    const { gl, programUniforms } = this;
    let uniforms = programUniforms.get(this.curProgram!);
    if (!uniforms) {
      uniforms = new Map();
      programUniforms.set(this.curProgram!, uniforms);
    }
    const uniformArgs = uniforms.get(location);
    if (!uniformArgs || !compareArrays(uniformArgs, args)) {
      uniforms.set(location, args);
      gl[type](location, ...(args as [never, never, never, never]));
    }
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
    const { gl } = this;
    return gl.getParameter(pname);
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
    const { gl } = this;
    gl.drawElements(mode, count, type, offset);
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
    const { gl } = this;
    return gl.getExtension(name);
  }

  /**
   * ```
   * gl.createVertexArray();
   * ```
   *
   * @returns
   */
  createVertexArray() {
    const { gl } = this;
    assertTruthy(gl instanceof WebGL2RenderingContext);
    return gl.createVertexArray();
  }

  /**
   * ```
   * gl.bindVertexArray(vertexArray);
   * ```
   *
   * @param vertexArray
   */
  bindVertexArray(vertexArray: WebGLVertexArrayObject | null) {
    const { gl } = this;
    assertTruthy(gl instanceof WebGL2RenderingContext);
    gl.bindVertexArray(vertexArray);
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
    const { gl } = this;
    return gl.getAttribLocation(program, name);
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
    const { gl } = this;
    return gl.getUniformLocation(program, name);
  }

  /**
   * ```
   * gl.enableVertexAttribArray(index);
   * ```
   *
   * @param index
   */
  enableVertexAttribArray(index: number) {
    const { gl } = this;
    gl.enableVertexAttribArray(index);
  }

  /**
   * ```
   * gl.disableVertexAttribArray(index);
   * ```
   *
   * @param index
   */
  disableVertexAttribArray(index: number) {
    const { gl } = this;
    gl.disableVertexAttribArray(index);
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
    const { gl } = this;
    return gl.createShader(type);
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
    const { gl } = this;
    gl.compileShader(shader);
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
    const { gl } = this;
    gl.attachShader(program, shader);
  }

  /**
   * ```
   * gl.linkProgram(program);
   * ```
   *
   * @param program
   */
  linkProgram(program: WebGLProgram) {
    const { gl } = this;
    gl.linkProgram(program);
  }

  /**
   * ```
   * gl.deleteProgram(shader);
   * ```
   *
   * @param shader
   */
  deleteProgram(shader: WebGLProgram) {
    const { gl } = this;
    gl.deleteProgram(shader);
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
    const { gl } = this;
    return gl.getShaderParameter(shader, pname);
  }

  /**
   * ```
   * gl.getShaderInfoLog(shader);
   * ```
   *
   * @param shader
   */
  getShaderInfoLog(shader: WebGLShader) {
    const { gl } = this;
    return gl.getShaderInfoLog(shader);
  }

  /**
   * ```
   * gl.createProgram();
   * ```
   *
   * @returns
   */
  createProgram() {
    const { gl } = this;
    return gl.createProgram();
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
    const { gl } = this;
    return gl.getProgramParameter(program, pname);
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
    const { gl } = this;
    return gl.getProgramInfoLog(program);
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
    const { gl } = this;
    gl.shaderSource(shader, source);
  }

  /**
   * ```
   * gl.deleteShader(shader);
   * ```
   *
   * @param shader
   */
  deleteShader(shader: WebGLShader) {
    const { gl } = this;
    gl.deleteShader(shader);
  }
}

// prettier-ignore
type IsUniformMethod<MethodName, MethodType> = MethodName extends `uniform${string}`
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  return a.every((v, i) => {
    // Don't bother to compare nested arrays or Float32Arrays
    if (Array.isArray(v) || v instanceof Float32Array) {
      return false;
    } else {
      return v === b[i];
    }
  });
}
