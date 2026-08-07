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

import type { GlContextWrapper } from '../../platforms/GlContextWrapper.js';
import type { AttributeInfo } from './internal/ShaderUtils.js';
import { BufferCollection } from './internal/BufferCollection.js';

/**
 * SDF text vertex layout discriminator.
 *
 * The batched SDF pipeline uses two GPU vertex formats that can never share a
 * draw call (different strides). `plain` is used when `richText=false` and
 * drops the per-vertex style attribute to keep the VBO smaller and the
 * fragment shader minimal.
 */
export type SdfBufferLayout = 'plain' | 'rich';

/**
 * Floats per vertex of the batched SDF GPU layout.
 *
 * plain (6 floats / 24 bytes): x, y, u, v, packed_color (uint32), distRange
 * rich  (7 floats / 28 bytes): x, y, u, v, packed_color (uint32), style, distRange
 *
 * Positions are pre-transformed to world pixel space on the CPU; color is
 * packed ABGR (byte order R,G,B,A on little-endian) for a normalized
 * UNSIGNED_BYTE attribute; `distRange` is the SDF distance range for the font.
 */
export const SDF_PLAIN_FLOATS_PER_VERTEX = 6;
export const SDF_RICH_FLOATS_PER_VERTEX = 7;

/**
 * Floats per glyph of the design-unit glyph records consumed by the renderer
 * write paths.
 *
 * plain (8 floats): x, y, w, h, u, v, uw, vh
 * rich  (12 floats): x, y, w, h, u, v, uw, vh, shearTop, shearBot, packed_span_color, style
 *
 * `shearTop` / `shearBot` are the per-corner x-deltas for the italic lean
 * (sheared trapezoid glyphs and decorations); 0 for straight spans. `u = -1.0`
 * with `uw = 0` marks a solid-fill decoration quad.
 *
 * Positions are in design-unit space (the shader-free CPU transform scales by
 * `fontScale` and applies the node's 3x3 transform matrix, mirroring what the
 * old per-node SDF vertex shader did with `u_size` + `u_transform`).
 */
export const SDF_PLAIN_GLYPH_STRIDE = 8;
export const SDF_RICH_GLYPH_STRIDE = 12;

/**
 * A shared SDF vertex buffer for a single GPU layout.
 *
 * Instead of one WebGL buffer per text node, all text nodes of the same layout
 * write into one pre-allocated CPU buffer that is uploaded to the GPU in a
 * single `bufferData` per frame. Multiple quads form a single SdfRenderOp and
 * therefore a single draw call.
 *
 * The upload is skipped when the bytes provably match what the GPU already
 * holds (`changed === false` and the size matches the last upload). Every
 * write path that produces fresh bytes, shifts offsets, or grows the backing
 * store must set `changed = true`. Conservative direction: a redundant upload
 * is correct, a wrong skip is a glitch.
 */
export class SdfBuffer {
  readonly layout: SdfBufferLayout;
  readonly floatsPerVertex: number;
  buffer: ArrayBuffer;
  fBuffer: Float32Array;
  uiBuffer: Uint32Array;
  /** Write cursor in float32 units. Reset to 0 at the start of each frame. */
  idx = 0;
  /** Number of SDF quads written this frame. Quad 0 is the first vertex. */
  quadCount = 0;
  /** Whether the CPU bytes may differ from the current GPU copy. */
  changed = true;
  /** Float32 length of the last upload — the size half of the upload skip test. */
  lastUploadedSize = 0;
  readonly quadBufferCollection: BufferCollection;

  constructor(
    glw: GlContextWrapper,
    layout: SdfBufferLayout,
    initialBytes = 512 * 1024,
  ) {
    this.layout = layout;
    this.floatsPerVertex =
      layout === 'plain'
        ? SDF_PLAIN_FLOATS_PER_VERTEX
        : SDF_RICH_FLOATS_PER_VERTEX;
    this.buffer = new ArrayBuffer(initialBytes);
    this.fBuffer = new Float32Array(this.buffer);
    this.uiBuffer = new Uint32Array(this.buffer);
    const glBuffer = glw.createBuffer();
    if (glBuffer === null) {
      throw new Error('Failed to create WebGL buffer for SDF text rendering');
    }
    this.quadBufferCollection = this.createBufferCollection(glw, glBuffer);
  }

  /**
   * Grow the backing store when the required size (in float32 units) exceeds
   * the current capacity. The backing store is swapped, so any cached view
   * references must be re-read from `fBuffer`/`uiBuffer` after a call that can
   * grow. Growth produces fresh bytes and resizes the buffer, so the next
   * upload must not be skipped.
   */
  ensureCapacity(requiredFloats: number): void {
    const f = this.fBuffer;
    if (requiredFloats <= f.length) {
      return;
    }

    let newCapacity = f.length * 2;
    while (newCapacity < requiredFloats) {
      newCapacity *= 2;
    }

    const newBuffer = new ArrayBuffer(
      newCapacity * Float32Array.BYTES_PER_ELEMENT,
    );
    const newF = new Float32Array(newBuffer);
    newF.set(f);

    this.buffer = newBuffer;
    this.fBuffer = newF;
    this.uiBuffer = new Uint32Array(newBuffer);
    this.changed = true;
  }

  /** Reset the write cursor and quad counter at the start of each frame. */
  clear(): void {
    this.idx = 0;
    this.quadCount = 0;
  }

  private createBufferCollection(
    glw: GlContextWrapper,
    glBuffer: WebGLBuffer,
  ): BufferCollection {
    const floatsPerVertex = this.floatsPerVertex;
    const stride = floatsPerVertex * Float32Array.BYTES_PER_ELEMENT;
    const attributes: Record<string, AttributeInfo> = {
      a_position: {
        name: 'a_position',
        size: 2,
        type: glw.FLOAT,
        normalized: false,
        stride,
        offset: 0,
      },
      a_textureCoords: {
        name: 'a_textureCoords',
        size: 2,
        type: glw.FLOAT,
        normalized: false,
        stride,
        offset: 2 * Float32Array.BYTES_PER_ELEMENT,
      },
      a_color: {
        name: 'a_color',
        size: 4,
        type: glw.UNSIGNED_BYTE,
        normalized: true,
        stride,
        offset: 4 * Float32Array.BYTES_PER_ELEMENT,
      },
      a_distRange: {
        name: 'a_distRange',
        size: 1,
        type: glw.FLOAT,
        normalized: false,
        stride,
        offset: (floatsPerVertex - 1) * Float32Array.BYTES_PER_ELEMENT,
      },
    };

    if (this.layout === 'rich') {
      attributes['a_style'] = {
        name: 'a_style',
        size: 1,
        type: glw.FLOAT,
        normalized: false,
        stride,
        offset: 5 * Float32Array.BYTES_PER_ELEMENT,
      };
    }

    return new BufferCollection([{ buffer: glBuffer, attributes }]);
  }
}
