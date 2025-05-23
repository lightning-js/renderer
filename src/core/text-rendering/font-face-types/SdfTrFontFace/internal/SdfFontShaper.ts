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
import { SpecialCodepoints } from '../../../renderers/SdfTextRenderer/internal/SpecialCodepoints.js';
import type { FontMetrics } from '../../TrFontFace.js';
import {
  FontShaper,
  type FontShaperProps,
  type MappedGlyphInfo,
  type UnmappedCharacterInfo,
} from './FontShaper.js';

/**
 * Fast look up table for kernings
 */
type KerningTable = Record<
  number,
  Record<number, number | undefined> | undefined
>;

export class SdfFontShaper extends FontShaper {
  private readonly data: SdfFontData;
  private readonly glyphMap: Map<number, SdfFontData['chars'][0]>;
  private readonly kernings: KerningTable;

  constructor(
    data: SdfFontData,
    glyphMap: Map<number, SdfFontData['chars'][0]>,
  ) {
    super();
    this.data = data;
    this.glyphMap = glyphMap;

    const kernings: KerningTable = (this.kernings = {});
    data.kernings.forEach((kerning) => {
      const second = kerning.second;
      const firsts = (kernings[second] = kernings[second] || {});
      firsts[kerning.first] = kerning.amount;
    });
    this.kernings = kernings;
  }

  *shapeTextWithWords(
    props: FontShaperProps,
    text: string,
  ): Generator<
    {
      letters: Generator<MappedGlyphInfo, void, unknown> | null;
      width: number;
      isLineBreak?: boolean;
      hasNextWord: boolean;
      tabSize?: number;
    },
    void,
    unknown
  > {
    const words = text
      .split(/([ \t]+|\n|\u200B)/)
      .filter((word) => word !== '');

    let lastGlyphId: number | undefined = undefined;
    let clusterCounter = 0;
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (word === undefined || word === '') continue;

      const isSpace = /^[ \t]+$/.test(word); // Match spaces or tabs
      const isLineBreak = word === '\n'; // Match newlines
      const hasNextWord = i < words.length - 1;

      if (isSpace) {
        // Handle spaces
        lastGlyphId = undefined;

        const spaceWidth = word.split('').reduce((width, char) => {
          const glyph = this.glyphMap.get(char.codePointAt(0)!);
          return glyph ? width + glyph.xadvance + props.letterSpacing : width;
        }, 0);

        yield {
          letters: null,
          width: spaceWidth,
          isLineBreak: false,
          hasNextWord,
        };
      } else if (isLineBreak) {
        // Handle line breaks
        lastGlyphId = undefined;
        yield { letters: null, width: 0, isLineBreak: true, hasNextWord };
      } else {
        // Process word
        const currentWord: Array<MappedGlyphInfo> = [];
        let currentWordWidth = 0;

        for (const char of word) {
          const codepoint = char.codePointAt(0)!;
          const glyph = this.glyphMap.get(codepoint);

          if (glyph) {
            const kerning =
              lastGlyphId !== undefined
                ? (this.kernings[glyph.id]?.[lastGlyphId] || 0) +
                  props.letterSpacing
                : 0;

            lastGlyphId = glyph.id;

            const mappedGlyph: MappedGlyphInfo = {
              mapped: true,
              glyphId: glyph.id,
              codepoint,
              cluster: clusterCounter++, // Adjust if needed
              xAdvance: glyph.xadvance + kerning,
              yAdvance: 0,
              xOffset: glyph.xoffset + kerning,
              yOffset: glyph.yoffset,
              xBearing: 0,
              yBearing: 0,
              width: glyph.width,
              height: glyph.height,
            };

            currentWord.push(mappedGlyph);
            if (mappedGlyph.codepoint !== 8203)
              currentWordWidth += mappedGlyph.xAdvance;
          }
        }

        if (currentWord.length > 0) {
          yield {
            letters: (function* () {
              for (const glyph of currentWord) {
                yield glyph;
              }
            })(),
            width: currentWordWidth,
            hasNextWord,
          };
        }
      }
    }
  }

  *shapeText(
    props: FontShaperProps,
    codepoints: PeekableIterator<number>,
  ): Generator<MappedGlyphInfo | UnmappedCharacterInfo, void> {
    let codepointResult: IteratorResult<number>;
    let lastGlyphId: number | undefined = undefined;
    while ((codepointResult = codepoints.peek()) && !codepointResult.done) {
      const codepoint = codepointResult.value;
      const glyph = this.glyphMap.get(codepoint);
      codepoints.next();
      if (glyph !== undefined) {
        // We found a glyph for this codepoint
        // Yield the mapped glyph info

        /**
         * Kerning includes any possible additional letter spacing
         */
        const kerning =
          lastGlyphId !== undefined
            ? (this.kernings[glyph.id]?.[lastGlyphId] || 0) +
              props.letterSpacing
            : 0;

        lastGlyphId = glyph.id;
        yield {
          mapped: true,
          glyphId: glyph.id,
          codepoint,
          cluster: codepoints.lastIndex,
          xAdvance: glyph.xadvance + kerning,
          yAdvance: 0,
          xOffset: glyph.xoffset + kerning,
          yOffset: glyph.yoffset,
          xBearing: 0,
          yBearing: 0,
          width: glyph.width,
          height: glyph.height,
        };
      } else {
        // We didn't find a glyph for this codepoint
        // Yield the unmapped codepoint info

        // If this codepoint is a linebreak, we should reset the last glyph id
        // so that the next glyph will not be kerned with the last glyph of the
        // previous line.
        if (codepoint === SpecialCodepoints.LINE_FEED) {
          lastGlyphId = undefined;
        }
        yield {
          mapped: false,
          codepoint,
          cluster: codepoints.lastIndex,
        };
      }
    }
  }
}

export interface SdfFontData {
  pages: string[];
  chars: Array<{
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
  }>;

  kernings: Array<{
    first: number;
    second: number;
    amount: number;
  }>;
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
