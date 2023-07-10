import { assertTruthy } from '../../../utils.js';
import type { Texture } from '../../textures/Texture.js';
import { type Dimensions, isPowerOfTwo } from '../../utils.js';
import { CoreContextTexture } from '../CoreContextTexture.js';
import { isWebGl2 } from './internal/WebGlUtils.js';

/**
 * A wrapper around a WebGLTexture that handles loading the texture data
 * from a Texture source and uploading it to the GPU as well as freeing
 * the uploaded texture.
 *
 * @remarks
 * When accessing the ctxTexture property, the texture will be loaded if
 * it hasn't been already. ctxTexture will always return a valid WebGLTexture
 * and trigger the loading/uploading of the texture's data if it hasn't been
 * loaded yet.
 */
export class WebGlCoreCtxTexture extends CoreContextTexture {
  protected _nativeCtxTexture: WebGLTexture | null = null;
  private _state: 'freed' | 'loading' | 'loaded' | 'failed' = 'freed';
  private _w = 0;
  private _h = 0;

  constructor(protected gl: WebGLRenderingContext, textureSource: Texture) {
    super(textureSource);
  }

  get ctxTexture(): WebGLTexture {
    if (this._state === 'freed') {
      this.load();
    }
    assertTruthy(this._nativeCtxTexture);
    return this._nativeCtxTexture;
  }

  get w() {
    return this._w;
  }

  get h() {
    return this._h;
  }

  /**
   * Load the texture data from the Texture source and upload it to the GPU
   *
   * @remarks
   * This method is called automatically when accessing the ctxTexture property
   * if the texture hasn't been loaded yet. But it can also be called manually
   * to force the texture to be pre-loaded prior to accessing the ctxTexture
   * property.
   */
  load() {
    // If the texture is already loading or loaded, don't load it again.
    if (this._state === 'loading' || this._state === 'loaded') {
      return;
    }
    this._state = 'loading';
    this.onLoadRequest()
      .then(({ width, height }) => {
        this._state = 'loaded';
        this._w = width;
        this._h = height;
        // Update the texture source's width and height so that it can be used
        // for rendering.
        this.textureSource.width = width;
        this.textureSource.height = height;
      })
      .catch((err) => {
        this._state = 'failed';
        console.error(err);
      });
  }

  /**
   * Called when the texture data needs to be loaded and uploaded to a texture
   */
  async onLoadRequest(): Promise<Dimensions> {
    this._nativeCtxTexture = this.createNativeCtxTexture();
    const textureData = await this.textureSource?.getTextureData();
    const { gl } = this;
    let width = 0;
    let height = 0;
    assertTruthy(this._nativeCtxTexture);
    // If textureData is null, the texture is empty (0, 0) and we don't need to
    // upload any data to the GPU.
    if (textureData instanceof ImageBitmap) {
      width = textureData.width;
      height = textureData.height;
      gl.bindTexture(gl.TEXTURE_2D, this._nativeCtxTexture);

      // multiply alpha channel in other color channels
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

      // linear texture filtering
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

      // texture wrapping method
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        textureData,
      );

      // generate mipmaps for power-of-2 textures or in WebGL2RenderingContext
      if (isWebGl2(gl) || (isPowerOfTwo(width) && isPowerOfTwo(height))) {
        gl.generateMipmap(gl.TEXTURE_2D);
      }
    } else {
      console.error(
        `WebGlCoreCtxTexture.onLoadRequest: Unexpected textureData returned`,
        textureData,
      );
    }

    return {
      width,
      height,
    };
  }
  /**
   * Free the WebGLTexture from the GPU
   *
   * @returns
   */
  free() {
    if (this._state === 'freed') {
      return;
    }
    this._state = 'freed';
    this._w = 0;
    this._h = 0;
    if (!this._nativeCtxTexture) {
      return;
    }
    this.gl.deleteTexture(this._nativeCtxTexture);
    this._nativeCtxTexture = null;
  }

  private createNativeCtxTexture() {
    const nativeTexture = this.gl.createTexture();
    if (!nativeTexture) {
      throw new Error('Could not create WebGL Texture');
    }
    return nativeTexture;
  }
}
