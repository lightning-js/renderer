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

export interface IParsedColor {
  isWhite: boolean;
  a: number;
  r: number;
  g: number;
  b: number;
}

const WHITE: IParsedColor = {
  isWhite: true,
  a: 1,
  r: 0xff,
  g: 0xff,
  b: 0xff,
};

/**
 * Extract color components
 */
export function parseColor(abgr: number): IParsedColor {
  if (abgr === 0xffffffff) {
    return WHITE;
  }
  const a = ((abgr >>> 24) & 0xff) / 255;
  const b = (abgr >>> 16) & 0xff & 0xff;
  const g = (abgr >>> 8) & 0xff & 0xff;
  const r = abgr & 0xff & 0xff;
  return { isWhite: false, a, r, g, b };
}

export function parseToAbgrString(abgr: number) {
  const a = ((abgr >>> 24) & 0xff) / 255;
  const b = (abgr >>> 16) & 0xff & 0xff;
  const g = (abgr >>> 8) & 0xff & 0xff;
  const r = abgr & 0xff & 0xff;
  return `rgba(${r},${g},${b},${a})`;
}

export function parseToRgbaString(rgba: number) {
  const r = (rgba >>> 24) & 0xff;
  const g = (rgba >>> 16) & 0xff & 0xff;
  const b = (rgba >>> 8) & 0xff & 0xff;
  const a = (rgba & 0xff & 0xff) / 255;
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * Extract color components
 */
export function parseColorRgba(rgba: number): IParsedColor {
  if (rgba === 0xffffffff) {
    return WHITE;
  }
  const r = (rgba >>> 24) & 0xff;
  const g = (rgba >>> 16) & 0xff & 0xff;
  const b = (rgba >>> 8) & 0xff & 0xff;
  const a = (rgba & 0xff & 0xff) / 255;
  return { isWhite: false, r, g, b, a };
}

/**
 * Format a parsed color into a rgba CSS color
 */
export function formatRgba({ a, r, g, b }: IParsedColor): string {
  return `rgba(${r},${g},${b},${a})`;
}
