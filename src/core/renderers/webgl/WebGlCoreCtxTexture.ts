import { assertTruthy } from '../../../utils.js';
import type { Texture } from '../../textures/Texture.js';
import { CoreContextTexture } from '../CoreContextTexture.js';

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
  private _ctxTexture: WebGLTexture | null;
  private _state: 'freed' | 'loading' | 'loaded' | 'failed' = 'freed';
  private _w = 0;
  private _h = 0;

  constructor(
    protected gl: WebGLRenderingContext,
    textureSource: Texture | null,
  ) {
    super(textureSource);
  }

  get ctxTexture(): WebGLTexture {
    if (this._state === 'freed') {
      this._ctxTexture = this.createNativeCtxTexture();
      this.load();
    }
    assertTruthy(this._ctxTexture);
    return this._ctxTexture;
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
    if (this._state === 'loading') {
      return;
    }
    this._state = 'loading';
    this.textureSource
      ?.getTextureData()
      .then((textureData) => {
        const { gl } = this;
        assertTruthy(this._ctxTexture);
        // If textureData is null, the texture is empty (0, 0) and we don't need to
        // upload any data to the GPU.
        if (textureData) {
          this._w = textureData.width;
          this._h = textureData.height;
          gl.bindTexture(gl.TEXTURE_2D, this._ctxTexture);

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
          gl.generateMipmap(gl.TEXTURE_2D);
        }
        this._state = 'loaded';
      })
      .catch((err: unknown) => {
        this._state = 'failed';
        console.error(err);
      });
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
    this.gl.deleteTexture(this._ctxTexture);
    this._ctxTexture = null;
  }

  private createNativeCtxTexture() {
    const nativeTexture = this.gl.createTexture();
    if (!nativeTexture) {
      throw new Error('Could not create WebGL Texture');
    }
    return nativeTexture;
  }
}
