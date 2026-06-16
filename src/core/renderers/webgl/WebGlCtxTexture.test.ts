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
 * Tests proving the WebGL OOM / ctxTexture undefined crash scenario.
 *
 * Crash chain being simulated:
 *   GL_OUT_OF_MEMORY from texImage2D
 *   → Texture.release() sets ctxTexture = undefined (via microtask)
 *   → WebGlRenderer.addQuad() reads tx.ctxTexture as WebGlCtxTexture (undefined)
 *   → CoreNode.addTexture(undefined) pushes undefined into renderOpTextures
 *   → WebGlShaderProgram.bindTextures() reads textures[0]!.ctxTexture
 *   → TypeError: Cannot read property 'ctxTexture' of undefined  ← CRASH
 *
 * All tests here are RED before the fix and GREEN after.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { WebGlShaderProgram } from './WebGlShaderProgram.js';
import { CoreNode } from '../../CoreNode.js';
import { WebGlCtxTexture } from './WebGlCtxTexture.js';
import type { TextureData } from '../../textures/Texture.js';

// ---------------------------------------------------------------------------
// Test 1 — bindTextures crashes when textures[0] is undefined
//
// Directly mirrors the crash from the production stack trace:
//   fb.bindTextures → textures[0]!.ctxTexture
//   → TypeError: Cannot read property 'ctxTexture' of undefined
// ---------------------------------------------------------------------------
describe('WebGlShaderProgram.bindTextures', () => {
  it('does not throw when textures[0] is undefined', () => {
    // Create a minimal instance that bypasses the GL-context-requiring constructor
    const instance = Object.create(
      WebGlShaderProgram.prototype,
    ) as WebGlShaderProgram;
    (instance as any).glw = { activeTexture: vi.fn(), bindTexture: vi.fn() };

    // After Fix B: bindTextures returns early instead of crashing
    expect(() =>
      instance.bindTextures([undefined as unknown as WebGlCtxTexture]),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Test 2 — addTexture silently accepts undefined and stores it
//
// The crash is silent at this layer: passing an undefined ctxTexture to
// CoreNode.addTexture does NOT throw — it quietly pushes undefined into
// renderOpTextures, poisoning the array for bindTextures later.
// ---------------------------------------------------------------------------
describe('CoreNode.addTexture with undefined ctxTexture', () => {
  it('accepts undefined without throwing and stores it in renderOpTextures', () => {
    // Call via prototype to avoid the complex CoreNode constructor
    const fakeCtx = { renderOpTextures: [] as WebGlCtxTexture[] };
    const idx = CoreNode.prototype.addTexture.call(
      fakeCtx,
      undefined as unknown as WebGlCtxTexture,
    );

    // No error raised here — that is the problem
    expect(idx).toBe(0);
    // undefined is now stored; any subsequent bindTextures call will crash
    expect(fakeCtx.renderOpTextures[0]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Test 3 — full crash chain: undefined ctxTexture → addTexture → bindTextures
//
// End-to-end proof that the chain fails before any fix is applied.
// ---------------------------------------------------------------------------
describe('full OOM crash chain: undefined ctxTexture → bindTextures crash', () => {
  it('does not crash when undefined ctxTexture propagates to bindTextures', () => {
    // Simulate: GPU OOM causes Texture.release() → ctxTexture = undefined
    const undefinedCtxTexture = undefined as unknown as WebGlCtxTexture;

    // Simulate: WebGlRenderer.addQuad reads tx.ctxTexture (undefined) and
    // passes it to curRenderOp.addTexture — no error thrown here
    const fakeRenderOp = { renderOpTextures: [] as WebGlCtxTexture[] };
    CoreNode.prototype.addTexture.call(fakeRenderOp, undefinedCtxTexture);

    // Confirm undefined is still sitting in renderOpTextures (addTexture is unchanged)
    expect(fakeRenderOp.renderOpTextures[0]).toBeUndefined();

    // Simulate: bindRenderOp calls bindTextures with the poisoned array
    const program = Object.create(
      WebGlShaderProgram.prototype,
    ) as WebGlShaderProgram;
    (program as any).glw = { activeTexture: vi.fn(), bindTexture: vi.fn() };

    // After Fix B: bindTextures returns early — the draw loop is protected
    expect(() =>
      program.bindTextures(fakeRenderOp.renderOpTextures),
    ).not.toThrow();
  });
});

// =============================================================================
// Tests for UNPACK_PREMULTIPLY_ALPHA_WEBGL selection in onLoadRequest
//
// The renderer uses blendFunc(ONE, ONE_MINUS_SRC_ALPHA) which requires
// premultiplied-alpha textures on the GPU. UNPACK_PREMULTIPLY_ALPHA_WEBGL
// controls whether the WebGL driver premultiplies during the CPU→GPU copy:
//
//   UNPACK = false → data is already premultiplied (skip driver step)
//   UNPACK = true  → data is straight alpha (driver premultiplies on upload)
//
// For ImageBitmap sources the WebGL spec permits drivers to ignore UNPACK, so
// premultiplication MUST happen inside createImageBitmap itself.
// TextureData.premultiplied records whether the platform did this:
//
//   true  → WebPlatform: explicit premultiplyAlpha:'premultiply' option
//   false → WebPlatformChrome50 / older WPEWebKit: no option → straight alpha
//   undef → legacy path, backwards-compatible (treated as true)
//
// For HTMLImageElement sources UNPACK is always honoured by spec; the old
// premultiplyAlpha flag governs that path unchanged.
// =============================================================================

// The real WebGL constant for UNPACK_PREMULTIPLY_ALPHA_WEBGL.
const UNPACK_PA = 0x9241;

/**
 * A stand-in for HTMLImageElement that satisfies isHTMLImageElement().
 * The function checks obj.constructor.name === 'HTMLImageElement', so
 * we rename the class using defineProperty.
 */
class FakeHTMLImageElement {
  constructor(public width = 10, public height = 10) {}
}
Object.defineProperty(FakeHTMLImageElement, 'name', {
  value: 'HTMLImageElement',
});

/**
 * Build a minimal WebGlCtxTexture instance that bypasses the real constructor
 * and has every GL method mocked. Returns the instance and a spy on pixelStorei
 * so tests can assert exactly which UNPACK value was passed.
 */
function makeCtxTextureForUnpackTest(textureData: TextureData) {
  const pixelStoreiSpy = vi.fn();

  const glw = {
    RGBA: 0x1908,
    UNSIGNED_BYTE: 0x1401,
    UNPACK_PREMULTIPLY_ALPHA_WEBGL: UNPACK_PA,
    activeTexture: vi.fn(),
    bindTexture: vi.fn(),
    texImage2D: vi.fn(),
    pixelStorei: pixelStoreiSpy,
    getError: vi.fn(() => 0),
  };

  const instance = Object.create(WebGlCtxTexture.prototype) as WebGlCtxTexture;
  (instance as any).glw = glw;
  // Provide a non-null native texture handle so onLoadRequest doesn't bail out.
  (instance as any)._nativeCtxTexture = {};
  (instance as any).state = 'loading';
  (instance as any).textureSource = { textureData };
  (instance as any).setTextureMemUse = vi.fn();

  return { instance, pixelStoreiSpy };
}

// ---------------------------------------------------------------------------
// ImageBitmap — UNPACK selection driven by premultiplied flag
// ---------------------------------------------------------------------------
describe('WebGlCtxTexture.onLoadRequest — UNPACK for ImageBitmap (premultiplied flag)', () => {
  // Stub a fake ImageBitmap class so that `tdata instanceof ImageBitmap`
  // evaluates to true inside onLoadRequest even in a Node.js test context.
  let OriginalImageBitmap: unknown;

  beforeEach(() => {
    OriginalImageBitmap = (globalThis as any).ImageBitmap;
    (globalThis as any).ImageBitmap = class FakeImageBitmap {
      width = 10;
      height = 10;
    };
  });

  afterEach(() => {
    (globalThis as any).ImageBitmap = OriginalImageBitmap;
  });

  it(
    'UNPACK = false when premultiplied is true ' +
      '(WebPlatform: createImageBitmap with premultiplyAlpha option)',
    async () => {
      // Represents the WebPlatform / ImageWorkerDefault path where
      // createImageBitmap was called with { premultiplyAlpha: 'premultiply' }.
      const bitmap = new (globalThis as any).ImageBitmap();
      const { instance, pixelStoreiSpy } = makeCtxTextureForUnpackTest({
        data: bitmap,
        premultiplyAlpha: true,
        premultiplied: true,
      });

      await instance.onLoadRequest();

      expect(pixelStoreiSpy).toHaveBeenCalledWith(UNPACK_PA, false);
    },
  );

  it(
    'UNPACK = true when premultiplied is false and premultiplyAlpha is true ' +
      '(WebPlatformChrome50 / older WPEWebKit: no-option createImageBitmap, PNG)',
    async () => {
      // Represents WebPlatformChrome50 loading a PNG. createImageBitmap(blob)
      // was called WITHOUT premultiplyAlpha option, so the browser may return
      // straight-alpha data. We need the driver to premultiply on upload.
      const bitmap = new (globalThis as any).ImageBitmap();
      const { instance, pixelStoreiSpy } = makeCtxTextureForUnpackTest({
        data: bitmap,
        premultiplyAlpha: true,
        premultiplied: false,
      });

      await instance.onLoadRequest();

      // KEY ASSERTION: this was incorrectly `false` before the fix, producing
      // straight-alpha pixels composited against ONE, ONE_MINUS_SRC_ALPHA.
      expect(pixelStoreiSpy).toHaveBeenCalledWith(UNPACK_PA, true);
    },
  );

  it(
    'UNPACK = false when premultiplied is false and premultiplyAlpha is false ' +
      '(Chrome50 non-alpha image: no premultiplication needed)',
    async () => {
      // JPEG / non-alpha image loaded via Chrome50. Neither the bitmap nor the
      // driver should premultiply anything.
      const bitmap = new (globalThis as any).ImageBitmap();
      const { instance, pixelStoreiSpy } = makeCtxTextureForUnpackTest({
        data: bitmap,
        premultiplyAlpha: false,
        premultiplied: false,
      });

      await instance.onLoadRequest();

      expect(pixelStoreiSpy).toHaveBeenCalledWith(UNPACK_PA, false);
    },
  );

  it(
    'UNPACK = false when premultiplied is undefined ' +
      '(legacy / missing flag: backwards-compatible default)',
    async () => {
      // An ImageBitmap response that predates the premultiplied flag.
      // Should behave as before (assume bitmap is already premultiplied).
      const bitmap = new (globalThis as any).ImageBitmap();
      const { instance, pixelStoreiSpy } = makeCtxTextureForUnpackTest({
        data: bitmap,
        premultiplyAlpha: true,
        // premultiplied intentionally absent
      });

      await instance.onLoadRequest();

      expect(pixelStoreiSpy).toHaveBeenCalledWith(UNPACK_PA, false);
    },
  );
});

// ---------------------------------------------------------------------------
// HTMLImageElement — UNPACK governed by premultiplyAlpha flag (unchanged path)
// ---------------------------------------------------------------------------
describe('WebGlCtxTexture.onLoadRequest — UNPACK for HTMLImageElement (premultiplyAlpha flag)', () => {
  // ImageData is a browser API not present in Node. The condition in
  // onLoadRequest evaluates `tdata instanceof ImageData` before reaching the
  // isHTMLImageElement check, so we need a stub to prevent a ReferenceError.
  let OriginalImageData: unknown;

  beforeEach(() => {
    OriginalImageData = (globalThis as any).ImageData;
    (globalThis as any).ImageData = class FakeImageData {};
  });

  afterEach(() => {
    (globalThis as any).ImageData = OriginalImageData;
  });

  it(
    'UNPACK = true when premultiplyAlpha is true ' +
      '(WebPlatformLegacy PNG: driver premultiplies on upload)',
    async () => {
      const img = new FakeHTMLImageElement();
      const { instance, pixelStoreiSpy } = makeCtxTextureForUnpackTest({
        data: img as unknown as HTMLImageElement,
        premultiplyAlpha: true,
      });

      await instance.onLoadRequest();

      expect(pixelStoreiSpy).toHaveBeenCalledWith(UNPACK_PA, true);
    },
  );

  it(
    'UNPACK = false when premultiplyAlpha is false ' +
      '(non-alpha image or SDF font atlas)',
    async () => {
      const img = new FakeHTMLImageElement();
      const { instance, pixelStoreiSpy } = makeCtxTextureForUnpackTest({
        data: img as unknown as HTMLImageElement,
        premultiplyAlpha: false,
      });

      await instance.onLoadRequest();

      expect(pixelStoreiSpy).toHaveBeenCalledWith(UNPACK_PA, false);
    },
  );
});

// ---------------------------------------------------------------------------
// Test 1 — bindTextures crashes when textures[0] is undefined
//
// Directly mirrors the crash from the production stack trace:
//   fb.bindTextures → textures[0]!.ctxTexture
//   → TypeError: Cannot read property 'ctxTexture' of undefined
// ---------------------------------------------------------------------------
describe('WebGlShaderProgram.bindTextures', () => {
  it('does not throw when textures[0] is undefined', () => {
    // Create a minimal instance that bypasses the GL-context-requiring constructor
    const instance = Object.create(
      WebGlShaderProgram.prototype,
    ) as WebGlShaderProgram;
    (instance as any).glw = { activeTexture: vi.fn(), bindTexture: vi.fn() };

    // After Fix B: bindTextures returns early instead of crashing
    expect(() =>
      instance.bindTextures([undefined as unknown as WebGlCtxTexture]),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Test 2 — addTexture silently accepts undefined and stores it
//
// The crash is silent at this layer: passing an undefined ctxTexture to
// CoreNode.addTexture does NOT throw — it quietly pushes undefined into
// renderOpTextures, poisoning the array for bindTextures later.
// ---------------------------------------------------------------------------
describe('CoreNode.addTexture with undefined ctxTexture', () => {
  it('accepts undefined without throwing and stores it in renderOpTextures', () => {
    // Call via prototype to avoid the complex CoreNode constructor
    const fakeCtx = { renderOpTextures: [] as WebGlCtxTexture[] };
    const idx = CoreNode.prototype.addTexture.call(
      fakeCtx,
      undefined as unknown as WebGlCtxTexture,
    );

    // No error raised here — that is the problem
    expect(idx).toBe(0);
    // undefined is now stored; any subsequent bindTextures call will crash
    expect(fakeCtx.renderOpTextures[0]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Test 3 — full crash chain: undefined ctxTexture → addTexture → bindTextures
//
// End-to-end proof that the chain fails before any fix is applied.
// ---------------------------------------------------------------------------
describe('full OOM crash chain: undefined ctxTexture → bindTextures crash', () => {
  it('does not crash when undefined ctxTexture propagates to bindTextures', () => {
    // Simulate: GPU OOM causes Texture.release() → ctxTexture = undefined
    const undefinedCtxTexture = undefined as unknown as WebGlCtxTexture;

    // Simulate: WebGlRenderer.addQuad reads tx.ctxTexture (undefined) and
    // passes it to curRenderOp.addTexture — no error thrown here
    const fakeRenderOp = { renderOpTextures: [] as WebGlCtxTexture[] };
    CoreNode.prototype.addTexture.call(fakeRenderOp, undefinedCtxTexture);

    // Confirm undefined is still sitting in renderOpTextures (addTexture is unchanged)
    expect(fakeRenderOp.renderOpTextures[0]).toBeUndefined();

    // Simulate: bindRenderOp calls bindTextures with the poisoned array
    const program = Object.create(
      WebGlShaderProgram.prototype,
    ) as WebGlShaderProgram;
    (program as any).glw = { activeTexture: vi.fn(), bindTexture: vi.fn() };

    // After Fix B: bindTextures returns early — the draw loop is protected
    expect(() =>
      program.bindTextures(fakeRenderOp.renderOpTextures),
    ).not.toThrow();
  });
});
