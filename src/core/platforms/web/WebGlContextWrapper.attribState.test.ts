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
 * Tests for the per-VAO attribute shadow state in WebGlContextWrapper:
 * identical enable/pointer/element-buffer state must not be re-submitted to
 * the native context, while any real state transition (buffer, pointer
 * params, VAO switch, buffer deletion) must issue the native call.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebGlContextWrapper } from './WebGlContextWrapper.js';

// The wrapper detects WebGL2 via `gl instanceof WebGL2RenderingContext`, which
// is undefined in the node test environment — install a stand-in class so the
// WebGL2 paths can be exercised.
class FakeWebGL2RenderingContext {}
const g = globalThis as Record<string, unknown>;
const hadWebGL2 = 'WebGL2RenderingContext' in g;
const prevWebGL2 = g.WebGL2RenderingContext;

beforeEach(() => {
  g.WebGL2RenderingContext = FakeWebGL2RenderingContext;
});

afterAll(() => {
  if (hadWebGL2) {
    g.WebGL2RenderingContext = prevWebGL2;
  } else {
    delete g.WebGL2RenderingContext;
  }
});

const ENUMS: Record<string, number> = {
  ACTIVE_TEXTURE: 0x0b71,
  TEXTURE0: 0x84c0,
  MAX_TEXTURE_IMAGE_UNITS: 0x8872,
  TEXTURE_BINDING_2D: 0x8069,
  SCISSOR_TEST: 0x0c11,
  SCISSOR_BOX: 0x0c10,
  STENCIL_TEST: 0x0b90,
  STENCIL_FUNC: 0x0b62,
  STENCIL_REF: 0x0b63,
  STENCIL_VALUE_MASK: 0x0b64,
  STENCIL_FAIL: 0x0b61,
  STENCIL_PASS_DEPTH_FAIL: 0x0b65,
  STENCIL_PASS_DEPTH_PASS: 0x0b66,
  STENCIL_WRITEMASK: 0x0b98,
  COLOR_WRITEMASK: 0x0c23,
  BLEND: 0x0be2,
  BLEND_SRC_RGB: 0x80c9,
  BLEND_DST_RGB: 0x80c8,
  BLEND_SRC_ALPHA: 0x80cb,
  BLEND_DST_ALPHA: 0x80ca,
  ARRAY_BUFFER: 0x8892,
  ELEMENT_ARRAY_BUFFER: 0x8893,
  ARRAY_BUFFER_BINDING: 0x8894,
  ELEMENT_ARRAY_BUFFER_BINDING: 0x8895,
  CURRENT_PROGRAM: 0x8b8d,
  VERTEX_ARRAY_BINDING: 0x85b5,
  MAX_RENDERBUFFER_SIZE: 0x84e8,
  MAX_TEXTURE_SIZE: 0x0d33,
  MAX_VIEWPORT_DIMS: 0x0d3a,
  MAX_VERTEX_TEXTURE_IMAGE_UNITS: 0x8b4c,
  MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8b4d,
  MAX_VERTEX_ATTRIBS: 0x8869,
  MAX_VARYING_VECTORS: 0x8dfc,
  MAX_VERTEX_UNIFORM_VECTORS: 0x8dfb,
  MAX_FRAGMENT_UNIFORM_VECTORS: 0x8dfd,
  TEXTURE_MAG_FILTER: 0x2800,
  TEXTURE_MIN_FILTER: 0x2801,
  TEXTURE_WRAP_S: 0x2802,
  TEXTURE_WRAP_T: 0x2803,
  LINEAR: 0x2601,
  LINEAR_MIPMAP_LINEAR: 0x2703,
  CLAMP_TO_EDGE: 0x812f,
  RGB: 0x1907,
  RGBA: 0x1908,
  UNSIGNED_BYTE: 0x1401,
  UNPACK_PREMULTIPLY_ALPHA_WEBGL: 0x9241,
  UNPACK_FLIP_Y_WEBGL: 0x9240,
  FLOAT: 0x1406,
  TRIANGLES: 0x0004,
  UNSIGNED_SHORT: 0x1403,
  ONE: 1,
  ONE_MINUS_SRC_ALPHA: 0x0303,
  VERTEX_SHADER: 0x8b31,
  FRAGMENT_SHADER: 0x8b30,
  STATIC_DRAW: 0x88e4,
  COMPILE_STATUS: 0x8b81,
  LINK_STATUS: 0x8b82,
  DYNAMIC_DRAW: 0x88e8,
  COLOR_ATTACHMENT0: 0x8ce0,
  INVALID_ENUM: 0x0500,
  INVALID_OPERATION: 0x0502,
  STENCIL_BUFFER_BIT: 0x0400,
  VERTEX_ATTRIB_ARRAY_ENABLED: 0x8622,
  VERTEX_ATTRIB_ARRAY_BUFFER_BINDING: 0x889f,
  VERTEX_ATTRIB_ARRAY_SIZE: 0x8623,
  VERTEX_ATTRIB_ARRAY_TYPE: 0x8625,
  VERTEX_ATTRIB_ARRAY_NORMALIZED: 0x886a,
  VERTEX_ATTRIB_ARRAY_STRIDE: 0x8624,
  VERTEX_ATTRIB_ARRAY_POINTER: 0x8645,
};

interface MockGl {
  [key: string]: unknown;
  getParameter: ReturnType<typeof vi.fn>;
  isEnabled: ReturnType<typeof vi.fn>;
  getVertexAttrib: ReturnType<typeof vi.fn>;
  bindBuffer: ReturnType<typeof vi.fn>;
  enableVertexAttribArray: ReturnType<typeof vi.fn>;
  disableVertexAttribArray: ReturnType<typeof vi.fn>;
  vertexAttribPointer: ReturnType<typeof vi.fn>;
  bindVertexArray: ReturnType<typeof vi.fn>;
  deleteBuffer: ReturnType<typeof vi.fn>;
  deleteVertexArray: ReturnType<typeof vi.fn>;
  bufferData: ReturnType<typeof vi.fn>;
  bufferSubData: ReturnType<typeof vi.fn>;
  createBuffer: ReturnType<typeof vi.fn>;
  canvas: { width: number; height: number };
}

const makeMockGl = (isWebGl2: boolean, maxAttribs = 8): MockGl => {
  const base = isWebGl2 ? new FakeWebGL2RenderingContext() : {};
  const gl = Object.assign(base, {
    ...ENUMS,
    canvas: { width: 1920, height: 1080 },
    getParameter: vi.fn((pname: number) => {
      switch (pname) {
        case ENUMS.ACTIVE_TEXTURE:
          return ENUMS.TEXTURE0;
        case ENUMS.MAX_TEXTURE_IMAGE_UNITS:
          return 8;
        case ENUMS.MAX_VERTEX_ATTRIBS:
          return maxAttribs;
        case ENUMS.SCISSOR_BOX:
          return [0, 0, 1920, 1080];
        case ENUMS.COLOR_WRITEMASK:
          return [true, true, true, true];
        default:
          return 0;
      }
    }),
    isEnabled: vi.fn(() => false),
    getVertexAttrib: vi.fn(() => 0),
    activeTexture: vi.fn(),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    bufferSubData: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    disableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    bindVertexArray: vi.fn(),
    deleteBuffer: vi.fn(),
    deleteVertexArray: vi.fn(),
  }) as unknown as MockGl;
  return gl;
};

const FLOAT = ENUMS.FLOAT!;

describe('WebGlContextWrapper attribute shadow state (WebGL1)', () => {
  it('skips repeated enable/disable calls for identical state', () => {
    const gl = makeMockGl(false);
    const glw = new WebGlContextWrapper(gl as never);

    glw.enableVertexAttribArray(0);
    glw.enableVertexAttribArray(0);
    expect(gl.enableVertexAttribArray).toHaveBeenCalledTimes(1);

    glw.disableVertexAttribArray(0);
    glw.disableVertexAttribArray(0);
    expect(gl.disableVertexAttribArray).toHaveBeenCalledTimes(1);

    // Disabling an already-disabled location is a no-op.
    glw.disableVertexAttribArray(3);
    expect(gl.disableVertexAttribArray).toHaveBeenCalledTimes(1);
  });

  it('skips identical vertexAttribPointer calls but still binds a new ARRAY_BUFFER', () => {
    const gl = makeMockGl(false);
    const glw = new WebGlContextWrapper(gl as never);
    const bufA = {} as WebGLBuffer;
    const bufB = {} as WebGLBuffer;

    glw.vertexAttribPointer(bufA, 0, 2, FLOAT, false, 20, 0);
    glw.vertexAttribPointer(bufA, 0, 2, FLOAT, false, 20, 0);
    expect(gl.vertexAttribPointer).toHaveBeenCalledTimes(1);
    expect(gl.bindBuffer).toHaveBeenCalledTimes(1);
    expect(gl.bindBuffer).toHaveBeenLastCalledWith(ENUMS.ARRAY_BUFFER, bufA);

    // Same pointer params but different buffer: pointer re-issued AND the
    // ARRAY_BUFFER bind happens first.
    glw.vertexAttribPointer(bufB, 0, 2, FLOAT, false, 20, 0);
    expect(gl.vertexAttribPointer).toHaveBeenCalledTimes(2);
    expect(gl.bindBuffer).toHaveBeenCalledTimes(2);
    expect(gl.bindBuffer).toHaveBeenLastCalledWith(ENUMS.ARRAY_BUFFER, bufB);

    // Any single param difference re-issues the pointer call.
    glw.vertexAttribPointer(bufB, 0, 2, FLOAT, false, 20, 4);
    glw.vertexAttribPointer(bufB, 0, 4, FLOAT, false, 20, 4);
    glw.vertexAttribPointer(bufB, 0, 4, FLOAT, true, 20, 4);
    expect(gl.vertexAttribPointer).toHaveBeenCalledTimes(5);
  });

  it('keeps the ARRAY_BUFFER binding for uploads even when pointers are cached', () => {
    const gl = makeMockGl(false);
    const glw = new WebGlContextWrapper(gl as never);
    const buf = {} as WebGLBuffer;

    glw.vertexAttribPointer(buf, 0, 2, FLOAT, false, 20, 0);
    glw.arrayBufferSubData(buf, 0, new Float32Array(4));
    // Buffer already bound by the pointer call — no second bind.
    expect(gl.bindBuffer).toHaveBeenCalledTimes(1);
    expect(gl.bufferSubData).toHaveBeenCalledTimes(1);
  });

  it('re-issues pointers after the buffer is deleted', () => {
    const gl = makeMockGl(false);
    const glw = new WebGlContextWrapper(gl as never);
    const buf = {} as WebGLBuffer;

    glw.vertexAttribPointer(buf, 1, 2, FLOAT, false, 20, 0);
    glw.vertexAttribPointer(buf, 1, 2, FLOAT, false, 20, 0);
    expect(gl.vertexAttribPointer).toHaveBeenCalledTimes(1);

    glw.deleteBuffer(buf);
    glw.vertexAttribPointer(buf, 1, 2, FLOAT, false, 20, 0);
    expect(gl.vertexAttribPointer).toHaveBeenCalledTimes(2);
  });
});

describe('WebGlContextWrapper attribute shadow state (WebGL2 / VAO)', () => {
  it('tracks pointer and enable state per VAO', () => {
    const gl = makeMockGl(true);
    const glw = new WebGlContextWrapper(gl as never);
    const vaoA = {} as WebGLVertexArrayObject;
    const vaoB = {} as WebGLVertexArrayObject;
    const buf = {} as WebGLBuffer;

    glw.bindVertexArray(vaoA);
    glw.enableVertexAttribArray(0);
    glw.vertexAttribPointer(buf, 0, 2, FLOAT, false, 20, 0);
    expect(gl.enableVertexAttribArray).toHaveBeenCalledTimes(1);
    expect(gl.vertexAttribPointer).toHaveBeenCalledTimes(1);

    // Switching VAOs must re-issue the calls: VAO B starts in default state.
    glw.bindVertexArray(vaoB);
    glw.enableVertexAttribArray(0);
    glw.vertexAttribPointer(buf, 0, 2, FLOAT, false, 20, 0);
    expect(gl.enableVertexAttribArray).toHaveBeenCalledTimes(2);
    expect(gl.vertexAttribPointer).toHaveBeenCalledTimes(2);

    // Back to VAO A: everything cached, no native calls.
    glw.bindVertexArray(vaoA);
    glw.enableVertexAttribArray(0);
    glw.vertexAttribPointer(buf, 0, 2, FLOAT, false, 20, 0);
    expect(gl.enableVertexAttribArray).toHaveBeenCalledTimes(2);
    expect(gl.vertexAttribPointer).toHaveBeenCalledTimes(2);

    // Re-binding the same VAO is skipped too (vaoA, vaoB, vaoA = 3 calls).
    glw.bindVertexArray(vaoA);
    expect(gl.bindVertexArray).toHaveBeenCalledTimes(3);
  });

  it('tracks the element buffer binding per VAO', () => {
    const gl = makeMockGl(true);
    const glw = new WebGlContextWrapper(gl as never);
    const vaoA = {} as WebGLVertexArrayObject;
    const vaoB = {} as WebGLVertexArrayObject;
    const idx = {} as WebGLBuffer;

    glw.bindVertexArray(vaoA);
    glw.bindElementArrayBuffer(idx);
    glw.bindElementArrayBuffer(idx);
    expect(gl.bindBuffer).toHaveBeenCalledTimes(1);
    expect(gl.bindBuffer).toHaveBeenLastCalledWith(
      ENUMS.ELEMENT_ARRAY_BUFFER,
      idx,
    );

    glw.bindVertexArray(vaoB);
    glw.bindElementArrayBuffer(idx);
    expect(gl.bindBuffer).toHaveBeenCalledTimes(2);

    glw.bindVertexArray(vaoA);
    glw.bindElementArrayBuffer(idx);
    expect(gl.bindBuffer).toHaveBeenCalledTimes(2);
  });

  it('clears deleted-buffer references from every VAO table', () => {
    const gl = makeMockGl(true);
    const glw = new WebGlContextWrapper(gl as never);
    const vaoA = {} as WebGLVertexArrayObject;
    const vaoB = {} as WebGLVertexArrayObject;
    const buf = {} as WebGLBuffer;

    glw.bindVertexArray(vaoA);
    glw.vertexAttribPointer(buf, 0, 2, FLOAT, false, 20, 0);
    glw.bindVertexArray(vaoB);
    glw.vertexAttribPointer(buf, 0, 2, FLOAT, false, 20, 0);
    expect(gl.vertexAttribPointer).toHaveBeenCalledTimes(2);

    glw.deleteBuffer(buf);

    glw.bindVertexArray(vaoA);
    glw.vertexAttribPointer(buf, 0, 2, FLOAT, false, 20, 0);
    glw.bindVertexArray(vaoB);
    glw.vertexAttribPointer(buf, 0, 2, FLOAT, false, 20, 0);
    expect(gl.vertexAttribPointer).toHaveBeenCalledTimes(4);
  });

  it('drops the shadow table when a VAO is deleted', () => {
    const gl = makeMockGl(true);
    const glw = new WebGlContextWrapper(gl as never);
    const vaoA = {} as WebGLVertexArrayObject;
    const buf = {} as WebGLBuffer;

    glw.bindVertexArray(vaoA);
    glw.vertexAttribPointer(buf, 0, 2, FLOAT, false, 20, 0);
    glw.deleteVertexArray(vaoA);

    // After deletion the VAO is unbound; binding it again starts fresh.
    glw.bindVertexArray(vaoA);
    glw.vertexAttribPointer(buf, 0, 2, FLOAT, false, 20, 0);
    expect(gl.vertexAttribPointer).toHaveBeenCalledTimes(2);
  });
});
