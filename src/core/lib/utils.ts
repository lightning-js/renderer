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

import type { Vec4 } from '../renderers/webgl/internal/ShaderUtils.js';

export const PROTOCOL_REGEX = /^(data|ftps?|https?):/;

export type RGBA = [r: number, g: number, b: number, a: number];

export const getNormalizedRgbaComponents = (rgba: number): RGBA => {
  const r = rgba >>> 24;
  const g = (rgba >>> 16) & 0xff;
  const b = (rgba >>> 8) & 0xff;
  const a = rgba & 0xff;
  return [r / 255, g / 255, b / 255, a / 255];
};

export const getRgbaComponents = (rgba: number): RGBA => {
  const r = rgba >>> 24;
  const g = (rgba >>> 16) & 0xff;
  const b = (rgba >>> 8) & 0xff;
  const a = rgba & 0xff;
  return [r, g, b, a];
};

export const norm = (rgba: number): number => {
  const r = rgba >>> 24;
  const g = (rgba >>> 16) & 0xff;
  const b = (rgba >>> 8) & 0xff;
  const a = rgba & 0xff;
  const rgbaArr: RGBA = [r / 255, g / 255, b / 255, a / 255];

  rgbaArr[0] = Math.max(0, Math.min(255, rgbaArr[0]));
  rgbaArr[1] = Math.max(0, Math.min(255, rgbaArr[1]));
  rgbaArr[2] = Math.max(0, Math.min(255, rgbaArr[2]));
  rgbaArr[3] = Math.max(0, Math.min(255, rgbaArr[3]));
  let v =
    ((rgbaArr[3] | 0) << 24) +
    ((rgbaArr[0] | 0) << 16) +
    ((rgbaArr[1] | 0) << 8) +
    (rgbaArr[2] | 0);
  if (v < 0) {
    v = 0xffffffff + v + 1;
  }
  return v;
};

export function getNormalizedAlphaComponent(rgba: number): number {
  return (rgba & 0xff) / 255.0;
}

/**
 * Get a CSS color string from a RGBA color
 *
 * @param color
 * @returns
 */
export function getRgbaString(color: RGBA) {
  const r = Math.floor(color[0] * 255.0);
  const g = Math.floor(color[1] * 255.0);
  const b = Math.floor(color[2] * 255.0);
  const a = Math.floor(color[3] * 255.0);
  return `rgba(${r},${g},${b},${a.toFixed(4)})`;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RectWithValid extends Rect {
  valid: boolean;
}

export interface Bound {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface BoundWithValid extends Bound {
  valid: boolean;
}

export function createBound<T extends Bound = Bound>(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  out?: T,
): T {
  if (out) {
    out.x1 = x1;
    out.y1 = y1;
    out.x2 = x2;
    out.y2 = y2;
    return out;
  }
  return {
    x1,
    y1,
    x2,
    y2,
  } as T;
}

export function intersectBound<T extends Bound = Bound>(
  a: Bound,
  b: Bound,
  out?: T,
): T {
  const intersection = createBound(
    Math.max(a.x1, b.x1),
    Math.max(a.y1, b.y1),
    Math.min(a.x2, b.x2),
    Math.min(a.y2, b.y2),
    out,
  );
  if (intersection.x1 < intersection.x2 && intersection.y1 < intersection.y2) {
    return intersection;
  }
  return createBound(0, 0, 0, 0, intersection);
}

export function boundsOverlap(a: Bound, b: Bound): boolean {
  return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
}

export function convertBoundToRect(bound: Bound): Rect;
export function convertBoundToRect<T extends Rect = Rect>(
  bound: Bound,
  out: T,
): T;
export function convertBoundToRect(bound: Bound, out?: Rect): Rect {
  if (out) {
    out.x = bound.x1;
    out.y = bound.y1;
    out.w = bound.x2 - bound.x1;
    out.h = bound.y2 - bound.y1;
    return out;
  }
  return {
    x: bound.x1,
    y: bound.y1,
    w: bound.x2 - bound.x1,
    h: bound.y2 - bound.y1,
  };
}

export function intersectRect(a: Rect, b: Rect): Rect;
export function intersectRect<T extends Rect = Rect>(
  a: Rect,
  b: Rect,
  out: T,
): T;
export function intersectRect(a: Rect, b: Rect, out?: Rect): Rect {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const w = Math.min(a.x + a.w, b.x + b.w) - x;
  const h = Math.min(a.y + a.h, b.y + b.h) - y;
  if (w > 0 && h > 0) {
    if (out) {
      out.x = x;
      out.y = y;
      out.w = w;
      out.h = h;
      return out;
    }
    return {
      x,
      y,
      w,
      h,
    };
  }
  if (out) {
    out.x = 0;
    out.y = 0;
    out.w = 0;
    out.h = 0;
    return out;
  }
  return {
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  };
}

export function copyRect(a: Rect): Rect;
export function copyRect<T extends Rect = Rect>(a: Rect, out: T): T;
export function copyRect(a: Rect, out?: Rect): Rect {
  if (out) {
    out.x = a.x;
    out.y = a.y;
    out.w = a.w;
    out.h = a.h;
    return out;
  }
  return {
    x: a.x,
    y: a.y,
    w: a.w,
    h: a.h,
  };
}

export function compareRect(a: Rect | null, b: Rect | null): boolean {
  if (a === b) {
    return true;
  }
  if (a === null || b === null) {
    return false;
  }
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

export function boundInsideBound(bound1: Bound, bound2: Bound) {
  return (
    bound1.x1 <= bound2.x2 &&
    bound1.y1 <= bound2.y2 &&
    bound1.x2 >= bound2.x1 &&
    bound1.y2 >= bound2.y1
  );
}

export function boundLargeThanBound(bound1: Bound, bound2: Bound) {
  return (
    bound1.x1 < bound2.x1 &&
    bound1.x2 > bound2.x2 &&
    bound1.y1 < bound2.y1 &&
    bound1.y2 > bound2.y2
  );
}

export function pointInBound(x: number, y: number, bound: Bound) {
  return !(x < bound.x1 || x > bound.x2 || y < bound.y1 || y > bound.y2);
}

export function isBoundPositive(bound: Bound): boolean {
  return bound.x1 < bound.x2 && bound.y1 < bound.y2;
}

export function isRectPositive(rect: Rect): boolean {
  return rect.w > 0 && rect.h > 0;
}

/**
 * Create a preload bounds from a strict bound
 *
 * @param strictBound The strict boundary of the node
 * @param boundsMargin Boundary margin to apply to the strictBound
 * @returns
 */
export function createPreloadBounds(
  strictBound: Bound,
  boundsMargin: [number, number, number, number],
): Bound {
  return createBound(
    strictBound.x1 - boundsMargin[3],
    strictBound.y1 - boundsMargin[0],
    strictBound.x2 + boundsMargin[1],
    strictBound.y2 + boundsMargin[2],
  );
}

export function convertUrlToAbsolute(url: string): string {
  // handle local file imports if the url isn't remote resource or data blob
  if (self.location.protocol === 'file:' && !PROTOCOL_REGEX.test(url)) {
    const path = self.location.pathname.split('/');
    path.pop();
    const basePath = path.join('/');
    const baseUrl = self.location.protocol + '//' + basePath;

    // check if url has a leading dot
    if (url.charAt(0) === '.') {
      url = url.slice(1);
    }

    // check if url has a leading slash
    if (url.charAt(0) === '/') {
      url = url.slice(1);
    }

    return baseUrl + '/' + url;
  }

  const absoluteUrl = new URL(url, self.location.href);
  return absoluteUrl.href;
}

export function isBase64Image(src: string) {
  return src.startsWith('data:') === true;
}

export function calcFactoredRadius(
  radius: number,
  w: number,
  h: number,
): number {
  return radius * Math.min(Math.min(w, h) / (2.0 * radius), 1);
}

export function valuesAreEqual(values: number[]) {
  let prevValue = values[0];
  for (let i = 1; i < values.length; i++) {
    if (prevValue !== values[i]) {
      return false;
    }
  }
  return true;
}

export function calcFactoredRadiusArray(
  radius: Vec4,
  w: number,
  h: number,
): [number, number, number, number] {
  const result: [number, number, number, number] = [
    radius[0],
    radius[1],
    radius[2],
    radius[3],
  ];
  const factor = Math.min(
    Math.min(
      Math.min(
        w / Math.max(w, radius[0] + radius[1]),
        w / Math.max(w, radius[2] + radius[3]),
      ),
      Math.min(
        h / Math.max(h, radius[0] + radius[3]),
        h / Math.max(h, radius[1] + radius[2]),
      ),
    ),
    1,
  );
  result[0] *= factor;
  result[1] *= factor;
  result[2] *= factor;
  result[3] *= factor;
  return result;
}

export function dataURIToBlob(dataURI: string): Blob {
  dataURI = dataURI.replace(/^data:/, '');

  const type = dataURI.match(/image\/[^;]+/)?.[0] || '';
  const base64 = dataURI.replace(/^[^,]+,/, '');

  const sliceSize = 1024;
  const byteCharacters = atob(base64);
  const bytesLength = byteCharacters.length;
  const slicesCount = Math.ceil(bytesLength / sliceSize);
  const byteArrays = new Array(slicesCount);

  for (let sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
    const begin = sliceIndex * sliceSize;
    const end = Math.min(begin + sliceSize, bytesLength);

    const bytes = new Array(end - begin);
    for (let offset = begin, i = 0; offset < end; ++i, ++offset) {
      bytes[i] = byteCharacters[offset]?.charCodeAt(0);
    }
    byteArrays[sliceIndex] = new Uint8Array(bytes);
  }
  return new Blob(byteArrays, { type });
}

export function fetchJson(
  url: string,
  responseType: XMLHttpRequestResponseType = '',
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.responseType = responseType;
    xhr.onreadystatechange = function () {
      if (xhr.readyState == XMLHttpRequest.DONE) {
        // On most devices like WebOS and Tizen, the file protocol returns 0 while http(s) protocol returns 200
        if (xhr.status === 0 || xhr.status === 200) {
          resolve(xhr.response);
        } else {
          reject(xhr.statusText);
        }
      }
    };
    xhr.open('GET', url, true);
    xhr.send(null);
  });
}
