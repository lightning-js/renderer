import { describe, expect, it, vi } from 'vitest';
import { CoreTextureManager } from './CoreTextureManager.js';
import {
  TextureType,
  type TextureData,
  type TextureState,
} from './textures/Texture.js';
import type { Stage } from './Stage.js';
import type { Texture } from './textures/Texture.js';

describe('CoreTextureManager context loss', () => {
  it('ignores a stale decode and retries a previously pending uncached texture', async () => {
    let finishDecode!: (data: TextureData) => void;
    const decode = new Promise<TextureData>((resolve) => {
      finishDecode = resolve;
    });
    const stage = {
      contextState: 'running',
      platform: { getTimeStamp: () => 0 },
      defaultTexture: null,
    } as unknown as Stage;
    const manager = new CoreTextureManager(stage, {
      maxRetryCount: 5,
      createImageBitmapSupport: 'full',
    });
    const texture = {
      type: TextureType.image,
      state: 'initial',
      renderableOwners: new Set(['node']),
      preventCleanup: false,
      setState: vi.fn((state: TextureState) => {
        texture.state = state;
      }),
      invalidateContext: vi.fn(() => {
        texture.state = 'freed';
      }),
      getTextureData: vi.fn(() => decode),
      load: vi.fn(),
    } as unknown as Texture;

    const request = manager.loadTexture(texture);
    manager.invalidateContext();
    stage.contextState = 'lost';
    finishDecode({ data: new Uint8Array([0, 0, 0, 0]) });
    await request;
    expect(texture.invalidateContext).toHaveBeenCalledOnce();
    expect(texture.setState).not.toHaveBeenCalledWith('failed');

    stage.contextState = 'running';
    manager.restoreContext();
    // Image restores stay queued for the throttled drain instead of firing
    // all decodes at once.
    expect(texture.load).not.toHaveBeenCalled();
    expect(manager.hasUpdates()).toBe(true);
    await manager.processSome(1000, 10);
    expect(texture.load).toHaveBeenCalledOnce();
    expect(manager.hasUpdates()).toBe(false);
  });

  it('reloads non-image restores immediately without waiting for the drain', () => {
    const stage = {
      contextState: 'running',
      platform: { getTimeStamp: () => 0 },
      defaultTexture: null,
    } as unknown as Stage;
    const manager = new CoreTextureManager(stage, {
      maxRetryCount: 5,
      createImageBitmapSupport: 'full',
    });
    const texture = {
      type: TextureType.color,
      state: 'freed',
      invalidateContext: vi.fn(),
      load: vi.fn(),
    } as unknown as Texture;
    manager.trackContextTexture(texture);
    manager.invalidateContext();
    manager.restoreContext();
    expect(texture.load).toHaveBeenCalledOnce();
    expect(manager.hasUpdates()).toBe(false);
  });

  it('drops queued restores on destroy so dead textures can be collected', async () => {
    const stage = {
      contextState: 'lost',
      platform: { getTimeStamp: () => 0 },
      defaultTexture: null,
    } as unknown as Stage;
    const manager = new CoreTextureManager(stage, {
      maxRetryCount: 5,
      createImageBitmapSupport: 'full',
    });
    const texture = {
      type: TextureType.image,
      state: 'freed',
      invalidateContext: vi.fn(),
      load: vi.fn(),
    } as unknown as Texture;
    manager.trackContextTexture(texture);
    manager.invalidateContext();
    manager.destroy();
    expect(manager.hasUpdates()).toBe(false);
    stage.contextState = 'running';
    await manager.processSome(1000, 10);
    expect(texture.load).not.toHaveBeenCalled();
  });
});
