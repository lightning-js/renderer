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
import type { WebGlContextWrapper } from '../../lib/WebGlContextWrapper.js';
import { RenderTexture } from '../../textures/RenderTexture.js';
import type { Texture } from '../../textures/Texture.js';
import { isPowerOfTwo } from '../../utils.js';
import { CoreContextTexture } from '../CoreContextTexture.js';

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
  private _state: 'freed' | 'loading' | 'loaded' | 'failed' = 'freed';
  private _w = 0;
  private _h = 0;

  constructor(protected glw: WebGlContextWrapper, textureSource: Texture) {
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
    this.textureSource.setState('loading');
    this.onLoadRequest()
      .then(({ width, height }) => {
        this._state = 'loaded';
        this._w = width;
        this._h = height;
        // Update the texture source's width and height so that it can be used
        // for rendering.
        this.textureSource.setState('loaded', { width, height });
      })
      .catch((err) => {
        this._state = 'failed';
        this.textureSource.setState('failed', err);
        console.error(err);
      });
  }

  /**
   * Called when the texture data needs to be loaded and uploaded to a texture
   */
  async onLoadRequest(): Promise<Dimensions> {
    this._nativeCtxTexture = this.createNativeCtxTexture();
    const { glw } = this;

    // On initial load request, create a 1x1 transparent texture to use until
    // the texture data is finally loaded.
    glw.activeTexture(0);
    glw.bindTexture(this._nativeCtxTexture);

    // linear texture filtering
    glw.texParameteri(glw.TEXTURE_MAG_FILTER, glw.LINEAR);
    glw.texParameteri(glw.TEXTURE_MIN_FILTER, glw.LINEAR);

    // texture wrapping method
    glw.texParameteri(glw.TEXTURE_WRAP_S, glw.CLAMP_TO_EDGE);
    glw.texParameteri(glw.TEXTURE_WRAP_T, glw.CLAMP_TO_EDGE);

    glw.texImage2D(
      0,
      glw.RGBA,
      1,
      1,
      0,
      glw.RGBA,
      glw.UNSIGNED_BYTE,
      TRANSPARENT_TEXTURE_DATA,
    );

    // If the texture source is a RenderTexture, we can return the width and height
    // immediately without needing to load any data because we already rendered to the texture
    if (this.textureSource instanceof RenderTexture) {
      return {
        width: this.textureSource.width,
        height: this.textureSource.height,
      };
    }

    const textureData = await this.textureSource?.getTextureData();
    let width = 0;
    let height = 0;
    assertTruthy(this._nativeCtxTexture);
    glw.activeTexture(0);
    // If textureData is null, the texture is empty (0, 0) and we don't need to
    // upload any data to the GPU.
    if (
      textureData.data instanceof ImageBitmap ||
      textureData.data instanceof ImageData
    ) {
      const data = textureData.data;
      width = data.width;
      height = data.height;
      glw.bindTexture(this._nativeCtxTexture);
      glw.pixelStorei(
        glw.UNPACK_PREMULTIPLY_ALPHA_WEBGL,
        !!textureData.premultiplyAlpha,
      );

      glw.texImage2D(0, glw.RGBA, glw.RGBA, glw.UNSIGNED_BYTE, data);

      // generate mipmaps for power-of-2 textures or in WebGL2RenderingContext
      if (glw.isWebGl2() || (isPowerOfTwo(width) && isPowerOfTwo(height))) {
        glw.generateMipmap();
      }
    } else if (textureData.data === null) {
      width = 0;
      height = 0;
      // Reset to a 1x1 transparent texture
      glw.bindTexture(this._nativeCtxTexture);
      glw.texImage2D(
        0,
        glw.RGBA,
        1,
        1,
        0,
        glw.RGBA,
        glw.UNSIGNED_BYTE,
        TRANSPARENT_TEXTURE_DATA,
      );
    } else if ('mipmaps' in textureData.data && textureData.data.mipmaps) {
      const {
        mipmaps,
        width = 0,
        height = 0,
        type,
        glInternalFormat,
      } = textureData.data;
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
    const { glw } = this;
    glw.deleteTexture(this._nativeCtxTexture);
    this._nativeCtxTexture = null;
  }

  private createNativeCtxTexture() {
    const { glw } = this;
    const nativeTexture = glw.createTexture();
    if (!nativeTexture) {
      throw new Error('Could not create WebGL Texture');
    }
    return nativeTexture;
  }
}
