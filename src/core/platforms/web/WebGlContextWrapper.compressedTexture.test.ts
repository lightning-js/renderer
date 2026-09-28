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
 * Regression tests for compressed texture uploads.
 *
 * Extensions used to be enumerated eagerly in the WebGlRenderer constructor,
 * which implicitly activated every compressed-texture format enum via
 * `gl.getExtension()`. That enumeration became lazy (see
 * WebGlRenderer.lazyInit.test.ts), which meant `uploadKTX`/`uploadPVR` could
 * pass an internal format enum to `compressedTexImage2D` before the browser
 * had ever "seen" the owning extension queried — causing a driver-level
 * `INVALID_ENUM` error and a blank/missing texture. `uploadKTX`/`uploadPVR`
 * must call `getExtension()` for the format's owning extension before
 * uploading, mirroring the existing `uploadASTC` guard.
 */
import { describe, expect, it, vi } from 'vitest';
import { WebGlContextWrapper } from './WebGlContextWrapper.js';
import type { CompressedData } from '../../textures/Texture.js';

const makeMockGl = () => {
  const extensions = new Map<string, unknown>();
  const gl: any = {
    // Enum constants read out in the constructor
    ACTIVE_TEXTURE: 1,
    TEXTURE0: 2,
    MAX_TEXTURE_IMAGE_UNITS: 3,
    TEXTURE_BINDING_2D: 4,
    SCISSOR_TEST: 5,
    SCISSOR_BOX: 6,
    STENCIL_TEST: 7,
    STENCIL_FUNC: 8,
    STENCIL_REF: 9,
    STENCIL_VALUE_MASK: 10,
    STENCIL_FAIL: 11,
    STENCIL_PASS_DEPTH_FAIL: 12,
    STENCIL_PASS_DEPTH_PASS: 13,
    STENCIL_WRITEMASK: 14,
    COLOR_WRITEMASK: 15,
    BLEND: 16,
    BLEND_SRC_RGB: 17,
    BLEND_DST_RGB: 18,
    BLEND_SRC_ALPHA: 19,
    BLEND_DST_ALPHA: 20,
    ARRAY_BUFFER_BINDING: 21,
    ELEMENT_ARRAY_BUFFER_BINDING: 22,
    CURRENT_PROGRAM: 23,
    MAX_RENDERBUFFER_SIZE: 24,
    MAX_TEXTURE_SIZE: 25,
    MAX_VIEWPORT_DIMS: 26,
    MAX_VERTEX_TEXTURE_IMAGE_UNITS: 27,
    MAX_COMBINED_TEXTURE_IMAGE_UNITS: 28,
    MAX_VERTEX_ATTRIBS: 29,
    MAX_VARYING_VECTORS: 30,
    MAX_VERTEX_UNIFORM_VECTORS: 31,
    MAX_FRAGMENT_UNIFORM_VECTORS: 32,
    TEXTURE_MAG_FILTER: 33,
    TEXTURE_MIN_FILTER: 34,
    TEXTURE_WRAP_S: 35,
    TEXTURE_WRAP_T: 36,
    LINEAR: 37,
    LINEAR_MIPMAP_LINEAR: 38,
    CLAMP_TO_EDGE: 39,
    RGB: 40,
    RGBA: 41,
    UNSIGNED_BYTE: 42,
    UNPACK_PREMULTIPLY_ALPHA_WEBGL: 43,
    UNPACK_FLIP_Y_WEBGL: 44,
    FLOAT: 45,
    TRIANGLES: 46,
    UNSIGNED_SHORT: 47,
    ONE: 48,
    ONE_MINUS_SRC_ALPHA: 49,
    VERTEX_SHADER: 50,
    FRAGMENT_SHADER: 51,
    STATIC_DRAW: 52,
    COMPILE_STATUS: 53,
    LINK_STATUS: 54,
    DYNAMIC_DRAW: 55,
    COLOR_ATTACHMENT0: 56,
    INVALID_ENUM: 0x0500,
    INVALID_OPERATION: 0x0502,
    ALWAYS: 57,
    EQUAL: 58,
    KEEP: 59,
    REPLACE: 60,
    INCR: 61,
    DECR: 62,
    STENCIL_BUFFER_BIT: 63,
    TEXTURE_2D: 64,

    canvas: {},

    getParameter: vi.fn((pname: number) => {
      if (pname === gl.ACTIVE_TEXTURE) return gl.TEXTURE0;
      if (pname === gl.MAX_TEXTURE_IMAGE_UNITS) return 8;
      if (pname === gl.SCISSOR_BOX) return [0, 0, 0, 0];
      if (pname === gl.COLOR_WRITEMASK) return [true, true, true, true];
      return 0;
    }),
    isEnabled: vi.fn(() => false),
    activeTexture: vi.fn(),
    bindTexture: vi.fn(),
    texParameteri: vi.fn(),
    compressedTexImage2D: vi.fn(),
    getExtension: vi.fn((name: string) => {
      return extensions.get(name) ?? null;
    }),
    _extensions: extensions,
  };
  return gl;
};

const makeCompressedData = (
  glInternalFormat: number,
  overrides: Partial<CompressedData> = {},
): CompressedData => ({
  glInternalFormat,
  mipmaps: [new ArrayBuffer(8)],
  w: 4,
  h: 4,
  type: 'KTX',
  blockInfo: { width: 4, height: 4, bytes: 8 },
  ...overrides,
});

describe('WebGlContextWrapper compressed texture uploads', () => {
  it('uploadKTX queries WEBGL_compressed_texture_s3tc before uploading an S3TC/DXT format', () => {
    const gl = makeMockGl();
    gl._extensions.set('WEBGL_compressed_texture_s3tc', {});
    const glw = new WebGlContextWrapper(gl);
    const data = makeCompressedData(0x83f1); // COMPRESSED_RGBA_S3TC_DXT1_EXT

    glw.uploadKTX({} as WebGLTexture, data);

    expect(gl.getExtension).toHaveBeenCalledWith(
      'WEBGL_compressed_texture_s3tc',
    );
    expect(gl.compressedTexImage2D).toHaveBeenCalled();
  });

  it('uploadKTX throws instead of calling compressedTexImage2D when the S3TC extension is unavailable', () => {
    const gl = makeMockGl();
    const glw = new WebGlContextWrapper(gl);
    const data = makeCompressedData(0x83f1);

    expect(() => glw.uploadKTX({} as WebGLTexture, data)).toThrow(
      /WEBGL_compressed_texture_s3tc/,
    );
    expect(gl.compressedTexImage2D).not.toHaveBeenCalled();
  });

  it('uploadKTX queries WEBGL_compressed_texture_etc1 before uploading an ETC1 format', () => {
    const gl = makeMockGl();
    gl._extensions.set('WEBGL_compressed_texture_etc1', {});
    const glw = new WebGlContextWrapper(gl);
    const data = makeCompressedData(0x8d64); // COMPRESSED_RGB_ETC1_WEBGL

    glw.uploadKTX({} as WebGLTexture, data);

    expect(gl.getExtension).toHaveBeenCalledWith(
      'WEBGL_compressed_texture_etc1',
    );
    expect(gl.compressedTexImage2D).toHaveBeenCalled();
  });

  it('uploadPVR queries the owning extension before uploading a PVRTC format', () => {
    const gl = makeMockGl();
    gl._extensions.set('WEBGL_compressed_texture_pvrtc', {});
    const glw = new WebGlContextWrapper(gl);
    const data = makeCompressedData(0x8c02, { type: 'PVR' }); // COMPRESSED_RGBA_PVRTC_4BPPV1_IMG

    glw.uploadPVR({} as WebGLTexture, data);

    expect(gl.getExtension).toHaveBeenCalledWith(
      'WEBGL_compressed_texture_pvrtc',
    );
    expect(gl.compressedTexImage2D).toHaveBeenCalled();
  });

  it('uploadPVR throws instead of calling compressedTexImage2D when no PVRTC extension is available', () => {
    const gl = makeMockGl();
    const glw = new WebGlContextWrapper(gl);
    const data = makeCompressedData(0x8c02, { type: 'PVR' });

    expect(() => glw.uploadPVR({} as WebGLTexture, data)).toThrow(/pvrtc/i);
    expect(gl.compressedTexImage2D).not.toHaveBeenCalled();
  });

  it('uploadASTC still throws when the ASTC extension is unavailable', () => {
    const gl = makeMockGl();
    const glw = new WebGlContextWrapper(gl);
    const data = makeCompressedData(0x93b0, { type: 'ASTC' }); // COMPRESSED_RGBA_ASTC_4x4_KHR

    expect(() => glw.uploadASTC({} as WebGLTexture, data)).toThrow(/ASTC/);
    expect(gl.compressedTexImage2D).not.toHaveBeenCalled();
  });

  it('memoizes getExtension across repeated uploads of the same format', () => {
    const gl = makeMockGl();
    gl._extensions.set('WEBGL_compressed_texture_s3tc', {});
    const glw = new WebGlContextWrapper(gl);
    const data = makeCompressedData(0x83f1);

    glw.uploadKTX({} as WebGLTexture, data);
    glw.uploadKTX({} as WebGLTexture, data);

    const s3tcCalls = gl.getExtension.mock.calls.filter(
      ([name]: string[]) => name === 'WEBGL_compressed_texture_s3tc',
    );
    expect(s3tcCalls.length).toBe(1);
    expect(gl.compressedTexImage2D).toHaveBeenCalledTimes(2);
  });

  it('caches unsupported extensions so repeat uploads do not re-query GL', () => {
    const gl = makeMockGl();
    const glw = new WebGlContextWrapper(gl);
    const data = makeCompressedData(0x83f1);

    expect(() => glw.uploadKTX({} as WebGLTexture, data)).toThrow(
      /WEBGL_compressed_texture_s3tc/,
    );
    expect(() => glw.uploadKTX({} as WebGLTexture, data)).toThrow(
      /WEBGL_compressed_texture_s3tc/,
    );
    expect(gl.getExtension).toHaveBeenCalledTimes(1);
    expect(gl.compressedTexImage2D).not.toHaveBeenCalled();
  });

  it('re-queries GL after clearExtensionCache', () => {
    const gl = makeMockGl();
    gl._extensions.set('WEBGL_compressed_texture_s3tc', {});
    const glw = new WebGlContextWrapper(gl);
    const data = makeCompressedData(0x83f1);

    glw.uploadKTX({} as WebGLTexture, data);
    glw.clearExtensionCache();
    glw.uploadKTX({} as WebGLTexture, data);

    const s3tcCalls = gl.getExtension.mock.calls.filter(
      ([name]: string[]) => name === 'WEBGL_compressed_texture_s3tc',
    );
    expect(s3tcCalls.length).toBe(2);
  });

  it('uploadPVR costs a single getExtension call when the standard extension is supported', () => {
    const gl = makeMockGl();
    gl._extensions.set('WEBGL_compressed_texture_pvrtc', {});
    const glw = new WebGlContextWrapper(gl);
    const data = makeCompressedData(0x8c02, { type: 'PVR' });

    glw.uploadPVR({} as WebGLTexture, data);

    expect(gl.getExtension).toHaveBeenCalledTimes(1);
    expect(gl.getExtension).toHaveBeenCalledWith(
      'WEBGL_compressed_texture_pvrtc',
    );
  });

  it('uploadPVR falls back to the WEBKIT extension when the standard one is missing', () => {
    const gl = makeMockGl();
    gl._extensions.set('WEBKIT_WEBGL_compressed_texture_pvrtc', {});
    const glw = new WebGlContextWrapper(gl);
    const data = makeCompressedData(0x8c02, { type: 'PVR' });

    glw.uploadPVR({} as WebGLTexture, data);

    expect(gl.getExtension).toHaveBeenCalledWith(
      'WEBGL_compressed_texture_pvrtc',
    );
    expect(gl.getExtension).toHaveBeenCalledWith(
      'WEBKIT_WEBGL_compressed_texture_pvrtc',
    );
    expect(gl.compressedTexImage2D).toHaveBeenCalled();
  });
});
