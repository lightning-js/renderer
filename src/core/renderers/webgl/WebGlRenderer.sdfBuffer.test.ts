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
 * Tests for the batched SDF write paths, render op grouping, and upload skip.
 *
 * A full renderer needs a live GL context, so methods are exercised on a
 * minimal fake `this` via the prototype, holding only the fields each method
 * touches. The SdfBuffer instances themselves are real (they only need
 * `glw.createBuffer()`), so cursor/growth/change-tracking behavior is the
 * production code.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { WebGlRenderer } from './WebGlRenderer.js';
import {
  SdfBuffer,
  SDF_PLAIN_FLOATS_PER_VERTEX,
  SDF_RICH_FLOATS_PER_VERTEX,
  SDF_PLAIN_GLYPH_STRIDE,
  SDF_RICH_GLYPH_STRIDE,
} from './SdfBuffer.js';
import type { GlContextWrapper } from '../../platforms/GlContextWrapper.js';
import type { WebGlCtxTexture } from './WebGlCtxTexture.js';
import type { Stage } from '../../Stage.js';
import type { WebGlShaderNode } from './WebGlShaderNode.js';
import type {
  TextLayout,
  TextRenderProps,
  SdfVertexCache,
} from '../../text-rendering/TextRenderer.js';
import * as SdfFontHandler from '../../text-rendering/SdfFontHandler.js';
import SdfTextRenderer from '../../text-rendering/SdfTextRenderer.js';

const FLOATS_PER_GLYPH_PLAIN = SDF_PLAIN_FLOATS_PER_VERTEX * 4; // 24
const FLOATS_PER_GLYPH_RICH = SDF_RICH_FLOATS_PER_VERTEX * 4; // 28

const makeGlw = () =>
  ({
    FLOAT: 5126,
    UNSIGNED_BYTE: 5121,
    createBuffer: () => ({}),
  } as unknown as GlContextWrapper);

const makeSdfBuffer = (layout: 'plain' | 'rich', initialBytes?: number) =>
  new SdfBuffer(makeGlw(), layout, initialBytes);

const NO_CLIP = { x: 0, y: 0, w: 0, h: 0, valid: false };

/**
 * Build one glyph record of design-unit data (see SdfBuffer docs for strides).
 * The packed span color is written bit-exactly via a Uint32 view so float32
 * NaN bit patterns survive (0xffffffff is a float32 NaN).
 */
const makeGlyph = (
  stride: number,
  packedSpanColor: number,
  style = 0,
): Float32Array => {
  const buf = new ArrayBuffer(stride * 4);
  const f = new Float32Array(buf);
  const u = new Uint32Array(buf);
  // x, y, w, h, u, v, uw, vh
  const fields = [0, 0, 10, 10, 0, 0, 0.1, 0.1] as const;
  for (let i = 0; i < fields.length; i++) {
    f[i] = fields[i]!;
  }
  if (stride === SDF_RICH_GLYPH_STRIDE) {
    // 12-float rich record: 8/9 = shearTop/shearBot (0 = no italic lean),
    // 10 = packed_span_color, 11 = style.
    u[10] = packedSpanColor;
    f[11] = style;
  }
  return f;
};
const IDENTITY = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);

const atlasA = {} as WebGlCtxTexture;
const atlasB = {} as WebGlCtxTexture;

type FakeFinalize = {
  finalizeSdfBatch: ReturnType<typeof vi.fn>;
};

const makeFinalizerFake = (): FakeFinalize => ({
  finalizeSdfBatch: vi.fn(),
});

const addSdfQuads = (
  fake: unknown,
  sdfBuffer: SdfBuffer,
  glyphs: Float32Array,
  glyphCount: number,
  overrides: {
    color?: number;
    worldAlpha?: number;
    distanceRange?: number;
    atlas?: WebGlCtxTexture;
    transform?: Float32Array;
  } = {},
): void => {
  const {
    color = 0xffffffff,
    worldAlpha = 1,
    distanceRange = 4,
    atlas = atlasA,
    transform = IDENTITY,
  } = overrides;
  (
    WebGlRenderer.prototype as unknown as {
      addSdfQuads: (this: unknown, ...args: unknown[]) => void;
    }
  ).addSdfQuads.call(
    fake,
    sdfBuffer,
    glyphs,
    glyphCount,
    1, // fontScale
    transform,
    color,
    worldAlpha,
    distanceRange,
    atlas,
    NO_CLIP,
    100,
    50,
    false,
    null,
    {},
  );
};

const addSdfTranslatedQuads = (
  fake: unknown,
  sdfBuffer: SdfBuffer,
  cached: Float32Array,
  numGlyphs: number,
  dx: number,
  dy: number,
): void => {
  (
    WebGlRenderer.prototype as unknown as {
      addSdfTranslatedQuads: (this: unknown, ...args: unknown[]) => void;
    }
  ).addSdfTranslatedQuads.call(
    fake,
    sdfBuffer,
    cached,
    numGlyphs,
    dx,
    dy,
    atlasA,
    NO_CLIP,
    1,
    100,
    50,
    false,
    null,
    {},
  );
};

// ---------------------------------------------------------------------------
// SdfBuffer — layouts, growth, change tracking
// ---------------------------------------------------------------------------

describe('SdfBuffer', () => {
  it('plain layout: 6 floats/vertex, no a_style attribute', () => {
    const b = makeSdfBuffer('plain');
    expect(b.floatsPerVertex).toBe(SDF_PLAIN_FLOATS_PER_VERTEX);
    expect(b.quadBufferCollection.getAttributeInfo('a_position')!.stride).toBe(
      SDF_PLAIN_FLOATS_PER_VERTEX * 4,
    );
    expect(b.quadBufferCollection.getAttributeInfo('a_style')).toBeUndefined();
  });

  it('rich layout: 7 floats/vertex, a_style at offset 5f', () => {
    const b = makeSdfBuffer('rich');
    expect(b.floatsPerVertex).toBe(SDF_RICH_FLOATS_PER_VERTEX);
    expect(b.quadBufferCollection.getAttributeInfo('a_style')).toBeDefined();
    expect(b.quadBufferCollection.getAttributeInfo('a_style')!.offset).toBe(
      5 * 4,
    );
    expect(b.quadBufferCollection.getAttributeInfo('a_distRange')!.offset).toBe(
      6 * 4,
    );
  });

  it('clear resets the cursor but not the changed flag', () => {
    const b = makeSdfBuffer('plain');
    b.idx = 100;
    b.quadCount = 5;
    b.changed = false;
    b.clear();
    expect(b.idx).toBe(0);
    expect(b.quadCount).toBe(0);
    // changed is preserved — a later identical fill may still skip safely.
    expect(b.changed).toBe(false);
  });

  it('ensureCapacity is a no-op when the data fits', () => {
    const b = makeSdfBuffer('plain');
    const before = b.fBuffer;
    b.changed = false;
    b.ensureCapacity(10);
    expect(b.fBuffer).toBe(before);
    expect(b.changed).toBe(false);
  });

  it('ensureCapacity doubles and preserves content, marking changed', () => {
    const b = makeSdfBuffer('plain', 1024); // 256 floats
    b.fBuffer[0] = 42;
    b.fBuffer[1] = -7;
    b.changed = false;
    b.ensureCapacity(200); // fits in 256 floats — no growth
    expect(b.changed).toBe(false);
    b.ensureCapacity(300); // > capacity — doubles to 512 floats
    expect(b.changed).toBe(true);
    expect(b.fBuffer.length).toBeGreaterThanOrEqual(300);
    expect(b.fBuffer[0]).toBe(42);
    expect(b.fBuffer[1]).toBe(-7);
  });
});

// ---------------------------------------------------------------------------
// addSdfQuads — per-glyph CPU transform into the shared buffer
// ---------------------------------------------------------------------------

describe('WebGlRenderer.addSdfQuads', () => {
  it('writes a plain glyph (24 floats) with transformed world position', () => {
    const fake = makeFinalizerFake();
    const b = makeSdfBuffer('plain');
    const glyphs = makeGlyph(SDF_PLAIN_GLYPH_STRIDE, 0);

    addSdfQuads(fake, b, glyphs, 1);

    const f = b.fBuffer;
    expect([f[0], f[1]]).toEqual([0, 0]); // TL
    expect([f[6], f[7]]).toEqual([10, 0]); // TR
    expect([f[12], f[13]]).toEqual([0, 10]); // BL
    expect([f[18], f[19]]).toEqual([10, 10]); // BR
    expect([f[2], f[3], f[5]]).toEqual([0, 0, 4]); // uv, distRange
    expect(b.idx).toBe(FLOATS_PER_GLYPH_PLAIN);
    expect(b.quadCount).toBe(1);
    expect(b.changed).toBe(true);
    expect(fake.finalizeSdfBatch).toHaveBeenCalledTimes(1);
  });

  it('writes a rich glyph (28 floats) with style and merged span color', () => {
    const fake = makeFinalizerFake();
    const b = makeSdfBuffer('rich');
    // Node color red RGBA(255,0,0,255) packed = 0xff0000ff; span green
    // RGBA(0,255,0,255) packed = 0xff00ff00. Multiplicative merge → black.
    const glyphs = makeGlyph(SDF_RICH_GLYPH_STRIDE, 0xff00ff00, 3);

    addSdfQuads(fake, b, glyphs, 1, { color: 0xff0000ff });

    expect(b.idx).toBe(FLOATS_PER_GLYPH_RICH);
    // Merge rounds 255*255 → 254, so RGBA(0,0,0,254): 0xfe000000
    expect(b.uiBuffer[4]).toBe(0xfe000000);
    expect([b.fBuffer[5], b.fBuffer[6]]).toEqual([3, 4]); // style, distRange
    expect(b.quadCount).toBe(1);
  });

  it('appends after existing content (startQuad continues)', () => {
    const fake = makeFinalizerFake();
    const b = makeSdfBuffer('plain');
    const glyphs = makeGlyph(SDF_PLAIN_GLYPH_STRIDE, 0);

    addSdfQuads(fake, b, glyphs, 1);
    addSdfQuads(fake, b, glyphs, 1);

    expect(b.idx).toBe(FLOATS_PER_GLYPH_PLAIN * 2);
    expect(b.quadCount).toBe(2);
    // finalizeSdfBatch(sdfBuffer, startQuad, glyphCount, …)
    expect(fake.finalizeSdfBatch.mock.calls[0]![1]).toBe(0);
    expect(fake.finalizeSdfBatch.mock.calls[1]![1]).toBe(1);
  });

  it('is a no-op for zero glyphs', () => {
    const fake = makeFinalizerFake();
    const b = makeSdfBuffer('plain');
    b.changed = false;
    const glyphs = makeGlyph(SDF_PLAIN_GLYPH_STRIDE, 0);

    addSdfQuads(fake, b, glyphs, 0);

    expect(b.idx).toBe(0);
    expect(b.changed).toBe(false);
    expect(fake.finalizeSdfBatch).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// addSdfTranslatedQuads — scroll fast path
// ---------------------------------------------------------------------------

describe('WebGlRenderer.addSdfTranslatedQuads', () => {
  const makeCachedGlyph = (color: number, rich: boolean): Float32Array => {
    const vpf = rich ? SDF_RICH_FLOATS_PER_VERTEX : SDF_PLAIN_FLOATS_PER_VERTEX;
    const buf = new ArrayBuffer(vpf * 4 * 4);
    const f = new Float32Array(buf);
    const u = new Uint32Array(buf);
    const corners = [
      [10, 20],
      [30, 20],
      [10, 40],
      [30, 40],
    ];
    for (let v = 0; v < 4; v++) {
      const i = v * vpf;
      f[i] = corners[v]![0]!;
      f[i + 1] = corners[v]![1]!;
      f[i + 2] = 0.1;
      f[i + 3] = 0.2;
      u[i + 4] = color;
      if (rich) {
        f[i + 5] = 2;
        f[i + 6] = 4;
      } else {
        f[i + 5] = 4;
      }
    }
    return f;
  };

  it('shifts positions by (dx, dy) and marks changed', () => {
    const fake = makeFinalizerFake();
    const b = makeSdfBuffer('plain');
    const cached = makeCachedGlyph(0x00ff00ff, false);

    addSdfTranslatedQuads(fake, b, cached, 1, 5, -3);

    const f = b.fBuffer;
    expect([f[0], f[1]]).toEqual([15, 17]);
    expect([f[6], f[7]]).toEqual([35, 17]);
    expect([f[12], f[13]]).toEqual([15, 37]);
    expect([f[18], f[19]]).toEqual([35, 37]);
    // UVs, color, distRange untouched (float32-rounded source values)
    expect([f[2], f[3], f[5]]).toEqual([Math.fround(0.1), Math.fround(0.2), 4]);
    expect(b.idx).toBe(FLOATS_PER_GLYPH_PLAIN);
    expect(b.quadCount).toBe(1);
    expect(b.changed).toBe(true);
    expect(fake.finalizeSdfBatch).toHaveBeenCalledTimes(1);
    // Source cache untouched
    expect(cached[0]).toBe(10);
    expect(cached[1]).toBe(20);
  });

  it('preserves packed color bits exactly, including float32 NaN patterns', () => {
    const fake = makeFinalizerFake();
    const b = makeSdfBuffer('rich');
    // 0xffffffff is a float32 NaN bit pattern — element-wise float copies
    // could canonicalize it; the memcpy must not.
    const cached = makeCachedGlyph(0xffffffff, true);

    addSdfTranslatedQuads(fake, b, cached, 1, 100, 200);

    for (let v = 0; v < 4; v++) {
      expect(b.uiBuffer[v * SDF_RICH_FLOATS_PER_VERTEX + 4]).toBe(0xffffffff);
    }
  });

  it('is a no-op for zero glyphs', () => {
    const fake = makeFinalizerFake();
    const b = makeSdfBuffer('plain');
    b.changed = false;
    const cached = makeCachedGlyph(0x000000ff, false);

    addSdfTranslatedQuads(fake, b, cached, 0, 5, 5);

    expect(b.idx).toBe(0);
    expect(b.changed).toBe(false); // nothing written — no fresh bytes
    expect(fake.finalizeSdfBatch).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// addSdfCachedQuads — exact cache hits must NOT mark changed
// ---------------------------------------------------------------------------

describe('WebGlRenderer.addSdfCachedQuads', () => {
  it('memcpys identical bytes without raising the changed flag', () => {
    const fake = makeFinalizerFake();
    const b = makeSdfBuffer('plain');
    b.changed = false;
    const buf = new ArrayBuffer(FLOATS_PER_GLYPH_PLAIN * 4);
    const f = new Float32Array(buf);
    const u = new Uint32Array(buf);
    for (let v = 0; v < 4; v++) {
      const i = v * SDF_PLAIN_FLOATS_PER_VERTEX;
      f[i] = v * 10;
      f[i + 1] = 20;
      u[i + 4] = 0xffffffff; // NaN bit pattern
      f[i + 5] = 4;
    }

    (
      WebGlRenderer.prototype as unknown as {
        addSdfCachedQuads: (this: unknown, ...args: unknown[]) => void;
      }
    ).addSdfCachedQuads.call(
      fake,
      b,
      f,
      1,
      atlasA,
      NO_CLIP,
      1,
      100,
      50,
      false,
      null,
      {},
    );

    expect(b.idx).toBe(FLOATS_PER_GLYPH_PLAIN);
    expect(b.quadCount).toBe(1);
    expect(b.changed).toBe(false); // cache-hit memcpy — upload may be skipped
    expect(b.uiBuffer[4]).toBe(0xffffffff); // bits preserved
    expect(fake.finalizeSdfBatch).toHaveBeenCalledTimes(1);
  });

  it('is a no-op for zero glyphs', () => {
    const fake = makeFinalizerFake();
    const b = makeSdfBuffer('plain');
    b.changed = false;

    (
      WebGlRenderer.prototype as unknown as {
        addSdfCachedQuads: (this: unknown, ...args: unknown[]) => void;
      }
    ).addSdfCachedQuads.call(
      fake,
      b,
      new Float32Array(FLOATS_PER_GLYPH_PLAIN),
      0,
      atlasA,
      NO_CLIP,
      1,
      100,
      50,
      false,
      null,
      {},
    );

    expect(b.idx).toBe(0);
    expect(b.changed).toBe(false);
    expect(fake.finalizeSdfBatch).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// finalizeSdfBatch — render op grouping / merge
// ---------------------------------------------------------------------------

type RendererStub = {
  stage: { pixelRatio: number };
  glw: ReturnType<typeof makeGlw> & {
    arrayBufferData: ReturnType<typeof vi.fn>;
  };
  sdfBufferPlain: SdfBuffer;
  sdfBufferRich: SdfBuffer;
  coreTextRenderOps: unknown[];
  curSdfRenderOp: unknown;
  curRenderOp: unknown;
  renderOps: unknown[];
};

const makeRendererStub = (): RendererStub => {
  const glw = {
    FLOAT: 5126,
    UNSIGNED_BYTE: 5121,
    createBuffer: () => ({}),
    arrayBufferData: vi.fn(),
    DYNAMIC_DRAW: 35048,
  } as unknown as RendererStub['glw'];
  // Object.create so the real production methods (addSdfQuads, finalizeSdfBatch,
  // flushTextRenderOps, uploadSdfBuffer) are reachable via the prototype.
  const stub = Object.create(WebGlRenderer.prototype) as RendererStub;
  stub.stage = { pixelRatio: 1 };
  stub.glw = glw;
  stub.sdfBufferPlain = new SdfBuffer(glw, 'plain');
  stub.sdfBufferRich = new SdfBuffer(glw, 'rich');
  stub.coreTextRenderOps = [];
  stub.curSdfRenderOp = null;
  stub.curRenderOp = null;
  stub.renderOps = [];
  return stub;
};

const finalize = (
  stub: RendererStub,
  sdfBuffer: SdfBuffer,
  startQuad: number,
  glyphCount: number,
  atlas: WebGlCtxTexture = atlasA,
  clip = NO_CLIP,
): void => {
  (
    stub as unknown as {
      finalizeSdfBatch: (this: unknown, ...args: unknown[]) => void;
    }
  ).finalizeSdfBatch.call(
    stub,
    sdfBuffer,
    startQuad,
    glyphCount,
    atlas,
    clip,
    1,
    100,
    50,
    false,
    null,
    {},
  );
};

describe('WebGlRenderer.finalizeSdfBatch', () => {
  it('merges into the current op when buffer, atlas and clip match', () => {
    const stub = makeRendererStub();

    finalize(stub, stub.sdfBufferPlain, 0, 3);
    finalize(stub, stub.sdfBufferPlain, 3, 2);

    expect(stub.coreTextRenderOps.length).toBe(1);
    const op = stub.coreTextRenderOps[0] as {
      startQuad: number;
      numQuads: number;
    };
    expect(op.startQuad).toBe(0);
    expect(op.numQuads).toBe(5);
    expect(stub.curSdfRenderOp).toBe(op);
  });

  it('breaks the batch on a different atlas texture', () => {
    const stub = makeRendererStub();

    finalize(stub, stub.sdfBufferPlain, 0, 3, atlasA);
    finalize(stub, stub.sdfBufferPlain, 3, 2, atlasB);

    expect(stub.coreTextRenderOps.length).toBe(2);
    expect((stub.coreTextRenderOps[0] as { numQuads: number }).numQuads).toBe(
      3,
    );
    expect((stub.coreTextRenderOps[1] as { numQuads: number }).numQuads).toBe(
      2,
    );
  });

  it('breaks the batch on a different clipping rect', () => {
    const stub = makeRendererStub();
    const clipB = { x: 10, y: 10, w: 50, h: 50, valid: true };

    finalize(stub, stub.sdfBufferPlain, 0, 3, atlasA, NO_CLIP);
    finalize(stub, stub.sdfBufferPlain, 3, 2, atlasA, clipB);

    expect(stub.coreTextRenderOps.length).toBe(2);
  });

  it('breaks the batch across layouts (different SdfBuffer)', () => {
    const stub = makeRendererStub();

    finalize(stub, stub.sdfBufferPlain, 0, 3);
    finalize(stub, stub.sdfBufferRich, 3, 2);

    expect(stub.coreTextRenderOps.length).toBe(2);
  });

  it('resets the regular render op chain so nodes do not extend an SDF op', () => {
    const stub = makeRendererStub();
    stub.curRenderOp = { some: 'prior-op' };

    finalize(stub, stub.sdfBufferPlain, 0, 3);

    expect(stub.curRenderOp).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// flushTextRenderOps
// ---------------------------------------------------------------------------

describe('WebGlRenderer.flushTextRenderOps', () => {
  it('moves deferred SDF ops into renderOps and clears the anchors', () => {
    const stub = makeRendererStub();
    finalize(stub, stub.sdfBufferPlain, 0, 3);
    finalize(stub, stub.sdfBufferRich, 3, 2);
    stub.curRenderOp = { some: 'prior-op' };

    (
      stub as unknown as { flushTextRenderOps: () => void }
    ).flushTextRenderOps();

    expect(stub.renderOps.length).toBe(2);
    expect(stub.coreTextRenderOps.length).toBe(0);
    expect(stub.curSdfRenderOp).toBeNull();
    expect(stub.curRenderOp).toBeNull();
  });

  it('is a no-op when no SDF ops are pending', () => {
    const stub = makeRendererStub();

    (
      stub as unknown as { flushTextRenderOps: () => void }
    ).flushTextRenderOps();

    expect(stub.renderOps.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// uploadSdfBuffer skip
// ---------------------------------------------------------------------------

describe('WebGlRenderer.uploadSdfBuffer skip', () => {
  const makeUploadStub = () => {
    const glw = {
      FLOAT: 5126,
      UNSIGNED_BYTE: 5121,
      DYNAMIC_DRAW: 35048,
      createBuffer: () => ({}),
      arrayBufferData: vi.fn(),
    } as unknown as RendererStub['glw'];
    const stub = makeRendererStub();
    stub.glw = glw;
    return { stub, glw };
  };

  const upload = (stub: RendererStub) => {
    (stub as unknown as { uploadSdfBuffer: () => void }).uploadSdfBuffer();
  };

  it('does nothing when no SDF glyphs were written', () => {
    const { stub, glw } = makeUploadStub();

    upload(stub);

    expect(glw.arrayBufferData).not.toHaveBeenCalled();
    // Flags preserved so a later frame with content still uploads
    expect(stub.sdfBufferPlain.changed).toBe(true);
  });

  it('uploads when changed, then skips identical follow-up frames', () => {
    const { stub, glw } = makeUploadStub();
    // 2 plain glyphs via cache hits (changed stays false)…
    stub.sdfBufferPlain.changed = false;
    stub.sdfBufferPlain.idx = FLOATS_PER_GLYPH_PLAIN * 2;

    upload(stub);
    expect(glw.arrayBufferData).toHaveBeenCalledTimes(1);
    expect(stub.sdfBufferPlain.changed).toBe(false);
    expect(stub.sdfBufferPlain.lastUploadedSize).toBe(
      FLOATS_PER_GLYPH_PLAIN * 2,
    );

    // Next frame: exact cache hits rewrote identical bytes, same size
    upload(stub);
    expect(glw.arrayBufferData).toHaveBeenCalledTimes(1);
  });

  it('uploads again when the changed flag is raised', () => {
    const { stub, glw } = makeUploadStub();
    stub.sdfBufferPlain.idx = FLOATS_PER_GLYPH_PLAIN;

    upload(stub);
    stub.sdfBufferPlain.changed = true;
    upload(stub);

    expect(glw.arrayBufferData).toHaveBeenCalledTimes(2);
  });

  it('uploads when the size differs even if the flag is clear', () => {
    const { stub, glw } = makeUploadStub();
    stub.sdfBufferPlain.idx = FLOATS_PER_GLYPH_PLAIN;

    upload(stub);
    stub.sdfBufferPlain.idx = FLOATS_PER_GLYPH_PLAIN / 2;
    upload(stub);

    expect(glw.arrayBufferData).toHaveBeenCalledTimes(2);
    expect(stub.sdfBufferPlain.lastUploadedSize).toBe(
      FLOATS_PER_GLYPH_PLAIN / 2,
    );
  });

  it('uploads each layout independently', () => {
    const { stub, glw } = makeUploadStub();
    stub.sdfBufferPlain.idx = FLOATS_PER_GLYPH_PLAIN;
    stub.sdfBufferRich.idx = FLOATS_PER_GLYPH_RICH;

    upload(stub);

    expect(glw.arrayBufferData).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// renderQuads — cache-hit offset tracking (reorder / dirty-write detection)
// ---------------------------------------------------------------------------

const GLYPH_VERTS_PLAIN = (() => {
  const f = new Float32Array(FLOATS_PER_GLYPH_PLAIN);
  for (let i = 0; i < f.length; i++) {
    f[i] = i;
  }
  return f;
})();

const makePlainLayout = (glyphCount = 1) =>
  ({
    richText: false,
    glyphCount,
    width: 100,
    height: 50,
  } as unknown as TextLayout);

const makeRenderProps = (
  cache: SdfVertexCache,
  transform?: Float32Array,
): TextRenderProps =>
  ({
    fontFamily: 'renderQuads-reorder-test',
    color: 0xffffffff,
    worldAlpha: 1,
    globalTransform: transform ?? new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
    clippingRect: NO_CLIP,
    width: 100,
    height: 50,
    parentHasRenderTexture: false,
    framebufferDimensions: null,
    sdfCache: cache,
  } as unknown as TextRenderProps);

const makeCache = (
  layout: TextLayout,
  opts: Partial<SdfVertexCache> = {},
): SdfVertexCache => ({
  vertices: GLYPH_VERTS_PLAIN,
  glyphCount: 1,
  color: 0xffffffff,
  alpha: 1,
  transform: new Float32Array([1, 0, 0, 1, 0, 0]),
  layoutRef: layout,
  lastStartQuad: 0,
  lastWriteDirty: false,
  ...opts,
});

describe('SdfTextRenderer.renderQuads cache-hit offset tracking', () => {
  const fakeShader = {} as WebGlShaderNode;
  const fakeStage = {
    shManager: {
      registerShaderType: vi.fn(),
      createShader: vi.fn(() => fakeShader),
    },
  } as unknown as Stage;

  beforeAll(() => {
    SdfTextRenderer.init(fakeStage);
    vi.spyOn(SdfFontHandler, 'getAtlas').mockReturnValue({
      ctxTexture: atlasA,
    } as never);
  });

  it('static hit at the same offset leaves the buffer unchanged (upload may skip)', () => {
    const stub = makeRendererStub();
    stub.sdfBufferPlain.changed = false;
    const layout = makePlainLayout();
    const cache = makeCache(layout);

    SdfTextRenderer.renderQuads(
      stub as unknown as never,
      layout,
      null,
      makeRenderProps(cache),
    );

    expect(stub.sdfBufferPlain.changed).toBe(false);
    expect(cache.lastStartQuad).toBe(0);
    expect(cache.lastWriteDirty).toBe(false);
  });

  it('marks the buffer changed when a reorder moves the node quad range', () => {
    const stub = makeRendererStub();
    stub.sdfBufferPlain.changed = false;
    const layout = makePlainLayout();

    // Node B writes first, occupying quad 0 at its own unchanged offset.
    SdfTextRenderer.renderQuads(
      stub as unknown as never,
      layout,
      null,
      makeRenderProps(makeCache(layout, { lastStartQuad: 0 })),
    );
    expect(stub.sdfBufferPlain.changed).toBe(false);

    // Node A previously lived at quad 0 (lastStartQuad 0) but a render-list
    // reorder now draws it after B, so it lands at quad 1. The GPU copy is
    // stale at both offsets — the buffer must be re-uploaded.
    const cacheA = makeCache(layout, { lastStartQuad: 0 });
    SdfTextRenderer.renderQuads(
      stub as unknown as never,
      layout,
      null,
      makeRenderProps(cacheA),
    );

    expect(stub.sdfBufferPlain.changed).toBe(true);
    expect(cacheA.lastStartQuad).toBe(1);
    expect(cacheA.lastWriteDirty).toBe(false);
  });

  it('re-uploads when a node returns to base after a translated frame', () => {
    const stub = makeRendererStub();
    const layout = makePlainLayout();
    const cache = makeCache(layout);

    // Translated frame: shifted bytes written, buffer marked changed.
    SdfTextRenderer.renderQuads(
      stub as unknown as never,
      layout,
      null,
      makeRenderProps(cache, new Float32Array([1, 0, 0, 0, 1, 0, 5, 10, 1])),
    );
    expect(stub.sdfBufferPlain.changed).toBe(true);
    expect(cache.lastWriteDirty).toBe(true);

    // The upload consumed the flag.
    stub.sdfBufferPlain.changed = false;

    // The node returns to its exact base position: the GPU still holds the
    // shifted bytes, so the exact cache hit must force a re-upload.
    SdfTextRenderer.renderQuads(
      stub as unknown as never,
      layout,
      null,
      makeRenderProps(cache),
    );
    expect(stub.sdfBufferPlain.changed).toBe(true);
    expect(cache.lastWriteDirty).toBe(false);
  });
});
