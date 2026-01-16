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
import { uploadCompressedTexture } from '../../lib/textureCompression.js';
import type { Texture } from '../../textures/Texture.js';
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

  txCoordX1 = 0;
  txCoordY1 = 0;
  txCoordX2 = 1;
  txCoordY2 = 1;

  constructor(
    protected glw: WebGlContextWrapper,
    memManager: TextureMemoryManager,
    textureSource: Texture,
  ) {
    super(memManager, textureSource);
  }

  /**
   * GL error check with direct state marking
   * Uses cached error result to minimize function calls
   */
  private checkGLError(): boolean {
    // Skip if already failed to prevent double-processing
    if (this.state === 'failed') {
      return true;
    }

    const error = this.glw.getError();
    if (error !== 0) {
      this.state = 'failed';
      this.textureSource.setState('failed', new Error(`WebGL Error: ${error}`));
      return true;
    }
    return false;
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
  async load(): Promise<void> {
    // If the texture is already loading or loaded, return resolved promise
    if (this.state === 'loading' || this.state === 'loaded') {
      return Promise.resolve();
    }

    this.state = 'loading';
    this.textureSource.setState('loading');

    // Await the native texture creation to ensure GPU buffer is fully allocated
    this._nativeCtxTexture = this.createNativeCtxTexture();

    if (this._nativeCtxTexture === null) {
      this.state = 'failed';
      this.textureSource.setState(
        'failed',
        new Error('WebGL Texture creation failed'),
      );
      return;
    }

    try {
      const { width, height } = await this.onLoadRequest();

      // If the texture has been freed while loading, return early.
      // Type assertion needed because state could change during async operations
      if ((this.state as string) === 'freed') {
        return;
      }

      this.state = 'loaded';
      this._w = width;
      this._h = height;
      // Update the texture source's width and height so that it can be used
      // for rendering.
      this.textureSource.setState('loaded', { width, height });
      this.textureSource.freeTextureData();
    } catch (err: unknown) {
      // If the texture has been freed while loading, return early.
      // Type assertion needed because state could change during async operations
      if ((this.state as string) === 'freed') {
        return;
      }

      // Ensure texture is marked as failed
      this.state = 'failed';
      this.textureSource.setState('failed');
    }
  }

  /**
   * Called when the texture data needs to be loaded and uploaded to a texture
   */
  async onLoadRequest(): Promise<Dimensions> {
    const { glw } = this;
    const textureData = this.textureSource.textureData;

    // Early return if texture is already failed
    if (this.state === 'failed') {
      return { width: 0, height: 0 };
    }

    if (textureData === null || this._nativeCtxTexture === null) {
      this.state = 'failed';
      this.textureSource.setState(
        'failed',
        new Error('No texture data available'),
      );
      return { width: 0, height: 0 };
    }

    // Set to a 1x1 transparent texture
    glw.texImage2D(0, glw.RGBA, 1, 1, 0, glw.RGBA, glw.UNSIGNED_BYTE, null);
    this.setTextureMemUse(TRANSPARENT_TEXTURE_DATA.byteLength);

    let width = 0;
    let height = 0;

    glw.activeTexture(0);

    // High-performance error check - single call, direct state marking
    if (this.checkGLError() === true) {
      return { width: 0, height: 0 };
    }

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

      // Check for errors after image upload operations
      if (this.checkGLError() === true) {
        return { width: 0, height: 0 };
      }

      this.setTextureMemUse(height * width * formatBytes * memoryPadding);
    } else if (tdata && 'mipmaps' in tdata && tdata.mipmaps) {
      const { mipmaps, type, blockInfo } = tdata;
      uploadCompressedTexture[type]!(glw, this._nativeCtxTexture, tdata);

      // Check for errors after compressed texture operations
      if (this.checkGLError() === true) {
        return { width: 0, height: 0 };
      }

      width = tdata.width;
      height = tdata.height;
      this.txCoordX2 =
        width / (Math.ceil(width / blockInfo.width) * blockInfo.width);
      this.txCoordY2 =
        height / (Math.ceil(height / blockInfo.height) * blockInfo.height);

      this.setTextureMemUse(mipmaps[0]?.byteLength ?? 0);
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

      // Check for errors after color texture operations
      if (this.checkGLError() === true) {
        return { width: 0, height: 0 };
      }

      this.setTextureMemUse(width * height * formatBytes);
    } else {
      throw new Error(
        `WebGlCoreCtxTexture.onLoadRequest: Unexpected textureData returned`,
      );

      this.state = 'failed';
      this.textureSource.setState(
        'failed',
        new Error('Unexpected texture data'),
      );
      return { width: 0, height: 0 };
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
    this.release();
  }

  /**
   * Release the WebGLTexture from the GPU without changing state
   */
  release(): void {
    this._w = 0;
    this._h = 0;

    if (this._nativeCtxTexture !== null) {
      this.glw.deleteTexture(this._nativeCtxTexture);
      this.setTextureMemUse(0);
      this._nativeCtxTexture = null;
    }

    // if the texture still has source data, free it
    this.textureSource.freeTextureData();
  }

  /**
   * Create native context texture asynchronously
   *
   * @remarks
   * When this method resolves, the returned texture will be bound to the GL context state
   * and fully ready for use. This ensures proper GPU resource allocation timing.
   *
   * @returns Promise that resolves to the native WebGL texture or null on failure
   */
  protected createNativeCtxTexture(): WebGLTexture | null {
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

    const error = glw.getError();
    if (error !== 0) {
      return null;
    }

    return nativeTexture;
  }
}
