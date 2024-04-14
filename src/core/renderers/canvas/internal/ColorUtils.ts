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
  b: 0xff
}

/**
 * Extract color components
 */
export function parseColor(value: number): IParsedColor {
  if (value === 0xffffffff) {
    return WHITE;
  }
  const a = ((value >>> 24) & 0xff) / 255;
  const b = ((value >>> 16) & 0xff) & 0xff;
  const g = ((value >>> 8) & 0xff) & 0xff;
  const r = (value & 0xff) & 0xff;
  return { isWhite: false, a, r, g, b }
}

/**
 * Format a parsed color into a rgba CSS color
 */
export function formatRgba({ a, r, g, b }: IParsedColor): string {
  return `rgba(${r},${g},${b},${a})`;
}
