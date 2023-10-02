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

import type { PeekableIterator } from '../../../renderers/SdfTextRenderer/internal/PeekableGenerator.js';

/**
 * HarfBuzz compatible glyph position info
 */
export interface GlyphPosition {
  /**
   * how much the line advances after drawing this glyph when setting text in horizontal direction.
   */
  xAdvance: number;
  /**
   * how much the line advances after drawing this glyph when setting text in vertical direction.
   */
  yAdvance: number;
  /**
   * how much the glyph moves on the X-axis before drawing it, this should not affect how much the line advances.
   */
  xOffset: number;
  /**
   * how much the glyph moves on the Y-axis before drawing it, this should not affect how much the line advances.
   */
  yOffset: number;
}

/**
 * HarfBuzz compatible glyph info
 */
export interface GlyphInfo {
  /**
   * Glyph ID
   */
  glyphId: number;

  /**
   * First codepoint in the cluster this glyph was mapped from.
   */
  codepoint: number;

  /**
   * the index of the character in the original text that corresponds to this hb_glyph_info_t
   * This is useful for mapping back from glyphs to characters.
   */
  cluster: number;
}

/**
 * HarfBuzz compatible glyph extents
 */
export interface GlyphExtents {
  /**
   * The X offset from the origin to the leftmost part of the glyph.
   * This is negative for right-to-left scripts.
   */
  xBearing: number;

  /**
   * The Y offset from the origin to the topmost part of the glyph.
   * This is negative for bottom-to-top scripts.
   */
  yBearing: number;

  /**
   * Distance from the top extremum of the glyph to the bottom extremum.
   * This is always positive.
   */
  width: number;

  /**
   * Distance from the left extremum of the glyph to the right extremum.
   * This is always positive.
   */
  height: number;
}

export interface UnmappedCharacterInfo {
  mapped: false;

  /**
   * The Unicode code point of the character.
   */
  codepoint: number;

  /**
   * The index of the character in the original text that corresponds to this hb_glyph_info_t
   * This is useful for mapping back from glyphs to characters.
   */
  cluster: number;
}

export type MappedGlyphInfo = { mapped: true } & GlyphInfo &
  GlyphPosition &
  GlyphExtents;

/**
 * For performance reasons, all properties are required to reduce need for checking for undefined values.
 */
export interface FontShaperProps {
  /**
   * Letter spacing
   *
   * @default 0
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/letter-spacing
   **/
  letterSpacing: number;
}

export abstract class FontShaper {
  /**
   * Returns the glyph IDs of the next
   *
   * @remarks
   * If this returns undefined, a glyph for the next codepoint(s) could not be found.
   *
   * @param codepoints
   */
  abstract shapeText(
    props: FontShaperProps,
    codepoints: PeekableIterator<number>,
  ): Generator<MappedGlyphInfo | UnmappedCharacterInfo, void>;
}
