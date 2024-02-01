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

import type { WebGlContextWrapper } from '../../lib/WebGlContextWrapper.js';

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
export class WebGlRenderTexture {
  protected _nativeCtxTexture: WebGLTexture | null = null;
  private _state: 'freed' | 'loading' | 'loaded' | 'failed' = 'freed';
  private _w = 0;
  private _h = 0;
  private _framebuffer: WebGLFramebuffer | null = null;
  private _texture: WebGLTexture | null = null;

  constructor(
    protected glw: WebGlContextWrapper,
    width: number,
    height: number,
  ) {
    this._w = width;
    this._h = height;

    const texture = glw.createTexture();
    if (!texture) {
      throw new Error('Unable to create texture');
    }

    glw.bindTexture(texture);
    glw.texImage2D(
      0,
      glw.RGBA,
      width,
      height,
      0,
      glw.RGBA,
      glw.UNSIGNED_BYTE,
      null,
    );
    glw.texParameteri(glw.TEXTURE_MAG_FILTER, glw.LINEAR);
    glw.texParameteri(glw.TEXTURE_MIN_FILTER, glw.LINEAR);
    glw.texParameteri(glw.TEXTURE_WRAP_S, glw.CLAMP_TO_EDGE);
    glw.texParameteri(glw.TEXTURE_WRAP_T, glw.CLAMP_TO_EDGE);

    // Setup framebuffer
    this._framebuffer = glw.createFramebuffer();
    if (!this._framebuffer) {
      throw new Error('Unable to create framebuffer');
    }

    this._texture = texture;
  }

  get w() {
    return this._w;
  }

  get h() {
    return this._h;
  }

  get framebuffer() {
    return this._framebuffer;
  }

  get texture() {
    return this._texture;
  }
}
