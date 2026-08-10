/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2023 Comcast Cable Communications Management, LLC.
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
 * Z-order regression tests for SDF text.
 *
 * The renderer is a painter's-algorithm renderer: occlusion is decided purely
 * by draw order inside `renderOps`. SDF text render ops must therefore be
 * placed exactly where their node appears in the scene traversal — never
 * deferred to the end of the frame. Otherwise text at a low z-index draws over
 * a texture at a higher z-index (the "text bleeding through the menu" bug).
 *
 * These tests exercise the real `finalizeSdfBatch` on a minimal fake `this`
 * via the WebGlRenderer prototype, mirroring `WebGlRenderer.sdfBuffer.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { WebGlRenderer } from './WebGlRenderer.js';
import { SdfBuffer } from './SdfBuffer.js';
import type { GlContextWrapper } from '../../platforms/GlContextWrapper.js';
import type { WebGlCtxTexture } from './WebGlCtxTexture.js';

const makeGlw = (): GlContextWrapper =>
  ({
    FLOAT: 5126,
    UNSIGNED_BYTE: 5121,
    createBuffer: () => ({}),
    DYNAMIC_DRAW: 35048,
  } as unknown as GlContextWrapper);

const glw = makeGlw();

const NO_CLIP = { x: 0, y: 0, w: 0, h: 0, valid: false };
const atlasA = {} as WebGlCtxTexture;
const atlasB = {} as WebGlCtxTexture;

type RendererStub = {
  stage: { pixelRatio: number };
  glw: GlContextWrapper;
  sdfBufferPlain: SdfBuffer;
  sdfBufferRich: SdfBuffer;
  curSdfRenderOp: unknown;
  curRenderOp: unknown;
  renderOps: unknown[];
};

const makeRendererStub = (): RendererStub => {
  const stub = Object.create(WebGlRenderer.prototype) as RendererStub;
  stub.stage = { pixelRatio: 1 };
  stub.glw = glw;
  stub.sdfBufferPlain = new SdfBuffer(glw, 'plain');
  stub.sdfBufferRich = new SdfBuffer(glw, 'rich');
  stub.curSdfRenderOp = null;
  stub.curRenderOp = null;
  stub.renderOps = [];
  return stub;
};

const finalizeText = (
  stub: RendererStub,
  sdfBuffer: SdfBuffer,
  startQuad: number,
  glyphCount: number,
  atlas: WebGlCtxTexture = atlasA,
  clip = NO_CLIP,
): void => {
  (
    WebGlRenderer.prototype as unknown as {
      finalizeSdfBatch: (this: unknown, ...args: unknown[]) => void;
    }
  ).finalizeSdfBatch.call(
    stub,
    sdfBuffer,
    startQuad,
    glyphCount,
    atlas,
    clip,
    1, // worldAlpha
    100,
    50,
    false, // parentHasRenderTexture
    null, // framebufferDimensions
    {}, // sdfShader
  );
};

/** Simulate a non-text (image/rect) node's renderQuads pushing its op. */
const pushQuadOp = (stub: RendererStub, label: string): void => {
  stub.renderOps.push({ kind: 'quad', label });
  stub.curRenderOp = null;
};

describe('SDF text z-order', () => {
  it('draws a higher-z quad on top of lower-z SDF text', () => {
    const stub = makeRendererStub();

    // Scene order = z-order: rail text at z=0, menu fade quad at z=1.
    finalizeText(stub, stub.sdfBufferPlain, 0, 3);
    pushQuadOp(stub, 'menu-fade');

    // The quad must be drawn after (on top of) the text.
    expect(stub.renderOps[0]).toHaveProperty('numQuads', 3);
    expect(stub.renderOps[1]).toMatchObject({
      kind: 'quad',
      label: 'menu-fade',
    });
    expect(stub.renderOps.length).toBe(2);
  });

  it('draws higher-z SDF text on top of lower-z quads', () => {
    const stub = makeRendererStub();

    // Scene order: poster quad at z=0, menu label text at z=1.
    pushQuadOp(stub, 'poster');
    finalizeText(stub, stub.sdfBufferPlain, 0, 2);

    expect(stub.renderOps[0]).toMatchObject({ kind: 'quad', label: 'poster' });
    expect(stub.renderOps[1]).toHaveProperty('numQuads', 2);
  });

  it('keeps a quad sandwiched between two text runs in correct order', () => {
    const stub = makeRendererStub();

    // Scene order: text(z0), quad(z1), text(z2). Text separated by the quad
    // becomes two ops so the quad draws between them — merging it into the
    // first op would draw the higher-z text underneath the quad.
    finalizeText(stub, stub.sdfBufferPlain, 0, 2);
    pushQuadOp(stub, 'menu-fade');
    finalizeText(stub, stub.sdfBufferPlain, 2, 1);

    expect(stub.renderOps.map((op) => (op as { kind?: string }).kind)).toEqual([
      undefined, // SdfRenderOp
      'quad',
      undefined, // SdfRenderOp
    ]);
    expect(stub.renderOps[0]).toHaveProperty('startQuad', 0);
    expect(stub.renderOps[0]).toHaveProperty('numQuads', 2);
    expect(stub.renderOps[2]).toHaveProperty('startQuad', 2);
    expect(stub.renderOps[2]).toHaveProperty('numQuads', 1);
  });

  it('breaks the batch when a stencil clip op intervenes', () => {
    const stub = makeRendererStub();

    // Rounded clip: text inside the clip region, then the end-clip sentinel,
    // then text outside it. The sentinel must split the batch or the text
    // outside the clip would be pulled under the stencil region.
    finalizeText(stub, stub.sdfBufferPlain, 0, 2);
    stub.renderOps.push({ kind: 'stencil' });
    finalizeText(stub, stub.sdfBufferPlain, 2, 1);

    expect(stub.renderOps.map((op) => (op as { kind?: string }).kind)).toEqual([
      undefined, // SdfRenderOp
      'stencil',
      undefined, // SdfRenderOp
    ]);
    expect(stub.renderOps[0]).toHaveProperty('numQuads', 2);
    expect(stub.renderOps[2]).toHaveProperty('numQuads', 1);
  });

  it('still merges consecutive same-key text into a single op', () => {
    const stub = makeRendererStub();

    finalizeText(stub, stub.sdfBufferPlain, 0, 3);
    finalizeText(stub, stub.sdfBufferPlain, 3, 2);

    expect(stub.renderOps.length).toBe(1);
    expect(stub.renderOps[0]).toHaveProperty('startQuad', 0);
    expect(stub.renderOps[0]).toHaveProperty('numQuads', 5);
  });

  it('breaks the batch when an atlas change splits two text nodes', () => {
    const stub = makeRendererStub();

    finalizeText(stub, stub.sdfBufferPlain, 0, 3, atlasA);
    finalizeText(stub, stub.sdfBufferPlain, 3, 2, atlasB);

    expect(stub.renderOps.length).toBe(2);
    expect((stub.renderOps[0] as { numQuads: number }).numQuads).toBe(3);
    expect((stub.renderOps[1] as { numQuads: number }).numQuads).toBe(2);
  });
});
