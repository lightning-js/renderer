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

import type { WebGlContextWrapper } from '../../../lib/WebGlContextWrapper.js';

export interface CoreWebGlParameters {
  MAX_RENDERBUFFER_SIZE: number;
  MAX_TEXTURE_SIZE: number;
  MAX_VIEWPORT_DIMS: Int32Array;
  MAX_VERTEX_TEXTURE_IMAGE_UNITS: number;
  MAX_TEXTURE_IMAGE_UNITS: number;
  MAX_COMBINED_TEXTURE_IMAGE_UNITS: number;
  MAX_VERTEX_ATTRIBS: number;
  MAX_VARYING_VECTORS: number;
  MAX_VERTEX_UNIFORM_VECTORS: number;
  MAX_FRAGMENT_UNIFORM_VECTORS: number;
}

/**
 * Get device specific webgl parameters
 * @param glw
 */
export function getWebGlParameters(
  glw: WebGlContextWrapper,
): CoreWebGlParameters {
  const params: CoreWebGlParameters = {
    MAX_RENDERBUFFER_SIZE: 0,
    MAX_TEXTURE_SIZE: 0,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    MAX_VIEWPORT_DIMS: 0 as any, // Code below will replace this with an Int32Array
    MAX_VERTEX_TEXTURE_IMAGE_UNITS: 0,
    MAX_TEXTURE_IMAGE_UNITS: 0,
    MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0,
    MAX_VERTEX_ATTRIBS: 0,
    MAX_VARYING_VECTORS: 0,
    MAX_VERTEX_UNIFORM_VECTORS: 0,
    MAX_FRAGMENT_UNIFORM_VECTORS: 0,
  };

  // Map over all parameters and get them
  const keys = Object.keys(params) as Array<keyof CoreWebGlParameters>;
  keys.forEach((key) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    params[key] = glw.getParameter(glw[key]);
  });

  return params;
}

export interface CoreWebGlExtensions {
  ANGLE_instanced_arrays: ANGLE_instanced_arrays | null;
  WEBGL_compressed_texture_s3tc: WEBGL_compressed_texture_s3tc | null;
  WEBGL_compressed_texture_astc: WEBGL_compressed_texture_astc | null;
  WEBGL_compressed_texture_etc: WEBGL_compressed_texture_etc | null;
  WEBGL_compressed_texture_etc1: WEBGL_compressed_texture_etc1 | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  WEBGL_compressed_texture_pvrtc: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  WEBKIT_WEBGL_compressed_texture_pvrtc: any | null;
  WEBGL_compressed_texture_s3tc_srgb: WEBGL_compressed_texture_s3tc_srgb | null;
  OES_vertex_array_object: OES_vertex_array_object | null;
}

/**
 * Get device webgl extensions
 * @param glw
 */
export function getWebGlExtensions(
  glw: WebGlContextWrapper,
): CoreWebGlExtensions {
  const extensions: CoreWebGlExtensions = {
    ANGLE_instanced_arrays: null,
    WEBGL_compressed_texture_s3tc: null,
    WEBGL_compressed_texture_astc: null,
    WEBGL_compressed_texture_etc: null,
    WEBGL_compressed_texture_etc1: null,
    WEBGL_compressed_texture_pvrtc: null,
    WEBKIT_WEBGL_compressed_texture_pvrtc: null,
    WEBGL_compressed_texture_s3tc_srgb: null,
    OES_vertex_array_object: null,
  };

  // Map over all extensions and get them
  const keys = Object.keys(extensions) as Array<keyof CoreWebGlExtensions>;
  keys.forEach((key) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    extensions[key] = glw.getExtension(key);
  });

  return extensions;
}

/**
 * Allocate big memory chunk that we
 * can re-use to draw quads
 *
 * @param glw
 * @param size
 */
export function createIndexBuffer(glw: WebGlContextWrapper, size: number) {
  const maxQuads = ~~(size / 80);
  const indices = new Uint16Array(maxQuads * 6);

  for (let i = 0, j = 0; i < maxQuads; i += 6, j += 4) {
    indices[i] = j;
    indices[i + 1] = j + 1;
    indices[i + 2] = j + 2;
    indices[i + 3] = j + 2;
    indices[i + 4] = j + 1;
    indices[i + 5] = j + 3;
  }

  const buffer = glw.createBuffer();
  glw.elementArrayBufferData(buffer, indices, glw.STATIC_DRAW);
}

/**
 * Checks if an object is of type HTMLImageElement.
 * This is used because we cant check for HTMLImageElement directly when the
 * renderer is running in a seperate web worker context.
 *
 * @param obj
 * @returns
 */
export function isHTMLImageElement(obj: unknown): obj is HTMLImageElement {
  return (
    obj !== null &&
    ((typeof obj === 'object' &&
      obj.constructor &&
      obj.constructor.name === 'HTMLImageElement') ||
      (typeof HTMLImageElement !== 'undefined' &&
        obj instanceof HTMLImageElement))
  );
}

export interface WebGlColor {
  raw: number;
  normalized: [number, number, number, number];
}
