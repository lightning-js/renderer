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

import { describe, expect, it } from 'vitest';

import { PeekableIterator } from '../../../renderers/SdfTextRenderer/internal/PeekableGenerator.js';
import { SdfFontShaper, type SdfFontData } from './SdfFontShaper.js';
import { getUnicodeCodepoints } from '../../../renderers/SdfTextRenderer/internal/getUnicodeCodepoints.js';
import sdfData from 'test/mockdata/Ubuntu-Bold.msdf.json';

const glyphMap = new Map<number, SdfFontData['chars'][0]>();
sdfData.chars.forEach((glyph) => {
  glyphMap.set(glyph.id, glyph);
});

// TODO: Need tests for
// - mapped = false

describe('SdfFontShaper', () => {
  it('should be able to shape text.', () => {
    const shaper = new SdfFontShaper(sdfData as unknown as SdfFontData, glyphMap);
    const peekableCodepoints = new PeekableIterator(
      getUnicodeCodepoints('Hi!'),
    );
    const glyphs = shaper.shapeText({ letterSpacing: 0 }, peekableCodepoints);
    // H
    expect(glyphs.next().value).toEqual({
      mapped: true,
      codepoint: 72,
      glyphId: 72,
      cluster: 0,
      width: 28,
      height: 33,
      xAdvance: 30.828,
      yAdvance: 0,
      xOffset: 1,
      yOffset: 5.592,
      xBearing: 0,
      yBearing: 0,
    });
    // i
    expect(glyphs.next().value).toEqual({
      mapped: true,
      codepoint: 105,
      glyphId: 105,
      cluster: 1,
      width: 11,
      height: 36,
      xAdvance: 12.138,
      yAdvance: 0,
      xOffset: 0,
      yOffset: 2.592,
      xBearing: 0,
      yBearing: 0,
    });
    // !
    expect(glyphs.next().value).toEqual({
      mapped: true,
      codepoint: 33,
      glyphId: 33,
      cluster: 2,
      width: 12,
      height: 34,
      xAdvance: 12.012,
      yAdvance: 0,
      xOffset: 0,
      yOffset: 5.592,
      xBearing: 0,
      yBearing: 0,
    });
    expect(glyphs.next().done).toBe(true);
  });

  it('should be able to shape text that we know have kerning pairs.', () => {
    const shaper = new SdfFontShaper(sdfData as unknown as SdfFontData, glyphMap);
    const peekableCodepoints = new PeekableIterator(
      getUnicodeCodepoints('WeVo'),
    );
    const glyphs = shaper.shapeText({ letterSpacing: 0 }, peekableCodepoints);
    // W
    expect(glyphs.next().value).toEqual(
      expect.objectContaining({
        codepoint: 87,
        xAdvance: 39.816,
        xOffset: -1,
      }),
    );
    // e
    expect(glyphs.next().value).toEqual(
      expect.objectContaining({
        codepoint: 101,
        xAdvance: 24.528,
        xOffset: 0,
      }),
    );
    // V
    expect(glyphs.next().value).toEqual(
      expect.objectContaining({
        codepoint: 86,
        xAdvance: 30.324,
        xOffset: -2,
      }),
    );
    // o
    expect(glyphs.next().value).toEqual(
      expect.objectContaining({
        codepoint: 111,
        xAdvance: 23.184,
        xOffset: -2.31,
      }),
    );

    expect(glyphs.next().done).toBe(true);
  });

  it('should be able to shape text with letterSpacing.', () => {

    const shaper = new SdfFontShaper(sdfData as unknown as SdfFontData, glyphMap);
    const peekableCodepoints = new PeekableIterator(
      getUnicodeCodepoints('We!'),
    );
    const glyphs = shaper.shapeText({ letterSpacing: 5 }, peekableCodepoints);
    // W
    expect(glyphs.next().value).toEqual(
      expect.objectContaining({
        codepoint: 87,
        xAdvance: 39.816,
        xOffset: -1,
      }),
    );
    // e
    expect(glyphs.next().value).toEqual(
      expect.objectContaining({
        codepoint: 101,
        xAdvance: 29.528,
        xOffset: 5,
      }),
    );
    // !
    expect(glyphs.next().value).toEqual(
      expect.objectContaining({
        codepoint: 33,
        xAdvance: 17.012,
        xOffset: 5,
      }),
    );
    expect(glyphs.next().done).toBe(true);
  });
});
