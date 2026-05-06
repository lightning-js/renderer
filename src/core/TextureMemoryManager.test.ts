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

import { describe, it, expect } from 'vitest';
import { mock } from 'vitest-mock-extended';
import {
  TextureMemoryManager,
  type TextureMemoryManagerSettings,
} from './TextureMemoryManager.js';
import type { Stage } from './Stage.js';
import type { Texture } from './textures/Texture.js';
import { TextureType } from './textures/Texture.js';

function makeSettings(
  overrides?: Partial<TextureMemoryManagerSettings>,
): TextureMemoryManagerSettings {
  return {
    criticalThreshold: 124e6,
    targetThresholdLevel: 0.5,
    cleanupInterval: 5000,
    debugLogging: false,
    baselineMemoryAllocation: 25e6,
    doNotExceedCriticalThreshold: false,
    ...overrides,
  };
}

function makeTexture(memUsed = 1024): Texture {
  const texture = mock<Texture>();
  texture.memUsed = memUsed;
  texture.type = TextureType.image;
  texture.state = 'loaded';
  (texture as { renderable: boolean }).renderable = false;
  texture.preventCleanup = false;
  texture.canBeCleanedUp.mockReturnValue(true);
  return texture;
}

function makeStage() {
  const stage = mock<Stage>();
  const txManager = mock<Stage['txManager']>();
  (stage as { txManager: Stage['txManager'] }).txManager = txManager;
  return stage;
}

describe('TextureMemoryManager', () => {
  describe('destroy()', () => {
    it('calls destroyTexture for every loaded texture', () => {
      const stage = makeStage();
      const manager = new TextureMemoryManager(stage, makeSettings());

      const textures = [makeTexture(512), makeTexture(1024), makeTexture(2048)];

      for (const texture of textures) {
        manager.setTextureMemUse(texture, texture.memUsed);
      }

      manager.destroy();

      for (const texture of textures) {
        expect(texture.destroy).toHaveBeenCalledOnce();
      }
    });

    it('clears internal tracking so memUsed is 0 after destroy', () => {
      const stage = makeStage();
      const manager = new TextureMemoryManager(stage, makeSettings());

      const texture = makeTexture(4096);
      manager.setTextureMemUse(texture, texture.memUsed);

      manager.destroy();

      expect(manager.getMemoryInfo().memUsed).toBe(0);
    });

    it('reports no loaded textures after destroy', () => {
      const stage = makeStage();
      const manager = new TextureMemoryManager(stage, makeSettings());

      manager.setTextureMemUse(makeTexture(512), 512);
      manager.setTextureMemUse(makeTexture(1024), 1024);

      manager.destroy();

      expect(manager.getMemoryInfo().loadedTextures).toBe(0);
    });

    it('removes each texture from the cache via txManager', () => {
      const stage = makeStage();
      const manager = new TextureMemoryManager(stage, makeSettings());

      const textures = [makeTexture(256), makeTexture(512)];
      for (const texture of textures) {
        manager.setTextureMemUse(texture, texture.memUsed);
      }

      manager.destroy();

      expect(stage.txManager.removeTextureFromCache).toHaveBeenCalledTimes(
        textures.length,
      );

      for (const texture of textures) {
        expect(stage.txManager.removeTextureFromCache).toHaveBeenCalledWith(
          texture,
        );
      }
    });

    it('handles an empty loadedTextures list without throwing', () => {
      const stage = makeStage();
      const manager = new TextureMemoryManager(stage, makeSettings());

      expect(() => manager.destroy()).not.toThrow();
    });
  });
});
