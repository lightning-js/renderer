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

import type { PeekableIterator } from './PeekableGenerator.js';
import * as SdfFontHandler from '../SdfFontHandler.js';

/**
 * Minimal glyph info for performance-focused text shaping
 */
export interface SimpleGlyphInfo {
  /**
   * Whether the character was successfully mapped to a glyph
   */
  mapped: boolean;
  /**
   * Unicode codepoint
   */
  codepoint: number;
  /**
   * How much to advance horizontally after rendering this glyph
   */
  xAdvance: number;
}

/**
 * Minimal font shaper properties
 */
export interface FontShaperProps {
  /**
   * Font family name
   */
  fontFamily: string;
  /**
   * Font size in pixels
   */
  fontSize: number;
  /**
   * Letter spacing in pixels
   */
  letterSpacing: number;
}

/**
 * Functional font shaper interface
 */
export interface FontShaper {
  shapeText: (
    props: FontShaperProps,
    codepoints: PeekableIterator<number>,
  ) => Generator<SimpleGlyphInfo, void>;
}

/**
 * Create a simple SDF font shaper
 */
export const createSdfFontShaper = (): FontShaper => ({
  shapeText: function* (
    props: FontShaperProps,
    codepoints: PeekableIterator<number>,
  ): Generator<SimpleGlyphInfo, void> {
    // Host paths on top
    const fontFamily = props.fontFamily;
    const fontSize = props.fontSize;
    const letterSpacing = props.letterSpacing;

    const fontData = SdfFontHandler.getFontData(fontFamily);
    if (!fontData) return;

    const fontScale = fontSize / fontData.common.lineHeight;
    let prevCodepoint = 0;

    while (true) {
      const result = codepoints.next();
      if (result.done) break;

      const codepoint = result.value;
      if (!codepoint) continue;

      // Get glyph data
      const glyph = SdfFontHandler.getGlyph(fontFamily, codepoint);
      if (!glyph) {
        yield {
          mapped: false,
          codepoint,
          xAdvance: 0,
        };
        continue;
      }

      // Calculate advance with kerning
      let advance = glyph.xadvance * fontScale;

      // Add kerning if there's a previous character
      if (prevCodepoint !== 0) {
        const kerning = SdfFontHandler.getKerning(
          fontFamily,
          prevCodepoint,
          codepoint,
        );
        advance += kerning * fontScale;
      }

      // Add letter spacing
      advance += letterSpacing;

      yield {
        mapped: true,
        codepoint,
        xAdvance: advance,
      };

      prevCodepoint = codepoint;
    }
  },
});
