import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  class FakeImageBitmap {
    width = 1;
    height = 1;
    close = vi.fn();
  }
  // capabilities.ts checks the prototype for close() at import time.
  FakeImageBitmap.prototype.close = () => {};
  vi.stubGlobal('ImageBitmap', FakeImageBitmap);
});

import { CoreTextureManager } from '../CoreTextureManager.js';
import { ImageTexture, type ImageTextureProps } from './ImageTexture.js';
import type { Stage } from '../Stage.js';

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function setup(src: ImageTextureProps['src']) {
  const bitmap = new ImageBitmap() as ImageBitmap & {
    close: ReturnType<typeof vi.fn>;
  };
  const stage = {
    contextState: 'running',
    platform: {
      getTimeStamp: () => 0,
      loadImage: () => Promise.resolve({ data: bitmap }),
      createImage: () => Promise.resolve({ data: bitmap }),
    },
    defaultTexture: null,
  } as unknown as Stage;
  const manager = new CoreTextureManager(stage, {
    maxRetryCount: 5,
    createImageBitmapSupport: 'full',
  });
  const texture = new ImageTexture(
    manager,
    ImageTexture.resolveDefaults({ src }),
  );
  return { manager, texture, bitmap };
}

describe('ImageTexture bitmap release', () => {
  it.each([
    ['URL', 'image.png'],
    ['Blob', new Blob()],
  ])(
    'closes a bitmap decoded from a %s once its upload data is freed',
    async (_, src) => {
      const { texture, bitmap } = setup(src);
      texture.setRenderableOwner('a', true);
      await flush();

      texture.freeTextureData();
      await Promise.resolve();

      expect(texture.textureData).toBeNull();
      expect(bitmap.close).toHaveBeenCalledTimes(1);
    },
  );

  it('skips close() when ImageBitmap has none at boot (Chrome 50-51)', async () => {
    const original = globalThis.ImageBitmap;
    vi.resetModules();
    vi.stubGlobal('ImageBitmap', class {});
    try {
      const { closeImageBitmap } = await import('../platforms/capabilities.js');
      expect(() => closeImageBitmap(new ImageBitmap())).not.toThrow();
    } finally {
      vi.stubGlobal('ImageBitmap', original);
    }
  });

  it('does not close a caller-provided bitmap', async () => {
    const bitmap = new ImageBitmap() as ImageBitmap & {
      close: ReturnType<typeof vi.fn>;
    };
    const { texture } = setup(bitmap);
    texture.setRenderableOwner('a', true);
    expect(texture.textureData?.data).toBe(bitmap);

    texture.setRenderableOwner('a', false);
    await Promise.resolve();

    expect(texture.state).toBe('initial');
    expect(bitmap.close).not.toHaveBeenCalled();
  });

  it('closes the late bitmap once when cancelled mid-fetch', async () => {
    const { texture, bitmap } = setup('image.png');
    texture.setRenderableOwner('a', true);

    texture.setRenderableOwner('a', false);
    await flush();

    expect(texture.state).toBe('initial');
    expect(texture.textureData).toBeNull();
    expect(bitmap.close).toHaveBeenCalledTimes(1);
  });
});
