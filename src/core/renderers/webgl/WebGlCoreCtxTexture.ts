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
import { assertTruthy } from '../../../utils.js';
import type { TextureMemoryManager } from '../../TextureMemoryManager.js';
import type { WebGlContextWrapper } from '../../lib/WebGlContextWrapper.js';
import type { Texture } from '../../textures/Texture.js';
import { isPowerOfTwo } from '../../utils.js';
import { CoreContextTexture } from '../CoreContextTexture.js';
import { isHTMLImageElement } from './internal/RendererUtils.js';

const TRANSPARENT_TEXTURE_DATA = new Uint8Array([0, 0, 0, 0]);

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
  private _w = 0;
  private _h = 0;

  constructor(
    protected glw: WebGlContextWrapper,
    memManager: TextureMemoryManager,
    textureSource: Texture,
  ) {
    super(memManager, textureSource);
  }

  get ctxTexture(): WebGLTexture | null {
    if (this.state === 'freed') {
      this.load();
      return null;
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
    if (this.state === 'loading' || this.state === 'loaded') {
      return;
    }

    this.state = 'loading';
    this.textureSource.setState('loading');
    this._nativeCtxTexture = this.createNativeCtxTexture();

    if (this._nativeCtxTexture === null) {
      this.state = 'failed';
      this.textureSource.setState(
        'failed',
        new Error('Could not create WebGL Texture'),
      );
      console.error('Could not create WebGL Texture');
      return;
    }

    this.onLoadRequest()
      .then(({ width, height }) => {
        // If the texture has been freed while loading, return early.
        if (this.state === 'freed') {
          return;
        }

        this.state = 'loaded';
        this._w = width;
        this._h = height;
        // Update the texture source's width and height so that it can be used
        // for rendering.
        this.textureSource.setState('loaded', { width, height });

        // cleanup source texture data
        this.textureSource.freeTextureData();
      })
      .catch((err) => {
        // If the texture has been freed while loading, return early.
        if (this.state === 'freed') {
          return;
        }
        this.state = 'failed';
        this.textureSource.setState('failed', err);
        this.textureSource.freeTextureData();
        console.error(err);
      });
  }

  /**
   * Called when the texture data needs to be loaded and uploaded to a texture
   */
  async onLoadRequest(): Promise<Dimensions> {
    const { glw } = this;
    const textureData = this.textureSource.textureData;
    assertTruthy(textureData, 'Texture data is null');

    // Set to a 1x1 transparent texture
    glw.texImage2D(0, glw.RGBA, 1, 1, 0, glw.RGBA, glw.UNSIGNED_BYTE, null);
    this.setTextureMemUse(TRANSPARENT_TEXTURE_DATA.byteLength);

    // If the texture has been freed while loading, return early.
    if (!this._nativeCtxTexture) {
      assertTruthy(this.state === 'freed');
      return { width: 0, height: 0 };
    }
    let width = 0;
    let height = 0;

    glw.activeTexture(0);

    const tdata = textureData.data;
    const format = glw.RGBA;
    const formatBytes = 4;
    const memoryPadding = 1.1; // Add padding to account for GPU Padding

    // If textureData is null, the texture is empty (0, 0) and we don't need to
    // upload any data to the GPU.
    if (
      (typeof ImageBitmap !== 'undefined' && tdata instanceof ImageBitmap) ||
      tdata instanceof ImageData ||
      // not using typeof HTMLImageElement due to web worker
      isHTMLImageElement(tdata)
    ) {
      width = tdata.width;
      height = tdata.height;
      glw.bindTexture(this._nativeCtxTexture);
      glw.pixelStorei(
        glw.UNPACK_PREMULTIPLY_ALPHA_WEBGL,
        !!textureData.premultiplyAlpha,
      );

      glw.texImage2D(0, format, format, glw.UNSIGNED_BYTE, tdata);

      this.setTextureMemUse(height * width * formatBytes * memoryPadding);
    } else if (tdata === null) {
      width = 0;
      height = 0;
      // Reset to a 1x1 transparent texture
      glw.bindTexture(this._nativeCtxTexture);

      glw.texImage2D(
        0,
        format,
        1,
        1,
        0,
        format,
        glw.UNSIGNED_BYTE,
        TRANSPARENT_TEXTURE_DATA,
      );
      this.setTextureMemUse(TRANSPARENT_TEXTURE_DATA.byteLength);
    } else if ('mipmaps' in tdata && tdata.mipmaps) {
      const { mipmaps, width = 0, height = 0, type, glInternalFormat } = tdata;
      const view =
        type === 'ktx'
          ? new DataView(mipmaps[0] ?? new ArrayBuffer(0))
          : (mipmaps[0] as unknown as ArrayBufferView);

      glw.bindTexture(this._nativeCtxTexture);

      glw.compressedTexImage2D(0, glInternalFormat, width, height, 0, view);
      glw.texParameteri(glw.TEXTURE_WRAP_S, glw.CLAMP_TO_EDGE);
      glw.texParameteri(glw.TEXTURE_WRAP_T, glw.CLAMP_TO_EDGE);
      glw.texParameteri(glw.TEXTURE_MAG_FILTER, glw.LINEAR);
      glw.texParameteri(glw.TEXTURE_MIN_FILTER, glw.LINEAR);

      this.setTextureMemUse(view.byteLength);
    } else if (tdata && tdata instanceof Uint8Array) {
      // Color Texture
      width = 1;
      height = 1;

      glw.bindTexture(this._nativeCtxTexture);
      glw.pixelStorei(
        glw.UNPACK_PREMULTIPLY_ALPHA_WEBGL,
        !!textureData.premultiplyAlpha,
      );

      glw.texImage2D(
        0,
        format,
        width,
        height,
        0,
        format,
        glw.UNSIGNED_BYTE,
        tdata,
      );

      this.setTextureMemUse(width * height * formatBytes);
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
    if (this.state === 'freed') {
      return;
    }

    this.state = 'freed';
    this.textureSource.setState('freed');
    this._w = 0;
    this._h = 0;
    if (!this._nativeCtxTexture) {
      return;
    }
    const { glw } = this;

    glw.deleteTexture(this._nativeCtxTexture);
    this.setTextureMemUse(0);
    this._nativeCtxTexture = null;

    // if the texture still has source data, free it
    this.textureSource.freeTextureData();
  }

  /**
   * Create native context texture
   *
   * @remarks
   * When this method returns the returned texture will be bound to the GL context state.
   *
   * @param width
   * @param height
   * @returns
   */
  protected createNativeCtxTexture() {
    const { glw } = this;
    const nativeTexture = glw.createTexture();
    if (!nativeTexture) {
      return null;
    }

    // On initial load request, create a 1x1 transparent texture to use until
    // the texture data is finally loaded.
    glw.activeTexture(0);
    glw.bindTexture(nativeTexture);

    // linear texture filtering
    glw.texParameteri(glw.TEXTURE_MAG_FILTER, glw.LINEAR);
    glw.texParameteri(glw.TEXTURE_MIN_FILTER, glw.LINEAR);

    // texture wrapping method
    glw.texParameteri(glw.TEXTURE_WRAP_S, glw.CLAMP_TO_EDGE);
    glw.texParameteri(glw.TEXTURE_WRAP_T, glw.CLAMP_TO_EDGE);
    return nativeTexture;
  }
}
