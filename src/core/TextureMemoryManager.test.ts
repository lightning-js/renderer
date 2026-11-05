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

import { describe, it, expect, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { CoreTextureManager } from './CoreTextureManager.js';
import {
  TextureMemoryManager,
  type TextureMemoryManagerSettings,
} from './TextureMemoryManager.js';
import type { Stage } from './Stage.js';
import type { Platform } from './platforms/Platform.js';
import type { Texture } from './textures/Texture.js';
import { TextureType } from './textures/Texture.js';
import type { CoreContextTexture } from './renderers/CoreContextTexture.js';
import type { CoreRenderer } from './renderers/CoreRenderer.js';

function makeSettings(
  overrides?: Partial<TextureMemoryManagerSettings>,
): TextureMemoryManagerSettings {
  return {
    criticalThreshold: 124e6,
    targetThresholdLevel: 0.5,
    cleanupInterval: 5000,
    debugLogging: false,
    baselineMemoryAllocation: 0,
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
  describe('cleanup()', () => {
    it('removes unused textures from tracking and the cache, then restores both on reload', () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      const stage = makeStage();
      stage.contextState = 'running';
      (stage as { platform: Platform }).platform = mock<Platform>({
        getTimeStamp: () => 0,
      });
      const txManager = new CoreTextureManager(stage, {
        maxRetryCount: 5,
        createImageBitmapSupport: 'full',
      });
      (stage as { txManager: CoreTextureManager }).txManager = txManager;
      const manager = new TextureMemoryManager(stage, makeSettings());
      const renderer = mock<CoreRenderer>();
      txManager.renderer = renderer;
      renderer.createCtxTexture.mockImplementation((texture) =>
        mock<CoreContextTexture>({
          state: 'freed',
          load: () => {
            manager.setTextureMemUse(texture, 1024);
            texture.setState('loaded', { w: 16, h: 16 });
          },
          free: () => {
            manager.setTextureMemUse(texture, 0);
            texture.setState('freed');
          },
        }),
      );
      const texture = txManager.createTexture('ImageTexture', {
        key: 'test-image',
        src: {
          data: new Uint8ClampedArray(1024),
          width: 16,
          height: 16,
          colorSpace: 'srgb',
        },
      });
      const cacheKey = texture.cacheKey as string;

      texture.setRenderableOwner('node', true);
      txManager.processSome(1000, 1);

      expect(texture.state).toEqual('loaded');
      expect(txManager.keyCache.has(cacheKey)).toEqual(true);
      expect(manager.getMemoryInfo().memUsed).toEqual(1024);
      expect(manager.getMemoryInfo().loadedTextures).toEqual(1);

      texture.setRenderableOwner('node', false);
      vi.setSystemTime(Date.now() + 2001); // Advance past Texture.STARTUP_GRACE_PERIOD
      manager.cleanup(true);

      expect(texture.state).toEqual('freed');
      expect(txManager.keyCache.has(cacheKey)).toEqual(false);
      expect(manager.getMemoryInfo().memUsed).toEqual(0);
      expect(manager.getMemoryInfo().loadedTextures).toEqual(0);

      texture.setRenderableOwner('node', true);
      txManager.processSome(1000, 1);

      expect(texture.state).toEqual('loaded');
      expect(txManager.keyCache.has(cacheKey)).toEqual(true);
      expect(manager.getMemoryInfo().memUsed).toEqual(1024);
      expect(manager.getMemoryInfo().loadedTextures).toEqual(1);

      vi.useRealTimers();
    });
  });

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
