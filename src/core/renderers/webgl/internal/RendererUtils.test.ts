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
 * Tests for the shared quad element index buffer.
 *
 * Every quad drawn by the WebGL renderer (node quads and batched SDF glyph
 * quads alike) is indexed through this single buffer, so a short fill leaves
 * later quads pointing at zeroed indices and they silently disappear.
 */
import { describe, expect, it, vi } from 'vitest';
import { createIndexBuffer, getMaxQuads } from './RendererUtils.js';
import type { GlContextWrapper } from '../../../platforms/GlContextWrapper.js';

function captureIndices(bufferMemory: number) {
  let indices: Uint16Array | undefined;
  const glw = {
    STATIC_DRAW: 0x88e4,
    createBuffer: vi.fn(() => ({})),
    elementArrayBufferData: vi.fn((_buffer: unknown, data: Uint16Array) => {
      indices = data;
    }),
  } as unknown as GlContextWrapper;

  createIndexBuffer(glw, bufferMemory);
  expect(indices).toBeDefined();
  return indices!;
}

describe('createIndexBuffer', () => {
  it('fills indices for every quad the buffer is sized for', () => {
    const bufferMemory = 2e6;
    const maxQuads = getMaxQuads(bufferMemory);
    const indices = captureIndices(bufferMemory);

    expect(indices.length).toBe(maxQuads * 6);

    // The last quad must be indexed, not left as zeroes.
    const lastQuad = maxQuads - 1;
    const i = lastQuad * 6;
    const j = lastQuad * 4;
    expect(Array.from(indices.subarray(i, i + 6))).toEqual([
      j,
      j + 1,
      j + 2,
      j + 2,
      j + 1,
      j + 3,
    ]);
  });

  it('emits the standard two-triangle pattern for each quad', () => {
    const indices = captureIndices(2e6);
    const maxQuads = getMaxQuads(2e6);

    for (let quad = 0; quad < maxQuads; quad++) {
      const i = quad * 6;
      const j = quad * 4;
      expect(indices[i]).toBe(j);
      expect(indices[i + 1]).toBe(j + 1);
      expect(indices[i + 2]).toBe(j + 2);
      expect(indices[i + 3]).toBe(j + 2);
      expect(indices[i + 4]).toBe(j + 1);
      expect(indices[i + 5]).toBe(j + 3);
    }
  });
});

describe('getMaxQuads', () => {
  it('derives the quad count from the buffer memory budget', () => {
    expect(getMaxQuads(80 * 1000)).toBe(1000);
  });

  it('clamps to what a Uint16 index buffer can address', () => {
    // Vertex indices must stay <= 65535, so no more than 65536 / 4 quads.
    expect(getMaxQuads(1e9)).toBe(16384);

    const indices = captureIndices(1e9);
    expect(Math.max(...indices)).toBeLessThanOrEqual(65535);
  });
});
