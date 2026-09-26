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
 * Lazy font loading: registration defers fetch/decode until first use.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Stage } from '../../Stage.js';
import * as SdfFontHandler from '../SdfFontHandler.js';
import * as CanvasFontHandler from '../CanvasFontHandler.js';
import type { Stage as StageType } from '../../Stage.js';

const makeStage = (platform: object = {}) =>
  ({
    txManager: {
      createTexture: vi.fn(),
    },
    platform,
    fontHandlers: {
      sdf: SdfFontHandler,
      canvas: CanvasFontHandler,
    },
  } as unknown as StageType);

describe('SDF lazy font loading', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new Error('fetch should not be called'),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loadFont registers without fetching', async () => {
    const stage = makeStage();
    await Stage.prototype.loadFont.call(stage, 'sdf', {
      fontFamily: 'LazyTest',
      atlasUrl: 'http://example.com/a.png',
      atlasDataUrl: 'http://example.com/a.json',
    });

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(SdfFontHandler.isFontLoaded('LazyTest')).toBe(false);
    // Registered families are renderable (load starts on first use)
    expect(
      SdfFontHandler.canRenderFont({ fontFamily: 'LazyTest' } as never),
    ).toBe(true);
  });

  it('requestLoad starts the load once for registered families', async () => {
    const stage = makeStage();
    const fontData = {
      chars: [{ id: 65, x: 0, y: 0, width: 10, height: 10 }],
      kernings: [],
      info: {},
      common: {},
      distanceField: {},
    };
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: async () => fontData,
    } as Response);

    const texture = {
      state: 'loaded',
      setRenderableOwner: vi.fn(),
      preventCleanup: false,
      on: vi.fn(),
    };
    stage.txManager.createTexture = vi.fn().mockReturnValue(texture);

    await Stage.prototype.loadFont.call(stage, 'sdf', {
      fontFamily: 'LazyLoadMe',
      atlasUrl: 'http://example.com/b.png',
      atlasDataUrl: 'http://example.com/b.json',
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();

    SdfFontHandler.requestLoad(stage, 'LazyLoadMe');
    // Second call while loading must not start another fetch
    SdfFontHandler.requestLoad(stage, 'LazyLoadMe');

    await vi.waitFor(() => {
      expect(SdfFontHandler.isFontLoaded('LazyLoadMe')).toBe(true);
    });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('requestLoad is a no-op for unknown families', () => {
    const stage = makeStage();
    expect(() =>
      SdfFontHandler.requestLoad(stage, 'NeverRegistered'),
    ).not.toThrow();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe('Canvas lazy font loading', () => {
  it('loadFont registers without calling loadFontFace', async () => {
    const loadFontFace = vi.fn();
    const stage = makeStage({ loadFontFace });

    await Stage.prototype.loadFont.call(stage, 'canvas', {
      fontFamily: 'LazyCanvas',
      fontUrl: 'http://example.com/c.woff2',
    });

    expect(loadFontFace).not.toHaveBeenCalled();
    expect(CanvasFontHandler.isFontLoaded('LazyCanvas')).toBe(false);
  });

  it('requestLoad fetches the FontFace once', async () => {
    const loadFontFace = vi.fn().mockResolvedValue(null);
    const stage = makeStage({ loadFontFace });

    await Stage.prototype.loadFont.call(stage, 'canvas', {
      fontFamily: 'LazyCanvas2',
      fontUrl: 'http://example.com/d.woff2',
    });
    CanvasFontHandler.requestLoad(stage, 'LazyCanvas2');
    CanvasFontHandler.requestLoad(stage, 'LazyCanvas2');

    await vi.waitFor(() => {
      expect(CanvasFontHandler.isFontLoaded('LazyCanvas2')).toBe(true);
    });
    expect(loadFontFace).toHaveBeenCalledTimes(1);
  });
});

describe('Stage.ensureTextEngineInitialized', () => {
  it('initializes each engine once on demand', () => {
    const sdfInit = vi.fn();
    const canvasInit = vi.fn();
    const stage = Object.create(Stage.prototype) as Stage;
    (stage as unknown as Record<string, unknown>)['textRenderers'] = {
      sdf: { init: sdfInit },
      canvas: { init: canvasInit },
    };
    (stage as unknown as Record<string, unknown>)['initializedTextEngines'] =
      new Set<string>();

    stage.ensureTextEngineInitialized('sdf');
    stage.ensureTextEngineInitialized('sdf');
    expect(sdfInit).toHaveBeenCalledTimes(1);
    expect(canvasInit).not.toHaveBeenCalled();

    stage.ensureTextEngineInitialized('canvas');
    expect(canvasInit).toHaveBeenCalledTimes(1);
  });
});
