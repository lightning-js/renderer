/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2025 Comcast Cable Communications Management, LLC.
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

import type { FontMetrics } from './TextRenderer.js';
export interface SdfGlyph {
  id: number;
  char: string;
  x: number;
  y: number;
  width: number;
  height: number;
  xoffset: number;
  yoffset: number;
  xadvance: number;
  page: number;
  chnl: number;
}

export type SdfGlyphMap = Record<number, SdfGlyph>;

export interface SdfKerning {
  first: number;
  second: number;
  amount: number;
}
/**
 * SDF Font Data structure matching msdf-bmfont-xml output
 */
export interface SdfFontData {
  pages: string[];
  chars: SdfGlyph[];
  kernings: SdfKerning[];
  info: {
    face: string;
    size: number;
    bold: number;
    italic: number;
    charset: string[];
    unicode: number;
    stretchH: number;
    smooth: number;
    aa: number;
    padding: [number, number, number, number]; // [up, right, down, left]
    spacing: [number, number]; // [horizontal, vertical]
    outline: number;
  };
  common: {
    lineHeight: number;
    base: number;
    scaleW: number;
    scaleH: number;
    pages: number;
    packed: number;
    alphaChnl: number;
    redChnl: number;
    greenChnl: number;
    blueChnl: number;
  };
  distanceField: {
    // msdf-bmfont-xml uses the string 'sdf' for single-channel SDF.
    fieldType: 'sdf' | 'msdf';
    distanceRange: number;
  };
  lightningMetrics?: FontMetrics;
}

/**
 * @typedef {Object} SdfGlyph
 * @property {number} id - Glyph ID
 * @property {string} char - Character
 * @property {number} x - Atlas x position
 * @property {number} y - Atlas y position
 * @property {number} width - Glyph width
 * @property {number} height - Glyph height
 * @property {number} xoffset - X offset
 * @property {number} yoffset - Y offset
 * @property {number} xadvance - Character advance width
 * @property {number} page - Page number
 * @property {number} chnl - Channel
 */

/**
 * @typedef {Object} KerningTable
 * Fast lookup table for kerning values
 */
export type KerningTable = Record<
  number,
  Record<number, number | undefined> | undefined
>;

/**
 * Build kerning lookup table for fast access
 * @param {Array} kernings - Kerning data from font
 * @returns {KerningTable} Optimized kerning lookup table
 */
export const buildKerningTable = (kernings: SdfKerning[]): KerningTable => {
  const kerningTable: KerningTable = {};

  let i = 0;
  const length = kernings.length;

  while (i < length) {
    const kerning = kernings[i];
    i++;
    if (kerning === undefined) {
      continue;
    }
    const second = kerning.second;

    let firsts = kerningTable[second];
    if (firsts === undefined) {
      firsts = {};
      kerningTable[second] = firsts;
    }
    firsts[kerning.first] = kerning.amount;
  }

  return kerningTable;
};

export const buildGlyphMap = (chars: SdfGlyph[]) => {
  const glyphMap = Object.create(null) as SdfGlyphMap;

  let i = 0;
  const length = chars.length;

  while (i < length) {
    const glyph = chars[i];

    i++;
    if (glyph === undefined) {
      continue;
    }

    glyphMap[glyph.id] = glyph;
  }
  return glyphMap;
};
