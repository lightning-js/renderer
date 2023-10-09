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

import type { TextureRef } from '../RendererMain.js';

/**
 * Texture Usage Tracker for Usage Based Texture Garbage Collection
 */
export abstract class TextureUsageTracker {
  constructor(protected releaseCallback: (textureDescId: number) => void) {}

  /**
   * Register a texture with the tracker.
   *
   * @param texture
   */
  abstract registerTexture(texture: TextureRef): void;

  /**
   * Increment the reference count for a texture.
   *
   * @remarks
   * This should be called anytime a Node sets a new texture.
   *
   * @param texture
   */
  abstract incrementTextureRefCount(texture: TextureRef): void;

  /**
   * Decrement the Node reference count for a texture.
   *
   * @remarks
   * This should be called anytime a Node removes a texture.
   *
   * @param texture
   */
  abstract decrementTextureRefCount(texture: TextureRef): void;
}
