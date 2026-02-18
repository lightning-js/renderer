/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
  Vec2,
  Vec3,
  Vec4,
} from '../renderers/webgl/internal/ShaderUtils.js';

import type { CompressedData } from '../textures/Texture.js';

/**
 * Abstract GL Context Wrapper
 *
 * @remarks
 * This abstract class defines the interface for rendering context wrappers.
 * Implementations should provide optimized state management and caching
 * to avoid redundant API calls when the state is already set to the desired value.
 *
 * The interface is designed to be compatible with WebGL-like rendering contexts
 * but can be adapted for other rendering backends (Canvas2D, WebGPU, Native, etc.).
 */
export abstract class GlContextWrapper {
  //#region Canvas
  abstract readonly canvas: HTMLCanvasElement | OffscreenCanvas;
  //#endregion Canvas

  //#region GL Constants
  abstract readonly MAX_RENDERBUFFER_SIZE: number;
  abstract readonly MAX_TEXTURE_SIZE: number;
  abstract readonly MAX_VIEWPORT_DIMS: number;
  abstract readonly MAX_VERTEX_TEXTURE_IMAGE_UNITS: number;
  abstract readonly MAX_TEXTURE_IMAGE_UNITS: number;
  abstract readonly MAX_COMBINED_TEXTURE_IMAGE_UNITS: number;
  abstract readonly MAX_VERTEX_ATTRIBS: number;
  abstract readonly MAX_VARYING_VECTORS: number;
  abstract readonly MAX_VERTEX_UNIFORM_VECTORS: number;
  abstract readonly MAX_FRAGMENT_UNIFORM_VECTORS: number;
  abstract readonly TEXTURE_MAG_FILTER: number;
  abstract readonly TEXTURE_MIN_FILTER: number;
  abstract readonly TEXTURE_WRAP_S: number;
  abstract readonly TEXTURE_WRAP_T: number;
  abstract readonly LINEAR: number;
  abstract readonly LINEAR_MIPMAP_LINEAR: number;
  abstract readonly CLAMP_TO_EDGE: number;
  abstract readonly RGB: number;
  abstract readonly RGBA: number;
  abstract readonly UNSIGNED_BYTE: number;
  abstract readonly UNPACK_PREMULTIPLY_ALPHA_WEBGL: number;
  abstract readonly UNPACK_FLIP_Y_WEBGL: number;
  abstract readonly FLOAT: number;
  abstract readonly TRIANGLES: number;
  abstract readonly UNSIGNED_SHORT: number;
  abstract readonly ONE: number;
  abstract readonly ONE_MINUS_SRC_ALPHA: number;
  abstract readonly VERTEX_SHADER: number;
  abstract readonly FRAGMENT_SHADER: number;
  abstract readonly STATIC_DRAW: number;
  abstract readonly COMPILE_STATUS: number;
  abstract readonly LINK_STATUS: number;
  abstract readonly DYNAMIC_DRAW: number;
  abstract readonly COLOR_ATTACHMENT0: number;
  abstract readonly INVALID_ENUM: number;
  abstract readonly INVALID_OPERATION: number;
  //#endregion GL Constants

  //#region Texture Management
  abstract activeTexture(textureUnit: number): void;
  abstract bindTexture(texture: any | null): void;
  abstract texParameteri(pname: number, param: number): void;
  abstract texImage2D(
    level: GLint,
    internalformat: GLint,
    width: GLsizei,
    height: GLsizei,
    border: GLint,
    format: GLenum,
    type: GLenum,
    pixels: ArrayBufferView | null,
  ): void;
  abstract texImage2D(
    level: GLint,
    internalformat: GLint,
    format: GLenum,
    type: GLenum,
    source: TexImageSource | Uint8Array,
  ): void;
  abstract compressedTexImage2D(
    level: GLint,
    internalformat: GLenum,
    width: GLsizei,
    height: GLsizei,
    border: GLint,
    data?: ArrayBufferView,
  ): void;
  abstract pixelStorei(pname: GLenum, param: GLint | GLboolean): void;
  abstract generateMipmap(): void;
  abstract createTexture(): any;
  abstract deleteTexture(texture: any | null): void;
  //#endregion Texture Management

  //#region Viewport & Clear
  abstract viewport(x: GLint, y: GLint, width: GLsizei, height: GLsizei): void;
  abstract clearColor(
    red: GLclampf,
    green: GLclampf,
    blue: GLclampf,
    alpha: GLclampf,
  ): void;
  abstract clear(): void;
  //#endregion Viewport & Clear

  //#region Scissor & Blend
  abstract setScissorTest(enable: boolean): void;
  abstract scissor(x: GLint, y: GLint, width: GLsizei, height: GLsizei): void;
  abstract setBlend(blend: boolean): void;
  abstract blendFunc(src: GLenum, dst: GLenum): void;
  //#endregion Scissor & Blend

  //#region Buffer Management
  abstract createBuffer(): any;
  abstract arrayBufferData(
    buffer: any | null,
    data: ArrayBufferView,
    usage: GLenum,
  ): void;
  abstract elementArrayBufferData(
    buffer: any | null,
    data: ArrayBufferView,
    usage: GLenum,
  ): void;
  abstract vertexAttribPointer(
    buffer: any,
    index: GLuint,
    size: GLint,
    type: GLenum,
    normalized: GLboolean,
    stride: GLsizei,
    offset: GLintptr,
  ): void;
  abstract deleteBuffer(buffer: any): void;
  //#endregion Buffer Management

  //#region Framebuffer Management
  abstract createFramebuffer(): any;
  abstract deleteFramebuffer(framebuffer: any | null): void;
  abstract bindFramebuffer(framebuffer: any | null): void;
  abstract framebufferTexture2D(
    attachment: GLenum,
    texture: any | null,
    level: GLint,
  ): void;
  //#endregion Framebuffer Management

  //#region Shader & Program Management
  abstract createShader(type: number): any;
  abstract compileShader(shader: any): void;
  abstract attachShader(program: any, shader: any): void;
  abstract linkProgram(program: any): void;
  abstract deleteProgram(shader: any): void;
  abstract getShaderParameter(shader: any, pname: GLenum): any;
  abstract getShaderInfoLog(shader: any): string | null;
  abstract createProgram(): any;
  abstract getProgramParameter(program: any, pname: GLenum): any;
  abstract getProgramInfoLog(program: any): string | null;
  abstract shaderSource(shader: any, source: string): void;
  abstract deleteShader(shader: any): void;
  abstract useProgram(
    program: any | null,
    uniformLocations: Record<string, any>,
  ): void;
  abstract getUniformLocations(program: any): Record<string, any>;
  abstract getAttributeLocations(program: any): string[];
  abstract getAttribLocation(program: any, name: string): number;
  abstract getUniformLocation(program: any, name: string): any;
  abstract enableVertexAttribArray(index: number): void;
  abstract disableVertexAttribArray(index: number): void;
  //#endregion Shader & Program Management

  //#region Uniform Setters
  abstract uniform1f(location: string, v0: number): void;
  abstract uniform1fv(location: string, value: Float32Array): void;
  abstract uniform1i(location: string, v0: number): void;
  abstract uniform1iv(location: string, value: Int32Array): void;
  abstract uniform2f(location: string, v0: number, v1: number): void;
  abstract uniform2fa(location: string, value: Vec2): void;
  abstract uniform2fv(location: string, value: Float32Array): void;
  abstract uniform2i(location: string, v0: number, v1: number): void;
  abstract uniform2iv(location: string, value: Int32Array): void;
  abstract uniform3f(
    location: string,
    v0: number,
    v1: number,
    v2: number,
  ): void;
  abstract uniform3fa(location: string, value: Vec3): void;
  abstract uniform3fv(location: string, value: Float32Array): void;
  abstract uniform3i(
    location: string,
    v0: number,
    v1: number,
    v2: number,
  ): void;
  abstract uniform3iv(location: string, value: Int32Array): void;
  abstract uniform4f(
    location: string,
    v0: number,
    v1: number,
    v2: number,
    v3: number,
  ): void;
  abstract uniform4fa(location: string, value: Vec4): void;
  abstract uniform4fv(location: string, value: Float32Array): void;
  abstract uniform4i(
    location: string,
    v0: number,
    v1: number,
    v2: number,
    v3: number,
  ): void;
  abstract uniform4iv(location: string, value: Int32Array): void;
  abstract uniformMatrix2fv(location: string, value: Float32Array): void;
  abstract uniformMatrix3fv(location: string, value: Float32Array): void;
  abstract uniformMatrix4fv(location: string, value: Float32Array): void;
  //#endregion Uniform Setters

  //#region Vertex Array Objects
  abstract createVertexArray(): any;
  abstract bindVertexArray(vertexArray: any | null): void;
  abstract deleteVertexArray(vertexArray: any): void;
  //#endregion Vertex Array Objects

  //#region Drawing
  abstract drawElements(
    mode: GLenum,
    count: GLsizei,
    type: GLenum,
    offset: GLintptr,
  ): void;
  abstract drawArrays(mode: GLenum, first: GLint, count: GLsizei): void;
  //#endregion Drawing

  //#region Context Info & Extensions
  abstract getParameter(pname: GLenum): any;
  abstract getExtension(name: string): any;
  abstract getError(): number;
  abstract checkError(
    operation: string,
  ): { error: number; errorName: string; message: string } | null;
  //#endregion Context Info & Extensions

  //#region compressed texture support
  abstract uploadKTX(
    glw: GlContextWrapper,
    texture: WebGLTexture,
    data: CompressedData,
  ): void;
  abstract uploadPVR(
    glw: GlContextWrapper,
    texture: WebGLTexture,
    data: CompressedData,
  ): void;
  abstract uploadASTC(
    glw: GlContextWrapper,
    texture: WebGLTexture,
    data: CompressedData,
  ): void;
  //#endregion compressed texture support

  //#region WebGL 2 specific methods (optional)
  abstract isWebGl2(): boolean;
  //#endregion WebGL 2 specific methods
}
