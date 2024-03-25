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
import type { TextureMemoryManager } from '../../TextureMemoryManager.js';
import type { WebGlContextWrapper } from '../../lib/WebGlContextWrapper.js';
import type { SubTexture } from '../../textures/SubTexture.js';
import { WebGlCoreCtxTexture } from './WebGlCoreCtxTexture.js';

export class WebGlCoreCtxSubTexture extends WebGlCoreCtxTexture {
  constructor(
    glw: WebGlContextWrapper,
    memManager: TextureMemoryManager,
    textureSource: SubTexture,
  ) {
    super(glw, memManager, textureSource);
  }

  override async onLoadRequest(): Promise<Dimensions> {
    const props = await (this.textureSource as SubTexture).getTextureData();
    return {
      width: props.data?.width || 0,
      height: props.data?.height || 0,
    };
  }
}
