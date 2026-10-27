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
 * Regression test for a crash observed in sandboxed/headed-browser
 * environments without a real GPU/display surface: rendering a large-font
 * ('fontSize' >= 128) text node with the canvas text renderer can cause
 * `OffscreenCanvas.transferToImageBitmap()` to throw
 * "Failed to execute 'transferToImageBitmap' on 'OffscreenCanvas':
 * ImageBitmap construction failed". That error used to escape `renderText()`
 * uncaught, which wedges the whole render/update loop (no further frames or
 * 'idle' events).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CanvasTextRenderer from '../CanvasTextRenderer.js';
import * as CanvasFontHandler from '../CanvasFontHandler.js';
import type { Stage } from '../../Stage.js';
import type { CoreTextNodeProps } from '../../CoreTextNode.js';

/**
 * Minimal 2D context stub, shared between the draw canvas and the measure
 * canvas (mirrors the real renderer, which uses one context per canvas).
 */
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

/**
 * Fake OffscreenCanvas-like object. `transferToImageBitmap` is swapped per
 * test to simulate the sandboxed-environment failure.
 */
class FakeOffscreenCanvas {
  width = 0;
  height = 0;
  private ctx = new FakeContext();
  getContext() {
    return this.ctx;
  }
  transferToImageBitmap(): ImageBitmap {
    return {} as ImageBitmap;
  }
}

if (typeof globalThis.OffscreenCanvas === 'undefined') {
  (globalThis as unknown as { OffscreenCanvas: unknown }).OffscreenCanvas =
    FakeOffscreenCanvas;
}

const makeStage = (): Stage => {
  return {
    options: { devicePhysicalPixelRatio: 1 },
    platform: {
      createOffscreenCanvas: () => new FakeOffscreenCanvas(),
      createCanvas: () => new FakeOffscreenCanvas(),
      loadFontFace: vi.fn().mockResolvedValue(null),
    },
  } as unknown as Stage;
};

const baseProps = {
  text: 'Hello',
  fontFamily: 'BigFont',
  fontStyle: 'normal',
  fontSize: 128,
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

describe('CanvasTextRenderer renderText — OffscreenCanvas snapshot failure', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    CanvasTextRenderer.clearCache();
  });

  it('does not throw and returns imageData: null when transferToImageBitmap fails', async () => {
    const stage = makeStage();

    // Make the font "loaded" so renderText doesn't bail out waiting on it.
    await CanvasFontHandler.loadFont(stage, {
      fontFamily: 'BigFont',
      fontUrl: 'http://example.com/big.woff2',
    });
    CanvasFontHandler.requestLoad(stage, 'BigFont');
    await vi.waitFor(() => {
      expect(CanvasFontHandler.isFontLoaded('BigFont')).toBe(true);
    });

    CanvasTextRenderer.init(stage);

    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {
      /* no-op */
    });

    // Simulate the sandboxed-environment failure.
    vi.spyOn(
      FakeOffscreenCanvas.prototype,
      'transferToImageBitmap',
    ).mockImplementation(() => {
      throw new Error(
        "Failed to execute 'transferToImageBitmap' on 'OffscreenCanvas': ImageBitmap construction failed",
      );
    });

    let result: ReturnType<typeof CanvasTextRenderer.renderText> | undefined;
    expect(() => {
      result = CanvasTextRenderer.renderText(baseProps);
    }).not.toThrow();

    expect(result).toBeDefined();
    expect(result!.type).toBe('canvas');
    expect((result as { imageData?: unknown }).imageData).toBeNull();
    expect(consoleWarn).toHaveBeenCalled();
  });

  it('still produces imageData when transferToImageBitmap succeeds', async () => {
    const stage = makeStage();
    await CanvasFontHandler.loadFont(stage, {
      fontFamily: 'BigFont2',
      fontUrl: 'http://example.com/big2.woff2',
    });
    CanvasFontHandler.requestLoad(stage, 'BigFont2');
    await vi.waitFor(() => {
      expect(CanvasFontHandler.isFontLoaded('BigFont2')).toBe(true);
    });

    CanvasTextRenderer.init(stage);

    const result = CanvasTextRenderer.renderText({
      ...baseProps,
      fontFamily: 'BigFont2',
    } as CoreTextNodeProps);

    expect(result.type).toBe('canvas');
    expect((result as { imageData?: unknown }).imageData).toBeDefined();
    expect((result as { imageData?: unknown }).imageData).not.toBeNull();
  });
});
