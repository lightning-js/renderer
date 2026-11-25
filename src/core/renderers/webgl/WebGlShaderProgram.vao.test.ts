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

/**
 * Per-program VAO reuse tests: on WebGL2, once a program's VAO is configured
 * for a buffer collection layout, rebinding the same collection must not
 * re-issue enable/pointer calls; a different collection or a layout-version
 * bump must reconfigure. On WebGL1 the wrapper-level shadow state handles the
 * skipping instead.
 */
import { describe, expect, it, vi } from 'vitest';
import { WebGlShaderProgram } from './WebGlShaderProgram.js';
import { BufferCollection } from './internal/BufferCollection.js';
import type { WebGlRenderer } from './WebGlRenderer.js';

const makeGlw = (isWebGl2: boolean) => ({
  isWebGl2,
  createVertexArray: vi.fn(() => ({ vao: true })),
  bindVertexArray: vi.fn(),
  deleteVertexArray: vi.fn(),
  enableVertexAttribArray: vi.fn(),
  disableVertexAttribArray: vi.fn(),
  vertexAttribPointer: vi.fn(),
  bindElementArrayBuffer: vi.fn(),
  useProgram: vi.fn(),
  deleteProgram: vi.fn(),
  deleteBuffer: vi.fn(),
});

const makeProgram = (isWebGl2: boolean) => {
  const program = Object.create(
    WebGlShaderProgram.prototype,
  ) as WebGlShaderProgram;
  const glw = makeGlw(isWebGl2);
  const indexBuffer = {} as WebGLBuffer;
  const renderer = { indexBuffer } as unknown as WebGlRenderer;
  (program as any).glw = glw;
  (program as any).renderer = renderer;
  (program as any).attributeLocations = ['a_position', 'a_nodeCoords'];
  (program as any).program = { prog: true } as unknown as WebGLProgram;
  (program as any).uniformLocations = {};
  (program as any).isDestroyed = false;
  return { program, glw, indexBuffer };
};

const makeCollection = () => {
  const quadBuffer = { id: 'quad' } as unknown as WebGLBuffer;
  const coordsBuffer = { id: 'coords' } as unknown as WebGLBuffer;
  const info = (name: string, offset: number) => ({
    name,
    size: 2,
    type: 0x1406,
    normalized: false,
    stride: 20,
    offset,
  });
  return new BufferCollection([
    { buffer: quadBuffer, attributes: { a_position: info('a_position', 0) } },
    {
      buffer: coordsBuffer,
      attributes: { a_nodeCoords: info('a_nodeCoords', 8) },
    },
  ]);
};

describe('WebGlShaderProgram VAO reuse (WebGL2)', () => {
  it('configures the program VAO once per buffer collection layout', () => {
    const { program, glw } = makeProgram(true);
    const collection = makeCollection();

    program.attach();
    expect(glw.createVertexArray).toHaveBeenCalledTimes(1);
    expect(glw.bindVertexArray).toHaveBeenCalledTimes(1);

    program.bindBufferCollection(collection);
    expect(glw.enableVertexAttribArray).toHaveBeenCalledTimes(2);
    expect(glw.vertexAttribPointer).toHaveBeenCalledTimes(2);
    // The shared index buffer is captured into the VAO.
    expect(glw.bindElementArrayBuffer).toHaveBeenCalledTimes(1);

    // Same collection, same layout: no attribute calls at all.
    program.bindBufferCollection(collection);
    expect(glw.enableVertexAttribArray).toHaveBeenCalledTimes(2);
    expect(glw.vertexAttribPointer).toHaveBeenCalledTimes(2);
    expect(glw.bindElementArrayBuffer).toHaveBeenCalledTimes(1);
    // The VAO is still (re)bound for the draw.
    expect(glw.bindVertexArray).toHaveBeenCalledTimes(3);
  });

  it('reconfigures when a different collection is bound or the layout version bumps', () => {
    const { program, glw } = makeProgram(true);
    const collectionA = makeCollection();
    const collectionB = makeCollection();

    program.bindBufferCollection(collectionA);
    program.bindBufferCollection(collectionB);
    expect(glw.vertexAttribPointer).toHaveBeenCalledTimes(4);
    expect(glw.bindElementArrayBuffer).toHaveBeenCalledTimes(2);

    // Same collection but bumped layout version: reconfigure.
    collectionB.invalidateLayout();
    program.bindBufferCollection(collectionB);
    expect(glw.vertexAttribPointer).toHaveBeenCalledTimes(6);

    // And cached again afterwards.
    program.bindBufferCollection(collectionB);
    expect(glw.vertexAttribPointer).toHaveBeenCalledTimes(6);
  });

  it('detach unbinds the VAO without disabling its attributes; destroy deletes it', () => {
    const { program, glw } = makeProgram(true);
    program.attach();
    program.bindBufferCollection(makeCollection());

    program.detach();
    expect(glw.bindVertexArray).toHaveBeenLastCalledWith(null);
    expect(glw.disableVertexAttribArray).not.toHaveBeenCalled();

    (program as any).renderer = {
      indexBuffer: {} as WebGLBuffer,
      untrackShaderProgram: vi.fn(),
    } as unknown as WebGlRenderer;
    program.destroy();
    expect(glw.deleteVertexArray).toHaveBeenCalledTimes(1);
    expect((program as any).vao).toBeUndefined();
  });
});

describe('WebGlShaderProgram attribute binding (WebGL1 fallback)', () => {
  it('programs attributes through the wrapper on every bind', () => {
    const { program, glw } = makeProgram(false);
    const collection = makeCollection();

    program.bindBufferCollection(collection);
    program.bindBufferCollection(collection);
    // No VAO is created on WebGL1; the wrapper shadow state does the skipping.
    expect(glw.createVertexArray).not.toHaveBeenCalled();
    expect(glw.bindVertexArray).not.toHaveBeenCalled();
    expect(glw.bindElementArrayBuffer).not.toHaveBeenCalled();
    expect(glw.enableVertexAttribArray).toHaveBeenCalledTimes(4);
    expect(glw.vertexAttribPointer).toHaveBeenCalledTimes(4);
  });
});
