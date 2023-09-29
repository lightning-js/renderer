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

export interface Bound {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function intersectBound(a: Bound, b: Bound): Bound {
  const intersection = {
    x1: Math.max(a.x1, b.x1),
    y1: Math.max(a.y1, b.y1),
    x2: Math.min(a.x2, b.x2),
    y2: Math.min(a.y2, b.y2),
  };
  if (intersection.x1 < intersection.x2 && intersection.y1 < intersection.y2) {
    return intersection;
  }
  return {
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
  };
}

export function intersectRect(a: Rect, b: Rect): Rect {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const width = Math.min(a.x + a.width, b.x + b.width) - x;
  const height = Math.min(a.y + a.height, b.y + b.height) - y;
  if (width > 0 && height > 0) {
    return {
      x,
      y,
      width,
      height,
    };
  }
  return {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
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

export function isBoundPositive(bound: Bound): boolean {
  return bound.x1 < bound.x2 && bound.y1 < bound.y2;
}

export function isRectPositive(rect: Rect): boolean {
  return rect.width > 0 && rect.height > 0;
}
