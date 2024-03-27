/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2024 Comcast Cable Communications Management, LLC.
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
import type { RenderTexture } from '../../textures/RenderTexture.js';
import { WebGlCoreCtxTexture } from './WebGlCoreCtxTexture.js';

export class WebGlCoreCtxRenderTexture extends WebGlCoreCtxTexture {
  declare textureSource: RenderTexture;

  readonly framebuffer: WebGLFramebuffer;

  constructor(glw: WebGlContextWrapper, textureSource: RenderTexture) {
    super(glw, textureSource);
    // Create Framebuffer object
    const framebuffer = glw.createFramebuffer();
    assertTruthy(framebuffer, 'Unable to create framebuffer');
    this.framebuffer = framebuffer;
  }

  override async onLoadRequest(): Promise<Dimensions> {
    const { glw } = this;
    const nativeTexture = (this._nativeCtxTexture =
      this.createNativeCtxTexture());
    const { width, height } = this.textureSource;

    // Set the dimensions of the render texture
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

    // Bind the framebuffer
    glw.bindFramebuffer(this.framebuffer);

    // Attach the texture to the framebuffer
    glw.framebufferTexture2D(glw.COLOR_ATTACHMENT0, nativeTexture, 0);

    // Unbind the framebuffer
    glw.bindFramebuffer(null);

    return {
      width,
      height,
    };
  }
}
