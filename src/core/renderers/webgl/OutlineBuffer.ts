/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2026 Comcast Cable Communications, LLC.
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
import { BufferCollection } from './internal/BufferCollection.js';
import { getMaxQuads } from './internal/RendererUtils.js';

/**
 * Floats per vertex of the dedicated outline GPU layout:
 * a_position (2) + a_textureCoords (2) + a_color (1 packed uint32) +
 * a_dimensions (2). a_nodeCoords comes from the renderer's shared static VBO.
 */
export const OUTLINE_FLOATS_PER_VERTEX = 7;

/**
 * Bytes per quad in the outline buffer (4 vertices per quad).
 */
export const OUTLINE_BYTES_PER_QUAD =
  OUTLINE_FLOATS_PER_VERTEX * 4 * Float32Array.BYTES_PER_ELEMENT;

/**
 * A dedicated quad buffer for nodes using the lightweight Outline shader.
 *
 * @remarks
 * The common quad format has no room for the per-node dimension data the
 * Outline shader needs to batch mixed-size nodes without per-node uniforms,
 * so outline quads live in their own buffer with an extended 7-float vertex
 * stride. Quads from every outline node in a frame are appended here and
 * drawn through batched OutlineRenderOps using the shared element index
 * buffer.
 *
 * The whole used range is re-uploaded with one `bufferData` per pass (main
 * scene and each RTT pass), mirroring the RTT buffer strategy — outline
 * nodes are expected to be fully dynamic in the moving-rectangle workloads
 * this primitive targets.
 */
export class OutlineBuffer {
  buffer: ArrayBuffer;
  fBuffer: Float32Array;
  uiBuffer: Uint32Array;
  /** Write cursor in float32 units. Reset to 0 at the start of each pass. */
  idx = 0;
  /** Maximum number of quads addressable by the shared Uint16 index buffer. */
  readonly maxQuads: number;
  readonly quadBufferCollection: BufferCollection;

  constructor(
    glw: GlContextWrapper,
    nodeCoordsBuffer: WebGLBuffer,
    quadBufferSize: number,
    bufferMemory: number,
  ) {
    // Same 16-bit index limit as the shared index buffer; also bounded by the
    // configured quad buffer memory.
    this.maxQuads = Math.min(
      getMaxQuads(bufferMemory),
      Math.floor(quadBufferSize / OUTLINE_BYTES_PER_QUAD),
    );
    this.buffer = new ArrayBuffer(this.maxQuads * OUTLINE_BYTES_PER_QUAD);
    this.fBuffer = new Float32Array(this.buffer);
    this.uiBuffer = new Uint32Array(this.buffer);

    const stride = OUTLINE_FLOATS_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT;
    const outlineGlBuffer = glw.createBuffer();
    glw.arrayBufferData(
      outlineGlBuffer,
      new Float32Array(this.maxQuads * OUTLINE_FLOATS_PER_VERTEX * 4),
      glw.DYNAMIC_DRAW,
    );

    this.quadBufferCollection = new BufferCollection([
      {
        buffer: outlineGlBuffer,
        attributes: {
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
          a_dimensions: {
            name: 'a_dimensions',
            size: 2,
            type: glw.FLOAT,
            normalized: false,
            stride,
            offset: 5 * Float32Array.BYTES_PER_ELEMENT,
          },
        },
      },
      {
        buffer: nodeCoordsBuffer,
        attributes: {
          a_nodeCoords: {
            name: 'a_nodeCoords',
            size: 2,
            type: glw.FLOAT,
            normalized: false,
            stride: 2 * Float32Array.BYTES_PER_ELEMENT,
            offset: 0,
          },
        },
      },
    ]);
  }

  /** Reset the write cursor for a new pass. */
  clear(): void {
    this.idx = 0;
  }
}
