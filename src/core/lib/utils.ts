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
  width: number;
  height: number;
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
    out.width = bound.x2 - bound.x1;
    out.height = bound.y2 - bound.y1;
    return out;
  }
  return {
    x: bound.x1,
    y: bound.y1,
    width: bound.x2 - bound.x1,
    height: bound.y2 - bound.y1,
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
  const width = Math.min(a.x + a.width, b.x + b.width) - x;
  const height = Math.min(a.y + a.height, b.y + b.height) - y;
  if (width > 0 && height > 0) {
    if (out) {
      out.x = x;
      out.y = y;
      out.width = width;
      out.height = height;
      return out;
    }
    return {
      x,
      y,
      width,
      height,
    };
  }
  if (out) {
    out.x = 0;
    out.y = 0;
    out.width = 0;
    out.height = 0;
    return out;
  }
  return {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  };
}

export function copyRect(a: Rect): Rect;
export function copyRect<T extends Rect = Rect>(a: Rect, out: T): T;
export function copyRect(a: Rect, out?: Rect): Rect {
  if (out) {
    out.x = a.x;
    out.y = a.y;
    out.width = a.width;
    out.height = a.height;
    return out;
  }
  return {
    x: a.x,
    y: a.y,
    width: a.width,
    height: a.height,
  };
}

export function compareRect(a: Rect | null, b: Rect | null): boolean {
  if (a === b) {
    return true;
  }
  if (a === null || b === null) {
    return false;
  }
  return (
    a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
  );
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

export function isBoundPositive(bound: Bound): boolean {
  return bound.x1 < bound.x2 && bound.y1 < bound.y2;
}

export function isRectPositive(rect: Rect): boolean {
  return rect.width > 0 && rect.height > 0;
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
