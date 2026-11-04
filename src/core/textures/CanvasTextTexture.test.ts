/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2026 Comcast Cable Communications Management, LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
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

import { describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import type { Stage } from '../Stage.js';
import { CoreTextureManager } from '../CoreTextureManager.js';
import type { CoreRenderer } from '../renderers/CoreRenderer.js';
import {
  TextureMemoryManager,
  type TextureMemoryManagerSettings,
} from '../TextureMemoryManager.js';
import { TextureType } from './Texture.js';

// capabilities.ts detects ImageBitmap at import time.
vi.hoisted(() => {
  (globalThis as any).ImageBitmap ??= class {};
});

describe('CanvasTextTexture', () => {
  it('creates a fresh source after its previous upload data is released', async () => {
    const txManager = new CoreTextureManager(mock<Stage>(), {
      maxRetryCount: 5,
      createImageBitmapSupport: 'auto',
    });
    const first = { width: 20, height: 10 } as ImageBitmap;
    const second = { width: 20, height: 10 } as ImageBitmap;
    const render = vi
      .fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second);

    const texture = txManager.createTexture('CanvasTextTexture', { render });
    expect(texture.type).toBe(TextureType.image);
    expect(texture.cacheKey).toBeNull();
    expect(texture.getTextureData()).toEqual({
      data: first,
      premultiplyAlpha: true,
    });
    expect(texture.getTextureData()).toEqual({
      data: first,
      premultiplyAlpha: true,
    });
    expect(render).toHaveBeenCalledTimes(1);

    texture.freeTextureData();
    await Promise.resolve();

    expect(texture.getTextureData()).toEqual({
      data: second,
      premultiplyAlpha: true,
    });
    expect(render).toHaveBeenCalledTimes(2);
  });

  it('shares textures with equal keys and skips keyCache without one', () => {
    const txManager = new CoreTextureManager(mock<Stage>(), {
      maxRetryCount: 5,
      createImageBitmapSupport: 'auto',
    });
    const render = vi.fn(() => null);
    const a = txManager.createTexture('CanvasTextTexture', {
      render,
      key: 'same',
    });
    const b = txManager.createTexture('CanvasTextTexture', {
      render,
      key: 'same',
    });
    expect(a).toBe(b);
    expect(txManager.keyCache.size).toBe(1);
    // The second creation reuses the cached texture: its render callback is
    // never invoked.
    expect(render).not.toHaveBeenCalled();

    const c = txManager.createTexture('CanvasTextTexture', {
      render,
      key: 'different',
    });
    expect(c).not.toBe(a);
    expect(txManager.keyCache.size).toBe(2);

    // Without a key the texture stays uncached (legacy single-owner use).
    const u1 = txManager.createTexture('CanvasTextTexture', { render });
    const u2 = txManager.createTexture('CanvasTextTexture', { render });
    expect(u1).not.toBe(u2);
    expect(txManager.keyCache.size).toBe(2);
  });

  it('keeps a shared mid-upload load but cancels an orphaned one', async () => {
    const txManager = new CoreTextureManager(mock<Stage>(), {
      maxRetryCount: 5,
      createImageBitmapSupport: 'auto',
    });
    const texture = txManager.createTexture('CanvasTextTexture', {
      render: () => null,
      key: 'shared',
    });

    // Simulate a queued mid-upload load with two owners.
    texture.setRenderableOwner('a', true);
    texture.setRenderableOwner('b', true);
    texture.setState('loading');
    txManager.enqueueUploadTexture(texture);

    texture.setRenderableOwner('a', false);
    await Promise.resolve();
    expect(texture.renderableOwners.has('b')).toBe(true);
    expect(texture.state).toBe('loading');
    expect(txManager.isProcessingTexture(texture)).toBe(true);

    // Last owner out: the stale queued load is aborted.
    texture.setRenderableOwner('b', false);
    await Promise.resolve();
    expect(texture.renderableOwners.size).toBe(0);
    expect(texture.state).toBe('initial');
    expect(txManager.isProcessingTexture(texture)).toBe(false);
  });

  it('keeps a queued load when another node takes the same key in the same pass', async () => {
    const txManager = new CoreTextureManager(mock<Stage>(), {
      maxRetryCount: 5,
      createImageBitmapSupport: 'auto',
    });
    const render = vi.fn(() => null);
    const texture = txManager.createTexture('CanvasTextTexture', {
      render,
      key: 'shared',
    });
    texture.setRenderableOwner('a', true);
    texture.setState('loading');
    txManager.enqueueUploadTexture(texture);

    texture.setRenderableOwner('a', false);
    const reused = txManager.createTexture('CanvasTextTexture', {
      render,
      key: 'shared',
    });
    reused.setRenderableOwner('b', true);
    await Promise.resolve();

    expect(reused).toBe(texture);
    expect(texture.state).toBe('loading');
    expect(txManager.isProcessingTexture(texture)).toBe(true);
  });

  it('closes a WebGL bitmap after upload data is released and redraws after eviction', async () => {
    class Bitmap {
      width = 24;
      height = 12;
      close = vi.fn();
    }
    vi.stubGlobal('ImageBitmap', Bitmap);
    try {
      const txManager = new CoreTextureManager(mock<Stage>(), {
        maxRetryCount: 5,
        createImageBitmapSupport: 'auto',
      });
      txManager.renderer = mock<CoreRenderer>({ mode: 'webgl' });
      const first = new Bitmap();
      const second = new Bitmap();
      const render = vi
        .fn()
        .mockReturnValueOnce(first)
        .mockReturnValueOnce(second);
      const texture = txManager.createTexture('CanvasTextTexture', { render });

      texture.getTextureData();
      texture.freeTextureData();
      await Promise.resolve();
      expect(first.close).toHaveBeenCalledTimes(1);
      expect(second.close).not.toHaveBeenCalled();

      // LRU evicts a non-renderable GPU texture; the source is no longer
      // cached, but the texture can recreate it on a later viewport entry.
      texture.getTextureData();
      expect(render).toHaveBeenCalledTimes(2);
      expect(texture.textureData?.data).toBe(second);
      texture.destroy();
      expect(second.close).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('does not close a newly generated source with the previous upload cleanup task', async () => {
    class Bitmap {
      width = 24;
      height = 12;
      close = vi.fn();
    }
    vi.stubGlobal('ImageBitmap', Bitmap);
    try {
      const txManager = new CoreTextureManager(mock<Stage>(), {
        maxRetryCount: 5,
        createImageBitmapSupport: 'auto',
      });
      txManager.renderer = mock<CoreRenderer>({ mode: 'webgl' });
      const first = new Bitmap();
      const second = new Bitmap();
      const render = vi
        .fn()
        .mockReturnValueOnce(first)
        .mockReturnValueOnce(second);
      const texture = txManager.createTexture('CanvasTextTexture', { render });
      texture.getTextureSource();
      texture.freeTextureData();
      // Reload before the previous source's scheduled cleanup runs.
      texture.getTextureSource();
      await Promise.resolve();

      expect(first.close).toHaveBeenCalledTimes(1);
      expect(second.close).not.toHaveBeenCalled();
      texture.destroy();
      expect(second.close).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('retains a Canvas2D display canvas until its context texture is freed', async () => {
    const txManager = new CoreTextureManager(mock<Stage>(), {
      maxRetryCount: 5,
      createImageBitmapSupport: 'auto',
    });
    txManager.renderer = mock<CoreRenderer>({ mode: 'canvas' });
    const canvas = { width: 24, height: 12 } as HTMLCanvasElement;
    const texture = txManager.createTexture('CanvasTextTexture', {
      render: () => canvas,
    });
    texture.getTextureData();
    texture.freeTextureData();
    await Promise.resolve();
    expect(canvas.width).toBe(24);

    texture.free();
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });

  it('disposes the stale source on context loss and redraws after restore', () => {
    class Bitmap {
      width = 24;
      height = 12;
      close = vi.fn();
    }
    vi.stubGlobal('ImageBitmap', Bitmap);
    try {
      const txManager = new CoreTextureManager(mock<Stage>(), {
        maxRetryCount: 5,
        createImageBitmapSupport: 'auto',
      });
      txManager.renderer = mock<CoreRenderer>({ mode: 'webgl' });
      const first = new Bitmap();
      const second = new Bitmap();
      const render = vi
        .fn()
        .mockReturnValueOnce(first)
        .mockReturnValueOnce(second);
      const texture = txManager.createTexture('CanvasTextTexture', { render });

      texture.getTextureData();
      texture.invalidateContext();
      expect(first.close).toHaveBeenCalledTimes(1);

      expect(texture.getTextureData()).toEqual({
        data: second,
        premultiplyAlpha: true,
      });
      expect(render).toHaveBeenCalledTimes(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('is protected while visible, evicted when out of bounds, and redraws on return', async () => {
    class Bitmap {
      width = 24;
      height = 12;
      close = vi.fn();
    }
    vi.stubGlobal('ImageBitmap', Bitmap);
    vi.useFakeTimers();
    try {
      const stage = mock<Stage>();
      const txManager = new CoreTextureManager(stage, {
        maxRetryCount: 5,
        createImageBitmapSupport: 'auto',
      });
      (stage as { txManager: CoreTextureManager }).txManager = txManager;
      txManager.renderer = mock<CoreRenderer>({ mode: 'webgl' });
      const settings: TextureMemoryManagerSettings = {
        criticalThreshold: 124e6,
        targetThresholdLevel: 0.5,
        cleanupInterval: 5000,
        debugLogging: false,
        baselineMemoryAllocation: 25e6,
        doNotExceedCriticalThreshold: false,
      };
      const memory = new TextureMemoryManager(stage, settings);
      const first = new Bitmap();
      const second = new Bitmap();
      const render = vi
        .fn()
        .mockReturnValueOnce(first)
        .mockReturnValueOnce(second);
      const texture = txManager.createTexture('CanvasTextTexture', { render });
      texture.getTextureData();
      texture.state = 'loaded';
      texture.ctxTexture = mock<NonNullable<typeof texture.ctxTexture>>({
        free: vi.fn(),
      });
      memory.setTextureMemUse(texture, 24 * 12 * 4);
      vi.advanceTimersByTime(2100); // past the manager's startup grace period

      // A renderable owner prevents eviction even during a full cleanup.
      texture.renderableOwners.add('node');
      (texture as { renderable: boolean }).renderable = true;
      memory.cleanup(true);
      expect(memory.getMemoryInfo().loadedTextures).toBe(1);
      expect(first.close).not.toHaveBeenCalled();

      texture.renderableOwners.delete('node');
      (texture as { renderable: boolean }).renderable = false;
      memory.cleanup(true);
      expect(memory.getMemoryInfo().loadedTextures).toBe(0);
      expect(first.close).toHaveBeenCalledTimes(1);
      expect(texture.ctxTexture).toBeUndefined();
      await Promise.resolve();

      // The node can keep its texture instance after GPU eviction; reloading
      // generates a new source rather than trying to upload a closed bitmap.
      expect(texture.getTextureData()).toEqual({
        data: second,
        premultiplyAlpha: true,
      });
      expect(render).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });
});
