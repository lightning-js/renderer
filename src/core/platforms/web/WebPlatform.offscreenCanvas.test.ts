import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebPlatform } from './WebPlatform.js';

describe('WebPlatform createOffscreenCanvas', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns null when OffscreenCanvas is unavailable', () => {
    vi.stubGlobal('OffscreenCanvas', undefined);
    const platform = Object.create(WebPlatform.prototype) as WebPlatform;

    expect(platform.createOffscreenCanvas()).toBeNull();
  });

  it('returns null and caches unsupported when the 2d context lacks text APIs', () => {
    const getContext = vi.fn(() => ({}));
    vi.stubGlobal(
      'OffscreenCanvas',
      vi.fn(() => ({ getContext })),
    );
    const platform = Object.create(WebPlatform.prototype) as WebPlatform;

    expect(platform.createOffscreenCanvas()).toBeNull();
    expect(getContext).toHaveBeenCalledOnce();

    // Second call should short-circuit on the cached flag instead of
    // constructing another canvas.
    expect(platform.createOffscreenCanvas()).toBeNull();
    expect(getContext).toHaveBeenCalledOnce();
  });

  it('returns null and caches unsupported when getContext(2d) returns null', () => {
    const getContext = vi.fn(() => null);
    vi.stubGlobal(
      'OffscreenCanvas',
      vi.fn(() => ({ getContext })),
    );
    const platform = Object.create(WebPlatform.prototype) as WebPlatform;

    expect(platform.createOffscreenCanvas()).toBeNull();
    expect(platform.createOffscreenCanvas()).toBeNull();
    expect(getContext).toHaveBeenCalledOnce();
  });

  it('returns the canvas and caches supported when text APIs are present', () => {
    const context = { fillText: vi.fn(), measureText: vi.fn() };
    const canvas = { getContext: vi.fn(() => context) };
    vi.stubGlobal(
      'OffscreenCanvas',
      vi.fn(() => canvas),
    );
    const platform = Object.create(WebPlatform.prototype) as WebPlatform;

    expect(platform.createOffscreenCanvas()).toBe(canvas);
    expect(canvas.getContext).toHaveBeenCalledOnce();

    // Second call skips fetching a 2d context once support is cached as true.
    expect(platform.createOffscreenCanvas()).toBe(canvas);
    expect(canvas.getContext).toHaveBeenCalledOnce();
  });
});
