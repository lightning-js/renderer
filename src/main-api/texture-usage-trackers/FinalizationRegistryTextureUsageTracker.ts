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

import { assertTruthy } from '../../utils.js';
import type { TextureRef } from '../RendererMain.js';
import { TextureUsageTracker } from './TextureUsageTracker.js';

export class FinalizationRegistryTextureUsageTracker extends TextureUsageTracker {
  private registry: FinalizationRegistry<number>;

  constructor(releaseCallback: (textureDescId: number) => void) {
    super(releaseCallback);
    this.registry = new FinalizationRegistry(releaseCallback);
  }

  override registerTexture(texture: TextureRef): void {
    assertTruthy(
      texture.options?.id,
      'Texture must have an ID to be registered',
    );
    this.registry.register(texture, texture.options?.id);
  }
  override incrementTextureRefCount(): void {
    // No-op for FinalizationRegistry
  }
  override decrementTextureRefCount(): void {
    // No-op for FinalizationRegistry
  }
}
