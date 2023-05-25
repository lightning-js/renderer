export function createImageTexture(
  gl: WebGLRenderingContext,
  image: Uint8Array | ImageBitmap,
  dimensions: { w: number; h: number },
): WebGLTexture | null {
  const options: UInt8ArrayTextureOptions = {
    ...dimensions,
    format: gl.RGBA,
    type: gl.UNSIGNED_BYTE,
  };
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // multiply alpha channel in other color channels
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

  // linear texture filtering
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

  // texture wrapping method
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  uploadTextureData(gl, image, options);

  return texture;
}
/**
 * Create 1x1 white pixel texture where rectangle can sample from
 * and keep tinting capabilities
 * @param gl
 */
export const createWhitePixelTexture = (gl: WebGLRenderingContext) => {
  const pixelData = new Uint8Array([255, 255, 255, 255]);
  return createImageTexture(gl, pixelData, {
    w: 1,
    h: 1,
  });
};

export interface TextureOptions {
  format: number;
  type: number;
}

export interface UInt8ArrayTextureOptions extends TextureOptions {
  w: number;
  h: number;
}

/**
 * Upload image data to the currently bound WebGL texture
 *
 * @param gl
 * @param source
 * @param options
 */
export function uploadTextureData(
  gl: WebGLRenderingContext,
  source: ImageBitmap | Uint8Array,
  options: TextureOptions & Partial<UInt8ArrayTextureOptions>,
) {
  if (source instanceof ImageBitmap) {
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      options.format,
      options.format,
      options.type,
      source,
    );
  } else {
    if (!options.w || !options.h) {
      throw new Error('Texture width and height must be specified');
    }
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      options.format,
      options.w,
      options.h,
      0,
      options.format,
      options.type,
      source,
    );
  }
}
