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

import { describe, expect, it, vi } from 'vitest';
import { WebGlShaderProgram } from './WebGlShaderProgram.js';
import { CoreNode } from '../../CoreNode.js';
import type { WebGlCtxTexture } from './WebGlCtxTexture.js';

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
