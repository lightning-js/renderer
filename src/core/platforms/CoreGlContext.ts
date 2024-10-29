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

export abstract class CoreGlContext {
  //#region Cached WebGL State
  protected abstract activeTextureUnit: number | undefined;
  protected abstract texture2dUnits: Array<WebGLTexture | null>;
  protected abstract texture2dParams: WeakMap<
    WebGLTexture,
    Record<number, number | undefined>
  >;
  protected abstract scissorEnabled: boolean;
  protected abstract scissorX: number;
  protected abstract scissorY: number;
  protected abstract scissorWidth: number;
  protected abstract scissorHeight: number;
  protected abstract blendEnabled: boolean;
  protected abstract blendSrcRgb: number;
  protected abstract blendDstRgb: number;
  protected abstract blendSrcAlpha: number;
  protected abstract blendDstAlpha: number;
  protected abstract boundArrayBuffer: WebGLBuffer | null;
  protected abstract boundElementArrayBuffer: WebGLBuffer | null;
  protected abstract curProgram: WebGLProgram | null;
  //#endregion Cached WebGL State

  //#region Canvas
  public abstract readonly canvas: HTMLCanvasElement | OffscreenCanvas;
  //#endregion Canvas

  //#region WebGL Enums
  public abstract readonly MAX_RENDERBUFFER_SIZE: GLenum;
  public abstract readonly MAX_TEXTURE_SIZE: GLenum;
  public abstract readonly MAX_VIEWPORT_DIMS: GLenum;
  public abstract readonly MAX_VERTEX_TEXTURE_IMAGE_UNITS: GLenum;
  public abstract readonly MAX_TEXTURE_IMAGE_UNITS: GLenum;
  public abstract readonly MAX_COMBINED_TEXTURE_IMAGE_UNITS: GLenum;
  public abstract readonly MAX_VERTEX_ATTRIBS: GLenum;
  public abstract readonly MAX_VARYING_VECTORS: GLenum;
  public abstract readonly MAX_VERTEX_UNIFORM_VECTORS: GLenum;
  public abstract readonly MAX_FRAGMENT_UNIFORM_VECTORS: GLenum;
  public abstract readonly TEXTURE_MAG_FILTER: GLenum;
  public abstract readonly TEXTURE_MIN_FILTER: GLenum;
  public abstract readonly TEXTURE_WRAP_S: GLenum;
  public abstract readonly TEXTURE_WRAP_T: GLenum;
  public abstract readonly LINEAR: GLenum;
  public abstract readonly CLAMP_TO_EDGE: GLenum;
  public abstract readonly RGBA: GLenum;
  public abstract readonly UNSIGNED_BYTE: GLenum;
  public abstract readonly UNPACK_PREMULTIPLY_ALPHA_WEBGL: GLenum;
  public abstract readonly UNPACK_FLIP_Y_WEBGL: GLenum;
  public abstract readonly FLOAT: GLenum;
  public abstract readonly TRIANGLES: GLenum;
  public abstract readonly UNSIGNED_SHORT: GLenum;
  public abstract readonly ONE: GLenum;
  public abstract readonly ONE_MINUS_SRC_ALPHA: GLenum;
  public abstract readonly VERTEX_SHADER: GLenum;
  public abstract readonly FRAGMENT_SHADER: GLenum;
  public abstract readonly STATIC_DRAW: GLenum;
  public abstract readonly COMPILE_STATUS: GLenum;
  public abstract readonly LINK_STATUS: GLenum;
  public abstract readonly DYNAMIC_DRAW: GLenum;
  public abstract readonly COLOR_ATTACHMENT0: GLenum;
  //#endregion WebGL Enums

  /**
   * Sets the active texture unit.
   * @param textureUnit - The index of the texture unit to activate.
   */
  abstract activeTexture(textureUnit: number): void;

  /**
   * Binds a WebGL texture to the current texture unit.
   * @param texture - The texture to bind, or null to unbind.
   */
  abstract bindTexture(texture: WebGLTexture | null): void;

  /**
   * Creates a new WebGL texture object.
   * @returns The newly created texture object, or null if the creation fails.
   */
  abstract createTexture(): WebGLTexture | null;

  /**
   * Deletes the specified WebGL texture object.
   * @param texture - The texture to delete, or null to unbind.
   */
  abstract deleteTexture(texture: WebGLTexture | null): void;

  /**
   * Uploads a 2D texture image to the currently bound texture.
   * @param level - The mipmap level to assign the image to.
   * @param internalformat - The format of the texture data.
   * @param width - The width of the image.
   * @param height - The height of the image.
   * @param border - The width of the border. Must be 0.
   * @param format - The format of the texel data.
   * @param type - The data type of the texel data.
   * @param pixels - The pixel data to upload, or null to allocate uninitialized texture memory.
   */
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

  /**
   * Uploads a 2D texture image from an HTML image element, canvas, or video.
   * @param level - The mipmap level to assign the image to.
   * @param internalformat - The internal format of the texture (e.g., `gl.RGBA`).
   * @param format - The format of the texel data (e.g., `gl.RGBA`).
   * @param type - The data type of the texel data (e.g., `gl.UNSIGNED_BYTE`).
   * @param source - The source of the texel data, typically an HTMLImageElement, HTMLCanvasElement, HTMLVideoElement, or ImageBitmap.
   */
  abstract texImage2D(
    level: GLint,
    internalformat: GLint,
    format: GLenum,
    type: GLenum,
    source: TexImageSource,
  ): void;

  /**
   * Uploads compressed 2D texture data to the currently bound texture.
   * @param level - The mipmap level to assign the compressed image to.
   * @param internalformat - The format of the compressed texture data (e.g., `gl.COMPRESSED_RGBA_S3TC_DXT1_EXT`).
   * @param width - The width of the texture image.
   * @param height - The height of the texture image.
   * @param border - The border width. Must be 0.
   * @param data - The compressed image data to upload.
   */
  abstract compressedTexImage2D(
    level: GLint,
    internalformat: GLenum,
    width: GLsizei,
    height: GLsizei,
    border: GLint,
    data?: ArrayBufferView,
  ): void;

  /**
   * Sets the texture parameters for the currently bound texture.
   * @param pname - The name of the texture parameter to set (e.g., `gl.TEXTURE_WRAP_S` or `gl.TEXTURE_MIN_FILTER`).
   * @param param - The value to set the texture parameter to (e.g., `gl.REPEAT` or `gl.LINEAR`).
   */
  abstract texParameteri(pname: number, param: number): void;

  /**
   * Generates mipmaps for the currently bound texture.
   * Automatically generates a series of texture images with progressively lower resolution.
   */
  abstract generateMipmap(): void;

  //////////////////////
  // Buffer Management
  //////////////////////

  /**
   * Creates a new buffer object for storing vertex or index data.
   * @returns The newly created WebGLBuffer object, or null if creation fails.
   */
  abstract createBuffer(): WebGLBuffer | null;

  /**
   * Allocates and initializes buffer data for the currently bound buffer object.
   * @param target - The target to which the buffer is bound (e.g., `gl.ARRAY_BUFFER`).
   * @param data - The data to initialize the buffer with (can be a typed array or ArrayBuffer).
   * @param usage - The expected usage pattern of the buffer (e.g., `gl.STATIC_DRAW`, `gl.DYNAMIC_DRAW`).
   */
  // L3 does not use this
  // abstract bufferData(target: GLenum, data: ArrayBufferView, usage: GLenum): void;

  //////////////////////////
  // Framebuffer Management
  //////////////////////////

  /**
   * Creates a new framebuffer object.
   * Framebuffers are used to render to textures rather than directly to the screen.
   * @returns The created WebGLFramebuffer object, or null if creation fails.
   */
  abstract createFramebuffer(): WebGLFramebuffer | null;

  /**
   * Binds a framebuffer to the specified target (e.g., `gl.FRAMEBUFFER`).
   * @param framebuffer - The framebuffer to bind, or null to unbind the current framebuffer.
   */
  abstract bindFramebuffer(framebuffer: WebGLFramebuffer | null): void;

  /**
   * Attaches a texture to a framebuffer object at the specified attachment point.
   * @param attachment - The attachment point to attach the texture to (e.g., `gl.COLOR_ATTACHMENT0`).
   * @param texture - The texture to attach to the framebuffer.
   * @param level - The mipmap level of the texture to attach.
   */
  abstract framebufferTexture2D(
    attachment: GLenum,
    texture: WebGLTexture | null,
    level: GLint,
  ): void;

  ////////////////////////
  // Shader Management
  ////////////////////////

  /**
   * Creates a new shader object.
   * @param type - The type of the shader to create (e.g., `gl.VERTEX_SHADER` or `gl.FRAGMENT_SHADER`).
   * @returns The created WebGLShader object, or null if the creation fails.
   */
  abstract createShader(type: GLenum): WebGLShader | null;

  /**
   * Sets the source code for a shader object.
   * @param shader - The shader object for which to set the source code.
   * @param source - The source code for the shader as a string.
   */
  abstract shaderSource(shader: WebGLShader, source: string): void;

  /**
   * Compiles the specified shader object.
   * After compilation, you can use `getShaderParameter` to check if the compilation was successful.
   * @param shader - The shader object to compile.
   */
  abstract compileShader(shader: WebGLShader): void;

  /**
   * Returns a parameter from a shader object.
   * @param shader - The shader object to query.
   * @param pname - The parameter to query (e.g., `gl.COMPILE_STATUS` to check if the shader compiled successfully).
   * @returns The value of the requested parameter.
   */
  abstract getShaderParameter(shader: WebGLShader, pname: GLenum): any;

  /**
   * Returns the information log for a shader object.
   * This log contains messages from the shader compiler, such as errors or warnings during compilation.
   * @param shader - The shader object to query.
   * @returns The information log as a string.
   */
  abstract getShaderInfoLog(shader: WebGLShader): string | null;

  /**
   * Deletes a shader object.
   * This frees the memory and resources associated with the shader.
   * @param shader - The shader object to delete.
   */
  abstract deleteShader(shader: WebGLShader): void;

  ////////////////////////
  // Program Management
  ////////////////////////

  /**
   * Creates a new program object.
   * A program links together multiple shaders (typically a vertex and fragment shader) into a single executable.
   * @returns The created WebGLProgram object, or null if the creation fails.
   */
  abstract createProgram(): WebGLProgram | null;

  /**
   * Attaches a shader object to a program object.
   * @param program - The program object to attach the shader to.
   * @param shader - The shader object to attach.
   */
  abstract attachShader(program: WebGLProgram, shader: WebGLShader): void;

  /**
   * Links the program object.
   * This connects the attached shaders into a complete executable.
   * You can check if the linking succeeded using `getProgramParameter`.
   * @param program - The program object to link.
   */
  abstract linkProgram(program: WebGLProgram): void;

  /**
   * Sets the specified program object as the current active program for rendering.
   * @param program - The program object to use, or null to stop using the current program.
   */
  abstract useProgram(program: WebGLProgram | null): void;

  /**
   * Returns a parameter from a program object.
   * @param program - The program object to query.
   * @param pname - The parameter to query (e.g., `gl.LINK_STATUS` to check if the program linked successfully).
   * @returns The value of the requested parameter.
   */
  abstract getProgramParameter(program: WebGLProgram, pname: GLenum): any;

  /**
   * Returns the information log for a program object.
   * This log contains messages from the program linker, such as errors or warnings during linking.
   * @param program - The program object to query.
   * @returns The information log as a string.
   */
  abstract getProgramInfoLog(program: WebGLProgram): string | null;

  /**
   * Deletes a program object.
   * This frees the memory and resources associated with the program.
   * @param program - The program object to delete.
   */
  abstract deleteProgram(program: WebGLProgram): void;

  ////////////////////////
  // Uniform Management
  ////////////////////////

  /**
   * Retrieves the location of a uniform variable within a program.
   * @param program - The program containing the uniform.
   * @param name - The name of the uniform variable.
   * @returns The location of the uniform variable, or null if the uniform does not exist.
   */
  abstract getUniformLocation(
    program: WebGLProgram,
    name: string,
  ): WebGLUniformLocation | null;

  /**
   * Sets the value of a float uniform variable.
   * @param location - The location of the uniform variable.
   * @param v0 - The float value to set.
   */
  abstract uniform1f(location: WebGLUniformLocation | null, v0: number): void;

  /**
   * Sets the value of a vec2 (2-component float vector) uniform variable.
   * @param location - The location of the uniform variable.
   * @param v0 - The first component of the vector.
   * @param v1 - The second component of the vector.
   */
  abstract uniform2f(
    location: WebGLUniformLocation | null,
    v0: number,
    v1: number,
  ): void;

  /**
   * Sets the value of a vec3 (3-component float vector) uniform variable.
   * @param location - The location of the uniform variable.
   * @param v0 - The first component of the vector.
   * @param v1 - The second component of the vector.
   * @param v2 - The third component of the vector.
   */
  abstract uniform3f(
    location: WebGLUniformLocation | null,
    v0: number,
    v1: number,
    v2: number,
  ): void;

  /**
   * Sets the value of a vec3 array uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param value - The array of vec3 values to set.
   */
  abstract uniform3fv(
    location: WebGLUniformLocation | null,
    value: Float32Array | number[],
  ): void;

  /**
   * Sets the value of a vec4 (4-component float vector) uniform variable.
   * @param location - The location of the uniform variable.
   * @param v0 - The first component of the vector.
   * @param v1 - The second component of the vector.
   * @param v2 - The third component of the vector.
   * @param v3 - The fourth component of the vector.
   */
  abstract uniform4f(
    location: WebGLUniformLocation | null,
    v0: number,
    v1: number,
    v2: number,
    v3: number,
  ): void;

  /**
   * Sets the value of a float array uniform variable.
   * @param location - The location of the uniform variable.
   * @param value - The array of float values to set.
   */
  abstract uniform1fv(
    location: WebGLUniformLocation | null,
    value: Float32Array | number[],
  ): void;

  /**
   * Sets the value of a 2x2 float matrix uniform variable.
   * @param location - The location of the uniform variable.
   * @param value - The matrix to set (must be 2x2).
   */
  abstract uniformMatrix2fv(
    location: WebGLUniformLocation | null,
    value: Float32Array | number[],
  ): void;

  /**
   * Sets the value of a 3x3 float matrix uniform variable.
   * @param location - The location of the uniform variable.
   * @param value - The matrix to set (must be 3x3).
   */
  abstract uniformMatrix3fv(
    location: WebGLUniformLocation | null,
    value: Float32Array | number[],
  ): void;

  /**
   * Sets the value of a 4x4 float matrix uniform variablisWebGl2e.
   * @param location - The location of the uniform variable.
   * @param value - The matrix to set (must be 4x4).
   */
  abstract uniformMatrix4fv(
    location: WebGLUniformLocation | null,
    value: Float32Array | number[],
  ): void;

  /**
   * Sets the value of an integer uniform variable.
   * @param location - The location of the uniform variable.
   * @param v0 - The integer value to set.
   */
  abstract uniform1i(location: WebGLUniformLocation | null, v0: number): void;

  /**
   * Sets the value of a vec2 (2-component integer vector) uniform variable.
   * @param location - The location of the uniform variable.
   * @param v0 - The first component of the vector.
   * @param v1 - The second component of the vector.
   */
  abstract uniform2i(
    location: WebGLUniformLocation | null,
    v0: number,
    v1: number,
  ): void;

  /**
   * Sets the value of a vec2 array uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param value - The array of vec2 values to set.
   */
  abstract uniform2fv(
    location: WebGLUniformLocation | null,
    value: Float32Array | number[],
  ): void;

  /**
   * Sets the value of an ivec2 array uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param value - The array of ivec2 values to set.
   */
  abstract uniform2iv(
    location: WebGLUniformLocation | null,
    value: Int32Array | number[],
  ): void;

  /**
   * Sets the value of a vec3 (3-component integer vector) uniform variable.
   * @param location - The location of the uniform variable.
   * @param v0 - The first component of the vector.
   * @param v1 - The second component of the vector.
   * @param v2 - The third component of the vector.
   */
  abstract uniform3i(
    location: WebGLUniformLocation | null,
    v0: number,
    v1: number,
    v2: number,
  ): void;

  /**
   * Sets the value of an ivec3 array uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param value - The array of ivec3 values to set.
   */
  abstract uniform3iv(
    location: WebGLUniformLocation | null,
    value: Int32Array | number[],
  ): void;

  /**
   * Sets the value of a vec4 (4-component integer vector) uniform variable.
   * @param location - The location of the uniform variable.
   * @param v0 - The first component of the vector.
   * @param v1 - The second component of the vector.
   * @param v2 - The third component of the vector.
   * @param v3 - The fourth component of the vector.
   */
  abstract uniform4i(
    location: WebGLUniformLocation | null,
    v0: number,
    v1: number,
    v2: number,
    v3: number,
  ): void;

  /**
   * Sets the value of an integer array uniform variable.
   * @param location - The location of the uniform variable.
   * @param value - The array of integer values to set.
   */
  abstract uniform1iv(
    location: WebGLUniformLocation | null,
    value: Int32Array | number[],
  ): void;

  /**
   * Sets the value of an ivec4 array uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param value - The array of ivec4 values to set.
   */
  abstract uniform4iv(
    location: WebGLUniformLocation | null,
    value: Int32Array | number[],
  ): void;

  /**
   * Sets the value of a vec4 array uniform variable.
   *
   * @param location - The location of the uniform variable.
   * @param value - The array of vec4 values to set.
   */
  abstract uniform4fv(
    location: WebGLUniformLocation | null,
    value: Float32Array | number[],
  ): void;

  ////////////////////////
  // Viewport and Scissor Management
  ////////////////////////

  /**
   * Sets the viewport transformation.
   * @param x - The x-coordinate of the lower-left corner of the viewport.
   * @param y - The y-coordinate of the lower-left corner of the viewport.
   * @param width - The width of the viewport.
   * @param height - The height of the viewport.
   */
  abstract viewport(x: GLint, y: GLint, width: GLsizei, height: GLsizei): void;

  /**
   * Defines a scissor box, which restricts drawing to a specific rectangular area.
   * @param x - The x-coordinate of the lower-left corner of the scissor box.
   * @param y - The y-coordinate of the lower-left corner of the scissor box.
   * @param width - The width of the scissor box.
   * @param height - The height of the scissor box.
   */
  abstract scissor(x: GLint, y: GLint, width: GLsizei, height: GLsizei): void;

  /**
   * Enables or disables the scissor test.
   * @param enable - Whether to enable or disable the scissor test.
   */
  abstract setScissorTest(enable: boolean): void;

  ////////////////////////
  // Blending and Drawing
  ////////////////////////

  /**
   * Enables or disables blending.
   * @param blend - Whether to enable or disable blending.
   */
  abstract setBlend(blend: boolean): void;

  /**
   * Specifies the pixel arithmetic for blending.
   * @param src - The source blending factor (e.g., `gl.SRC_ALPHA`).
   * @param dst - The destination blending factor (e.g., `gl.ONE_MINUS_SRC_ALPHA`).
   */
  abstract blendFunc(src: GLenum, dst: GLenum): void;

  ////////////////////////
  // Main
  ////////////////////////

  /**
   * Sets the color values used when clearing the color buffer.
   * @param red - The red component of the clear color.
   * @param green - The green component of the clear color.
   * @param blue - The blue component of the clear color.
   * @param alpha - The alpha component of the clear color.
   */
  abstract clearColor(
    red: GLclampf,
    green: GLclampf,
    blue: GLclampf,
    alpha: GLclampf,
  ): void;

  /**
   * Clears buffers to preset values.
   * @param mask - A bitmask indicating which buffer(s) to clear (e.g., `gl.COLOR_BUFFER_BIT`).
   */
  abstract clear(mask?: GLbitfield): void;

  /**
   * Renders primitives from array data.
   * @param mode - The kind of primitives to render (e.g., `gl.TRIANGLES`).
   * @param count - The number of elements to be rendered.
   * @param type - The data type of the elements in the element array buffer (e.g., `gl.UNSIGNED_SHORT`).
   * @param offset - The offset in the element array buffer where the vertex data starts.
   */
  abstract drawElements(
    mode: GLenum,
    count: GLsizei,
    type: GLenum,
    offset: GLintptr,
  ): void;

  /**
   * ```
   * gl.getAttribLocation(program, name);
   * ```
   *
   * @param program
   * @param name
   * @returns
   */
  abstract getAttribLocation(program: WebGLProgram, name: string): GLint;

  /**
   * ```
   * gl.enableVertexAttribArray(index);
   * ```
   *
   * @param index
   */
  abstract enableVertexAttribArray(index: number): void;

  /**
   * ```
   * gl.disableVertexAttribArray(index);
   * ```
   *
   * @param index
   */
  abstract disableVertexAttribArray(index: number): void;

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
  abstract arrayBufferData(
    buffer: WebGLBuffer | null,
    data: ArrayBufferView,
    usage: GLenum,
  ): void;

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
  abstract elementArrayBufferData(
    buffer: WebGLBuffer | null,
    data: ArrayBufferView,
    usage: GLenum,
  ): void;

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
  abstract vertexAttribPointer(
    buffer: WebGLBuffer,
    index: GLuint,
    size: GLint,
    type: GLenum,
    normalized: GLboolean,
    stride: GLsizei,
    offset: GLintptr,
  ): void;

  /**
   * ```
   * gl.pixelStorei(pname, param);
   * ```
   *
   * @param pname
   * @param param
   */
  abstract pixelStorei(pname: GLenum, param: GLint | GLboolean): void;

  /**
   * Renders primitives from the currently bound array data.
   * @param mode - The kind of primitives to render (e.g., `gl.TRIANGLES`).
   * @param first - The starting index in the array.
   * @param count - The number of vertices to be rendered.
   */
  // Currently not used in L3 renderer
  // abstract drawArrays(mode: GLenum, first: GLint, count: GLsizei): void;

  ////////////////////////
  // WebGL2
  ////////////////////////

  /**
   * ```
   * gl.createVertexArray();
   * ```
   *
   * @remarks
   * This is a WebGL2 only function
   *
   * @returns
   */
  abstract createVertexArray(): void;

  /**
   * ```
   * gl.bindVertexArray(vertexArray);
   * ```
   *
   * @remarks
   * This is a WebGL2 only function
   *
   * @param vertexArray
   */
  abstract bindVertexArray(vertexArray: WebGLVertexArrayObject | null): void;

  ////////////////////////
  // Extension handling
  ////////////////////////

  /**
   * Returns the WebGL extension with the specified name, or null if the extension is not supported.
   * @param name - The name of the extension to retrieve.
   * @returns The extension object, or null if the extension is not supported.
   */
  abstract getExtension(name: string): string | null;

  ////////////////////////
  // Query parameters and states
  ////////////////////////

  /**
   * Retrieves the value of a WebGL parameter.
   * @param pname - The name of the parameter to query (e.g., `gl.MAX_TEXTURE_SIZE`).
   * @returns The value of the requested parameter.
   */
  abstract getParameter(pname: GLenum): GLenum;

  /**
   * Determines if the current WebGL context is WebGL2.
   * @returns True if the context is WebGL2, otherwise false.
   */
  abstract isWebGl2(): boolean;
}
