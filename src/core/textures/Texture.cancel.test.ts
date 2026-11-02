import { describe, expect, it, vi } from 'vitest';
import { CoreTextureManager } from '../CoreTextureManager.js';
import { Texture, TextureType, type TextureData } from './Texture.js';
import type { Stage } from '../Stage.js';

interface PendingLoad {
  resolve: (data: TextureData) => void;
  reject: (err: unknown) => void;
}

class DeferredTexture extends Texture {
  public override type: TextureType = TextureType.image;
  loads: PendingLoad[] = [];

  override getTextureSource(): Promise<TextureData> {
    return new Promise<TextureData>((resolve, reject) => {
      this.loads.push({ resolve, reject });
    });
  }
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function setup() {
  const stage = {
    contextState: 'running',
    platform: { getTimeStamp: () => 0 },
    defaultTexture: null,
  } as unknown as Stage;
  const manager = new CoreTextureManager(stage, {
    maxRetryCount: 5,
    createImageBitmapSupport: 'full',
  });
  const texture = new DeferredTexture(manager);
  return { manager, texture };
}

const pixels = (): TextureData => ({ data: new Uint8Array([0, 0, 0, 0]) });

describe('Texture.cancel', () => {
  it('returns to initial and drops the late result', async () => {
    const { manager, texture } = setup();
    texture.setRenderableOwner('a', true);

    texture.cancel();
    expect(texture.state).toBe('initial');

    texture.loads[0]?.resolve(pixels());
    await flush();
    expect(texture.state).toBe('initial');
    expect(texture.textureData).toBeNull();
    expect(manager.hasUpdates()).toBe(false);
  });

  it('does not fail when the cancelled load rejects', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { texture } = setup();
    texture.setRenderableOwner('a', true);

    texture.cancel();
    texture.loads[0]?.reject(new Error('network'));
    await flush();

    expect(texture.state).toBe('initial');
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it('is a no-op while more than one owner renders the texture', () => {
    const { texture } = setup();
    texture.setRenderableOwner('a', true);
    texture.setRenderableOwner('b', true);

    texture.cancel();

    expect(texture.state).toBe('loading');
  });

  it('lets a restarted load own the texture', async () => {
    const { manager, texture } = setup();
    texture.setRenderableOwner('a', true);
    texture.cancel();
    texture.load();
    const [first, second] = texture.loads;

    first?.resolve(pixels());
    await flush();
    expect(texture.textureData).toBeNull();
    expect(manager.isProcessingTexture(texture)).toBe(false);

    const data = pixels();
    second?.resolve(data);
    await flush();
    expect(texture.textureData).toBe(data);
    expect(manager.isProcessingTexture(texture)).toBe(true);
  });

  it('removes a decoded texture from the upload queue', async () => {
    const { manager, texture } = setup();
    texture.setRenderableOwner('a', true);
    texture.loads[0]?.resolve(pixels());
    await flush();
    expect(manager.isProcessingTexture(texture)).toBe(true);

    texture.cancel();

    expect(manager.isProcessingTexture(texture)).toBe(false);
    expect(texture.textureData).toBeNull();
    expect(texture.state).toBe('initial');
  });

  it('does nothing once the texture has left loading', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { texture } = setup();
    texture.setRenderableOwner('a', true);
    texture.loads[0]?.reject(new Error('network'));
    await flush();
    expect(texture.state).toBe('failed');

    texture.cancel();

    expect(texture.state).toBe('failed');
  });
});
