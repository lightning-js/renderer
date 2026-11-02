/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2026 Comcast Cable Communications Management, LLC.
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

/**
 * Tests for CanvasTextRenderer's renderInfoCache: the module-level cache of
 * rendered text bitmaps/canvases, keyed by layout. Repeated identical
 * layouts must be deduped to a single cached entry, and each entry must be
 * disposed (ImageBitmap closed / HTMLCanvasElement backing store released)
 * once nothing is using it anymore, rather than leaking for the life of the
 * process.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CanvasTextRenderer from '../CanvasTextRenderer.js';
import * as CanvasFontHandler from '../CanvasFontHandler.js';
import type { Stage } from '../../Stage.js';
import type { CoreTextNodeProps } from '../../CoreTextNode.js';
import type { CanvasRenderInfo } from '../TextRenderer.js';

/** Minimal 2D context stub shared by draw + measure canvases. */
class FakeContext {
  font = '';
  fillStyle = '';
  globalAlpha = 1;
  textBaseline = '';
  textRendering = '';
  setTransform(): void {
    /* no-op */
  }
  measureText(text: string) {
    return { width: text.length * 10 };
  }
  fillText(): void {
    /* no-op */
  }
  fillRect(): void {
    /* no-op */
  }
}

/** Fake ImageBitmap stand-in so disposeRenderInfo's instanceof check matches. */
class FakeImageBitmap {
  width: number;
  height: number;
  close = vi.fn();
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
}

if (typeof globalThis.ImageBitmap === 'undefined') {
  (globalThis as unknown as { ImageBitmap: unknown }).ImageBitmap =
    FakeImageBitmap;
}

/** Fake OffscreenCanvas; transferToImageBitmap is spied on per test. */
class FakeOffscreenCanvas {
  width = 0;
  height = 0;
  private ctx = new FakeContext();
  getContext() {
    return this.ctx;
  }
  transferToImageBitmap(): ImageBitmap {
    return new FakeImageBitmap(this.width, this.height) as
      unknown as ImageBitmap;
  }
}

/** Fake HTMLCanvasElement stand-in for the DOM (non-offscreen) path. */
class FakeHtmlCanvas {
  width = 0;
  height = 0;
  private ctx = new FakeContext();
  getContext() {
    return this.ctx;
  }
}

if (typeof globalThis.OffscreenCanvas === 'undefined') {
  (globalThis as unknown as { OffscreenCanvas: unknown }).OffscreenCanvas =
    FakeOffscreenCanvas;
}

if (typeof globalThis.HTMLCanvasElement === 'undefined') {
  (globalThis as unknown as { HTMLCanvasElement: unknown }).HTMLCanvasElement =
    FakeHtmlCanvas;
}

const makeOffscreenStage = (): Stage => {
  return {
    options: { devicePhysicalPixelRatio: 1 },
    platform: {
      createOffscreenCanvas: () => new FakeOffscreenCanvas(),
      createCanvas: () => new FakeOffscreenCanvas(),
      loadFontFace: vi.fn().mockResolvedValue(null),
    },
  } as unknown as Stage;
};

/** Stage whose platform never provides an OffscreenCanvas — forces the DOM path. */
const makeDomStage = (): Stage => {
  return {
    options: { devicePhysicalPixelRatio: 1 },
    platform: {
      createOffscreenCanvas: () => null,
      createCanvas: () => new FakeHtmlCanvas(),
      loadFontFace: vi.fn().mockResolvedValue(null),
    },
  } as unknown as Stage;
};

const baseProps = {
  text: 'Hello',
  fontFamily: 'LeakFont',
  fontStyle: 'normal',
  fontSize: 16,
  textAlign: 'left',
  maxLines: 0,
  lineHeight: 1,
  overflowSuffix: '...',
  maxWidth: 0,
  maxHeight: 0,
  wordBreak: 'normal',
  richText: false,
  color: 0xffffffff,
  letterSpacing: 0,
} as unknown as CoreTextNodeProps;

async function loadAndInit(stage: Stage, fontFamily: string): Promise<void> {
  await CanvasFontHandler.loadFont(stage, {
    fontFamily,
    fontUrl: `http://example.com/${fontFamily}.woff2`,
  });
  CanvasFontHandler.requestLoad(stage, fontFamily);
  await vi.waitFor(() => {
    expect(CanvasFontHandler.isFontLoaded(fontFamily)).toBe(true);
  });
  CanvasTextRenderer.init(stage);
}

describe('CanvasTextRenderer renderInfoCache — bitmap lifecycle', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    CanvasTextRenderer.clearCache();
  });

  afterEach(() => {
    CanvasTextRenderer.clearCache();
  });

  it('1. cache grows unboundedly — one transferToImageBitmap per unique text, none released', async () => {
    const stage = makeOffscreenStage();
    await loadAndInit(stage, 'LeakFont1');

    const transferSpy = vi.spyOn(
      FakeOffscreenCanvas.prototype,
      'transferToImageBitmap',
    );

    const N = 500;
    for (let i = 0; i < N; i++) {
      CanvasTextRenderer.renderText({
        ...baseProps,
        fontFamily: 'LeakFont1',
        text: String(i),
      } as CoreTextNodeProps);
    }

    // Every unique string is a cache miss -> one new bitmap allocation each.
    expect(transferSpy).toHaveBeenCalledTimes(N);

    // None of the bitmaps created were ever closed by renderText itself.
    const closeCalls = transferSpy.mock.results.filter(
      (r) =>
        r.type === 'return' &&
        typeof (r.value as { close?: () => void }).close === 'function',
    );
    expect(closeCalls.length).toBe(N);
    for (const r of closeCalls) {
      const bitmap = r.value as { close: ReturnType<typeof vi.fn> };
      expect(bitmap.close).not.toHaveBeenCalled();
    }
  });

  it('2. clearCache() closes every still-cached bitmap', async () => {
    const stage = makeOffscreenStage();
    await loadAndInit(stage, 'LeakFont2');

    const transferSpy = vi.spyOn(
      FakeOffscreenCanvas.prototype,
      'transferToImageBitmap',
    );

    const N = 20;
    for (let i = 0; i < N; i++) {
      CanvasTextRenderer.renderText({
        ...baseProps,
        fontFamily: 'LeakFont2',
        text: `clear-${i}`,
      } as CoreTextNodeProps);
    }
    const closeFns = transferSpy.mock.results.map(
      (r) => (r.value as FakeImageBitmap).close,
    );
    expect(closeFns.length).toBe(N);

    CanvasTextRenderer.clearCache();

    // clearCache() now disposes every still-present entry before dropping
    // the Map references, so every bitmap's close() must have run.
    for (const fn of closeFns) {
      expect(fn).toHaveBeenCalledTimes(1);
    }
  });

  it('3. repeating the same layout is deduped — exactly 1 bitmap for 100 identical renders', async () => {
    const stage = makeOffscreenStage();
    await loadAndInit(stage, 'LeakFont3');

    const transferSpy = vi.spyOn(
      FakeOffscreenCanvas.prototype,
      'transferToImageBitmap',
    );

    const props = {
      ...baseProps,
      fontFamily: 'LeakFont3',
      text: 'same-text',
    } as CoreTextNodeProps;

    const firstResult = CanvasTextRenderer.renderText(props);
    for (let i = 0; i < 99; i++) {
      const result = CanvasTextRenderer.renderText(props);
      expect(result).toBe(firstResult);
    }

    expect(transferSpy).toHaveBeenCalledTimes(1);
  });

  // Expected to fail today: getLayoutCacheKey omits `color`, so two renders
  // that differ only by color collide on the same cache entry. Kept as
  // `it.fails` (not skipped) so this flips to a visible regression the
  // moment the cache key is fixed to include color.
  it.fails('4. rich text color is missing from the layout cache key, so differently-colored renders collide', async () => {
    const stage = makeOffscreenStage();
    await loadAndInit(stage, 'LeakFont4');

    const red = CanvasTextRenderer.renderText({
      ...baseProps,
      fontFamily: 'LeakFont4',
      richText: true,
      text: 'colored text',
      color: 0xff0000ff,
    } as CoreTextNodeProps) as CanvasRenderInfo;

    const blue = CanvasTextRenderer.renderText({
      ...baseProps,
      fontFamily: 'LeakFont4',
      richText: true,
      text: 'colored text',
      color: 0x0000ffff,
    } as CoreTextNodeProps) as CanvasRenderInfo;

    // TODO(canvas-text-texture-leak): getLayoutCacheKey (Utils.ts:101) omits
    // `color`, so these two distinct-colored renders collide on the same
    // cache entry and the second renderText() call returns the FIRST
    // (red) bitmap unchanged instead of drawing blue text. This assertion
    // is the desired, fixed behavior — it currently fails (see it.fails
    // above). Flip to a plain `it` once the cache key includes color.
    expect(blue.imageData).not.toBe(red.imageData);
  });

  it('5. DOM (non-offscreen) path retains a full HTMLCanvasElement per layout until clearCache() releases it', async () => {
    const stage = makeDomStage();
    await loadAndInit(stage, 'LeakFont5');

    const N = 10;
    const canvases: FakeHtmlCanvas[] = [];
    for (let i = 0; i < N; i++) {
      const result = CanvasTextRenderer.renderText({
        ...baseProps,
        fontFamily: 'LeakFont5',
        text: `dom-${i}`,
      } as CoreTextNodeProps) as CanvasRenderInfo;
      canvases.push(result.imageData as unknown as FakeHtmlCanvas);
    }

    // Every unique text produced its own distinct canvas element.
    expect(new Set(canvases).size).toBe(N);
    for (const c of canvases) {
      expect(c.width).toBeGreaterThan(0);
      expect(c.height).toBeGreaterThan(0);
    }

    CanvasTextRenderer.clearCache();

    // clearCache() now disposes every still-present entry: for the DOM
    // (non-offscreen) path that means zeroing width/height to release the
    // canvas's backing store, since HTMLCanvasElement has no close().
    for (const c of canvases) {
      expect(c.width).toBe(0);
      expect(c.height).toBe(0);
    }
  });

  it('6. N acquire()s + N release()s on the same cacheKey dispose the bitmap exactly once, after the last release', async () => {
    const stage = makeOffscreenStage();
    await loadAndInit(stage, 'LeakFont6');

    const transferSpy = vi.spyOn(
      FakeOffscreenCanvas.prototype,
      'transferToImageBitmap',
    );

    const props = {
      ...baseProps,
      fontFamily: 'LeakFont6',
      text: 'shared-text',
    } as CoreTextNodeProps;

    const N = 5;
    const results: CanvasRenderInfo[] = [];
    for (let i = 0; i < N; i++) {
      results.push(CanvasTextRenderer.renderText(props) as CanvasRenderInfo);
    }

    // Repeating the same layout reuses one cache entry — only one bitmap.
    expect(transferSpy).toHaveBeenCalledTimes(1);
    const close = (transferSpy.mock.results[0]!.value as FakeImageBitmap)
      .close;
    for (const r of results) {
      expect(r.cacheKey).toBe(results[0]!.cacheKey);
    }

    for (let i = 0; i < N; i++) {
      CanvasTextRenderer.acquire!(results[0]!.cacheKey);
    }

    for (let i = 0; i < N - 1; i++) {
      CanvasTextRenderer.release!(results[0]!.cacheKey);
      expect(close).not.toHaveBeenCalled();
    }
    CanvasTextRenderer.release!(results[0]!.cacheKey);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('7. two independent acquire()s followed by one release() keeps the bitmap open', async () => {
    const stage = makeOffscreenStage();
    await loadAndInit(stage, 'LeakFont7');

    const transferSpy = vi.spyOn(
      FakeOffscreenCanvas.prototype,
      'transferToImageBitmap',
    );

    const result = CanvasTextRenderer.renderText({
      ...baseProps,
      fontFamily: 'LeakFont7',
      text: 'shared-by-two',
    } as CoreTextNodeProps) as CanvasRenderInfo;
    const close = (transferSpy.mock.results[0]!.value as FakeImageBitmap)
      .close;

    CanvasTextRenderer.acquire!(result.cacheKey);
    CanvasTextRenderer.acquire!(result.cacheKey);

    CanvasTextRenderer.release!(result.cacheKey);

    expect(close).not.toHaveBeenCalled();

    CanvasTextRenderer.release!(result.cacheKey);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('8. release() on a never-acquired or already-released key does not throw or corrupt other keys', async () => {
    const stage = makeOffscreenStage();
    await loadAndInit(stage, 'LeakFont8');

    const transferSpy = vi.spyOn(
      FakeOffscreenCanvas.prototype,
      'transferToImageBitmap',
    );

    const other = CanvasTextRenderer.renderText({
      ...baseProps,
      fontFamily: 'LeakFont8',
      text: 'unrelated',
    } as CoreTextNodeProps) as CanvasRenderInfo;
    const close = (transferSpy.mock.results[0]!.value as FakeImageBitmap)
      .close;
    CanvasTextRenderer.acquire!(other.cacheKey);

    expect(() =>
      CanvasTextRenderer.release!('never-acquired-key'),
    ).not.toThrow();
    expect(() => CanvasTextRenderer.release!(other.cacheKey)).not.toThrow();
    // Releasing it again (already back to zero) must also not throw or
    // dispose the entry a second time / corrupt bookkeeping.
    expect(() => CanvasTextRenderer.release!(other.cacheKey)).not.toThrow();

    expect(close).toHaveBeenCalledTimes(1);
  });

  it('10. acquiring an unchanged cacheKey before releasing the previous reference never transiently drops the refcount to zero', async () => {
    // Mirrors how CoreTextNode re-renders into the same layout: it acquires
    // the newly returned cacheKey before releasing the one it held before
    // calling renderText() again, specifically so that when both keys are
    // identical the count goes 1 -> 2 -> 1, never 1 -> 0 -> 1. Getting this
    // ordering backwards would dispose the bitmap a node is about to keep
    // using.
    const stage = makeOffscreenStage();
    await loadAndInit(stage, 'LeakFont10');

    const transferSpy = vi.spyOn(
      FakeOffscreenCanvas.prototype,
      'transferToImageBitmap',
    );

    const result = CanvasTextRenderer.renderText({
      ...baseProps,
      fontFamily: 'LeakFont10',
      text: 'unchanged-layout',
    } as CoreTextNodeProps) as CanvasRenderInfo;
    const close = (transferSpy.mock.results[0]!.value as FakeImageBitmap)
      .close;

    CanvasTextRenderer.acquire!(result.cacheKey);

    // Re-render into the same cacheKey (a cache hit) and acquire the new
    // reference before releasing the old one.
    const second = CanvasTextRenderer.renderText({
      ...baseProps,
      fontFamily: 'LeakFont10',
      text: 'unchanged-layout',
    } as CoreTextNodeProps) as CanvasRenderInfo;
    expect(second.cacheKey).toBe(result.cacheKey);

    CanvasTextRenderer.acquire!(second.cacheKey);
    CanvasTextRenderer.release!(result.cacheKey);

    expect(close).not.toHaveBeenCalled();

    // Final release drops the last remaining reference.
    CanvasTextRenderer.release!(second.cacheKey);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('9. DOM path: a released, zero-refcount HTMLCanvasElement has width/height zeroed', async () => {
    const stage = makeDomStage();
    await loadAndInit(stage, 'LeakFont9');

    const result = CanvasTextRenderer.renderText({
      ...baseProps,
      fontFamily: 'LeakFont9',
      text: 'dom-dispose-me',
    } as CoreTextNodeProps) as CanvasRenderInfo;

    const canvasEl = result.imageData as unknown as FakeHtmlCanvas;
    expect(canvasEl.width).toBeGreaterThan(0);
    expect(canvasEl.height).toBeGreaterThan(0);

    CanvasTextRenderer.acquire!(result.cacheKey);
    CanvasTextRenderer.release!(result.cacheKey);

    expect(canvasEl.width).toBe(0);
    expect(canvasEl.height).toBe(0);
  });
});
