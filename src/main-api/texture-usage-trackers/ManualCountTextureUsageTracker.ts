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
import type { TextureRef } from './TextureTrackerMain.js';
import { TextureUsageTracker } from './TextureUsageTracker.js';

export interface ManualCountTextureUsageTrackerOptions {
  /**
   * The interval at which to check if textures that are no longer referenced
   * by any Nodes can be released from the Core Space Texture Usage Cache.
   *
   * @remarks
   * Only valid when the {@link ManualCountTextureUsageTracker} is used.
   *
   * @defaultValue 10000 (10 seconds)
   */
  textureCleanupIntervalMs?: number;
  /**
   * The age at which a texture is considered to be no longer referenced by any
   * Nodes and can be released from the Core Space Texture Usage Cache.
   *
   * @remarks
   * Only valid when the {@link ManualCountTextureUsageTracker} is used.
   *
   * @defaultValue 60000 (1 minute)
   */
  textureCleanupAgeThreadholdMs?: number;
}

interface TextureRefInfo {
  /**
   * Texture Reference ID
   */
  id: number;
  /**
   * The number of references to this texture that are currently assigned to
   * Nodes.
   */
  nodeRefCount: number;
  /**
   * The last time the texture reference count was updated.
   *
   * @remarks
   * This is used to determine when a texture is no longer referenced by any
   * Nodes and can be removed from the GPU.
   */
  lastUpdate: number;
}

/**
 * Usage-based Texture Garbage Collection Registry
 */
export class ManualCountTextureUsageTracker extends TextureUsageTracker {
  textureMap: Map<number, TextureRefInfo> = new Map();
  zeroReferenceTextureSet: Set<TextureRefInfo> = new Set();
  options: Required<ManualCountTextureUsageTrackerOptions>;

  constructor(
    releaseCallback: (textureDescId: number) => void,
    options: ManualCountTextureUsageTrackerOptions,
  ) {
    super(releaseCallback);
    this.options = {
      textureCleanupIntervalMs: options.textureCleanupIntervalMs ?? 10000,
      textureCleanupAgeThreadholdMs:
        options.textureCleanupAgeThreadholdMs ?? 60000,
    };
    // Periodically check for textures that are no longer referenced by any
    // Nodes and notify RendererMain to release them.
    setInterval(() => {
      const now = Date.now();
      const thresholdMs = this.options.textureCleanupAgeThreadholdMs;
      for (const textureRefInfo of this.zeroReferenceTextureSet) {
        if (now - textureRefInfo.lastUpdate > thresholdMs) {
          this.releaseCallback(textureRefInfo.id);
          this.textureMap.delete(textureRefInfo.id);
          this.zeroReferenceTextureSet.delete(textureRefInfo);
        }
      }
    }, this.options.textureCleanupIntervalMs);
  }

  registerTexture(texture: TextureRef) {
    const textureId = texture.options?.id;
    assertTruthy(textureId, 'Texture must have an id to be registered');
    if (!this.textureMap.has(textureId)) {
      const textureRefInfo: TextureRefInfo = {
        id: textureId,
        nodeRefCount: 0,
        lastUpdate: Date.now(),
      };
      this.textureMap.set(textureId, textureRefInfo);
      this.zeroReferenceTextureSet.add(textureRefInfo);
    }
  }

  incrementTextureRefCount(texture: TextureRef) {
    const textureId = texture.options?.id;
    assertTruthy(textureId, 'Texture must have an id to be registered');
    let textureRefInfo = this.textureMap.get(textureId);
    if (!textureRefInfo) {
      // Texture has not been registered yet, so register it now.
      // This may happen if the TextureRef was cleaned up from the registry
      // but was still alive in memory and eventually re-used.
      this.registerTexture(texture);
      textureRefInfo = this.textureMap.get(textureId);
    }
    assertTruthy(textureRefInfo, 'Texture must have been registered');
    if (texture.txType === 'SubTexture') {
      // If this is a SubTexture, then increment the reference count of the
      // parent texture as well.
      this.incrementTextureRefCount(texture.props.texture);
    }
    textureRefInfo.nodeRefCount++;
    textureRefInfo.lastUpdate = Date.now();
    if (this.zeroReferenceTextureSet.has(textureRefInfo)) {
      this.zeroReferenceTextureSet.delete(textureRefInfo);
    }
  }

  decrementTextureRefCount(texture: TextureRef) {
    const textureId = texture.options?.id;
    assertTruthy(textureId, 'Texture must have an id to be registered');
    const textureRefInfo = this.textureMap.get(textureId);
    assertTruthy(textureRefInfo, 'Texture must have been registered');
    textureRefInfo.nodeRefCount--;
    textureRefInfo.lastUpdate = Date.now();
    if (textureRefInfo.nodeRefCount === 0) {
      this.zeroReferenceTextureSet.add(textureRefInfo);
    }
    if (texture.txType === 'SubTexture') {
      // If this is a SubTexture, then decrement the reference count of the
      // parent texture as well.
      this.decrementTextureRefCount(texture.props.texture);
    }
  }
}
