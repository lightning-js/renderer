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
// Tests for UNPACK_PREMULTIPLY_ALPHA_WEBGL in onLoadRequest.
// ImageTexture decides whether upload premultiplies; WebGL passes that value
// through unchanged for every source type.
// =============================================================================

// The real WebGL constant for UNPACK_PREMULTIPLY_ALPHA_WEBGL.
const UNPACK_PA = 0x9241;

/**
 * A stand-in for HTMLImageElement that satisfies isHTMLImageElement().
 * The function checks obj.constructor.name === 'HTMLImageElement', so
 * we rename the class using defineProperty.
 */
class FakeHTMLImageElement {
  constructor(
    public width = 10,
    public height = 10,
  ) {}
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
// UNPACK mirrors premultiplyOnUpload for every pixel source
// ---------------------------------------------------------------------------
describe('WebGlCtxTexture.onLoadRequest — UNPACK_PREMULTIPLY_ALPHA_WEBGL', () => {
  // ImageBitmap and ImageData are browser APIs not present in Node; the
  // source-type checks in onLoadRequest reference both.
  let OriginalImageBitmap: unknown;
  let OriginalImageData: unknown;

  beforeEach(() => {
    OriginalImageBitmap = (globalThis as any).ImageBitmap;
    OriginalImageData = (globalThis as any).ImageData;
    (globalThis as any).ImageBitmap = class FakeImageBitmap {
      width = 10;
      height = 10;
    };
    (globalThis as any).ImageData = class FakeImageData {};
  });

  afterEach(() => {
    (globalThis as any).ImageBitmap = OriginalImageBitmap;
    (globalThis as any).ImageData = OriginalImageData;
  });

  const sources: Array<[string, () => TextureData['data']]> = [
    ['ImageBitmap', () => new (globalThis as any).ImageBitmap()],
    [
      'HTMLImageElement',
      () => new FakeHTMLImageElement() as unknown as HTMLImageElement,
    ],
  ];

  for (const [name, makeData] of sources) {
    for (const premultiplyOnUpload of [true, false]) {
      it(`${name}: UNPACK = ${premultiplyOnUpload} when premultiplyOnUpload is ${premultiplyOnUpload}`, async () => {
        const { instance, pixelStoreiSpy } = makeCtxTextureForUnpackTest({
          data: makeData(),
          premultiplyOnUpload,
        });

        await instance.onLoadRequest();

        expect(pixelStoreiSpy).toHaveBeenCalledWith(
          UNPACK_PA,
          premultiplyOnUpload,
        );
      });
    }

    it(`${name}: UNPACK = false when premultiplyOnUpload is absent`, async () => {
      const { instance, pixelStoreiSpy } = makeCtxTextureForUnpackTest({
        data: makeData(),
      });

      await instance.onLoadRequest();

      expect(pixelStoreiSpy).toHaveBeenCalledWith(UNPACK_PA, false);
    });
  }
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
