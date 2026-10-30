import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoreTextureManager } from './CoreTextureManager.js';
import {
  TextureType,
  type TextureData,
  type TextureState,
} from './textures/Texture.js';
import type { Stage } from './Stage.js';
import type { Texture } from './textures/Texture.js';
import {
  TextureLoadCancelledError,
  type CancelToken,
} from './lib/CancelToken.js';

function createManager(loadCancelDelay?: number): CoreTextureManager {
  const stage = {
    contextState: 'running',
    platform: { getTimeStamp: () => 0 },
    defaultTexture: null,
    txMemManager: {},
  } as unknown as Stage;
  return new CoreTextureManager(stage, {
    maxRetryCount: 5,
    createImageBitmapSupport: 'full',
    loadCancelDelay,
  });
}

interface FakeImageTexture {
  type: TextureType;
  state: TextureState;
  renderable: boolean;
  renderableOwners: Set<string>;
  preventCleanup: boolean;
  textureData: TextureData | null;
  setState: ReturnType<typeof vi.fn>;
  getTextureData: ReturnType<typeof vi.fn>;
  resetCancelledLoad: ReturnType<typeof vi.fn>;
  load: ReturnType<typeof vi.fn>;
  lastToken: CancelToken | undefined;
}

const PIXELS: TextureData = { data: new Uint8Array([0, 0, 0, 0]) };

/**
 * Fake ImageTexture whose fetch stays pending until `finish()`, and rejects
 * like the platform loaders do when its token is cancelled.
 */
function createImageTexture(owners: string[] = ['node']) {
  let finish!: (data: TextureData) => void;
  const texture: FakeImageTexture = {
    type: TextureType.image,
    state: 'initial',
    renderable: owners.length > 0,
    renderableOwners: new Set(owners),
    preventCleanup: false,
    textureData: null,
    lastToken: undefined,
    setState: vi.fn((state: TextureState) => {
      texture.state = state;
    }),
    getTextureData: vi.fn(
      (token: CancelToken) =>
        new Promise<TextureData>((resolve, reject) => {
          texture.lastToken = token;
          finish = (data) => {
            if (token.cancelled === false) texture.textureData = data;
            resolve(data);
          };
          token.onCancel(() => reject(new TextureLoadCancelledError()));
        }),
    ),
    resetCancelledLoad: vi.fn(() => {
      texture.textureData = null;
      texture.state = 'initial';
    }),
    load: vi.fn(),
  };
  return {
    texture,
    asTexture: texture as unknown as Texture,
    finish: (data: TextureData = PIXELS) => finish(data),
  };
}

function loseOwners(manager: CoreTextureManager, texture: FakeImageTexture) {
  texture.renderableOwners.clear();
  texture.renderable = false;
  manager.scheduleLoadCancel(texture as unknown as Texture);
}

describe('CoreTextureManager.loadTexture re-entry', () => {
  it('does not start a second fetch while a load is already in flight', async () => {
    const manager = createManager();
    const { texture, asTexture, finish } = createImageTexture();

    const first = manager.loadTexture(asTexture);
    const second = manager.loadTexture(asTexture);

    expect(texture.getTextureData).toHaveBeenCalledOnce();
    expect(texture.setState).toHaveBeenCalledWith('loading');

    finish();
    await Promise.all([first, second]);

    expect(texture.getTextureData).toHaveBeenCalledOnce();
  });

  it('does not start a second fetch while a decoded image is queued for upload', async () => {
    const manager = createManager();
    const { texture, asTexture, finish } = createImageTexture();

    const request = manager.loadTexture(asTexture);
    finish();
    await request;
    expect(texture.state).toBe('loading');
    expect(manager.isProcessingTexture(asTexture)).toBe(true);

    await manager.loadTexture(asTexture);
    expect(texture.getTextureData).toHaveBeenCalledOnce();
  });

  it('allows a new fetch after a failed load', async () => {
    const manager = createManager();
    const { texture, asTexture } = createImageTexture();
    texture.getTextureData = vi.fn(() =>
      Promise.reject(new Error('network error')),
    );
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await manager.loadTexture(asTexture);
    errorSpy.mockRestore();
    expect(texture.state).toBe('failed');

    texture.getTextureData = vi.fn(() => Promise.resolve(PIXELS));
    await manager.loadTexture(asTexture);
    expect(texture.getTextureData).toHaveBeenCalledOnce();
  });
});

describe('CoreTextureManager load cancellation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('aborts an in-flight fetch after the grace period without failing', async () => {
    const manager = createManager();
    const { texture, asTexture } = createImageTexture();

    const request = manager.loadTexture(asTexture);
    loseOwners(manager, texture);

    vi.advanceTimersByTime(199);
    expect(texture.lastToken?.cancelled).toBe(false);

    vi.advanceTimersByTime(1);
    expect(texture.lastToken?.cancelled).toBe(true);
    expect(texture.resetCancelledLoad).toHaveBeenCalledOnce();

    await request;
    expect(texture.state).toBe('initial');
    expect(texture.setState).not.toHaveBeenCalledWith('failed');
    expect(manager.hasUpdates()).toBe(false);
  });

  it('keeps the in-flight fetch when an owner returns within the grace period', async () => {
    const manager = createManager();
    const { texture, asTexture, finish } = createImageTexture();

    const request = manager.loadTexture(asTexture);
    loseOwners(manager, texture);
    vi.advanceTimersByTime(100);

    texture.renderableOwners.add('node');
    texture.renderable = true;
    await manager.loadTexture(asTexture);

    vi.advanceTimersByTime(1000);
    expect(texture.lastToken?.cancelled).toBe(false);
    expect(texture.getTextureData).toHaveBeenCalledOnce();

    finish();
    await request;
    expect(manager.isProcessingTexture(asTexture)).toBe(true);
  });

  it('drops decoded data still queued for upload when the grace period expires', async () => {
    const manager = createManager();
    const { texture, asTexture, finish } = createImageTexture();

    const request = manager.loadTexture(asTexture);
    finish();
    await request;
    expect(manager.isProcessingTexture(asTexture)).toBe(true);

    loseOwners(manager, texture);
    vi.advanceTimersByTime(200);

    expect(manager.isProcessingTexture(asTexture)).toBe(false);
    expect(texture.resetCancelledLoad).toHaveBeenCalledOnce();
    expect(texture.state).toBe('initial');
  });

  it('skips the upload of a decoded texture with a pending cancel', async () => {
    const manager = createManager();
    const { texture, asTexture, finish } = createImageTexture();

    const request = manager.loadTexture(asTexture);
    finish();
    await request;
    loseOwners(manager, texture);

    await manager.processSome(1000, 10);

    expect(texture.resetCancelledLoad).toHaveBeenCalledOnce();
    expect(texture.state).toBe('initial');
    expect(manager.hasUpdates()).toBe(false);
  });

  it('starts a fresh load after a cancel, ignoring the stale request', async () => {
    const manager = createManager();
    const { texture, asTexture, finish } = createImageTexture();

    const stale = manager.loadTexture(asTexture);
    loseOwners(manager, texture);
    vi.advanceTimersByTime(200);
    const staleToken = texture.lastToken;

    texture.renderableOwners.add('node');
    texture.renderable = true;
    const fresh = manager.loadTexture(asTexture);
    await stale;

    expect(texture.getTextureData).toHaveBeenCalledTimes(2);
    expect(staleToken?.cancelled).toBe(true);
    expect(texture.lastToken?.cancelled).toBe(false);
    expect(texture.state).toBe('loading');

    finish();
    await fresh;
    expect(manager.isProcessingTexture(asTexture)).toBe(true);
  });

  it('never cancels a preload started without renderable owners', async () => {
    const manager = createManager();
    const { texture, asTexture } = createImageTexture([]);

    void manager.loadTexture(asTexture);
    manager.scheduleLoadCancel(asTexture);
    vi.advanceTimersByTime(1000);

    expect(texture.lastToken?.cancelled).toBe(false);
    expect(texture.resetCancelledLoad).not.toHaveBeenCalled();
  });

  it('never cancels a texture marked preventCleanup', async () => {
    const manager = createManager();
    const { texture, asTexture } = createImageTexture();
    texture.preventCleanup = true;

    void manager.loadTexture(asTexture);
    loseOwners(manager, texture);
    vi.advanceTimersByTime(1000);

    expect(texture.lastToken?.cancelled).toBe(false);
  });

  it('uses the configured cancel delay', () => {
    const manager = createManager(50);
    const { texture, asTexture } = createImageTexture();

    void manager.loadTexture(asTexture);
    loseOwners(manager, texture);

    vi.advanceTimersByTime(49);
    expect(texture.lastToken?.cancelled).toBe(false);
    vi.advanceTimersByTime(1);
    expect(texture.lastToken?.cancelled).toBe(true);
  });

  it('never cancels when the delay is negative', () => {
    const manager = createManager(-1);
    const { texture, asTexture } = createImageTexture();

    void manager.loadTexture(asTexture);
    loseOwners(manager, texture);
    vi.advanceTimersByTime(10_000);

    expect(texture.lastToken?.cancelled).toBe(false);
    manager.destroy();
    expect(texture.lastToken?.cancelled).toBe(false);
  });

  it('aborts in-flight loads on destroy', () => {
    const manager = createManager();
    const { texture, asTexture } = createImageTexture();

    void manager.loadTexture(asTexture);
    manager.destroy();

    expect(texture.lastToken?.cancelled).toBe(true);
  });
});
