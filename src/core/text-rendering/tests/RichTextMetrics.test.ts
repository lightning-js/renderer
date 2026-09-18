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

import { describe, it, expect } from 'vitest';
import {
  SDF_BOLD_THRESHOLD_SHIFT,
  ITALIC_SHEAR,
  sdfBoldExtra,
  italicOverhang,
  canvasSpanFont,
  spanIndexAt,
} from '../RichTextMetrics.js';
import {
  parseRichText,
  ParseResult,
  type RichSpan,
} from '../RichTextParser.js';

const span = (over: Partial<RichSpan> = {}): RichSpan =>
  ({
    start: 0,
    end: 0,
    color: 0,
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    ...over,
  } as RichSpan);

describe('RichTextMetrics', () => {
  describe('sdfBoldExtra', () => {
    it('accounts for dilation on both sides of the glyph', () => {
      // The shader lowers the alpha threshold by SDF_BOLD_THRESHOLD_SHIFT,
      // pushing the edge out by that fraction of distanceRange per side.
      expect(sdfBoldExtra(4)).toBeCloseTo(2 * SDF_BOLD_THRESHOLD_SHIFT * 4);
      expect(sdfBoldExtra(4)).toBeCloseTo(0.4);
    });

    it('scales linearly with distanceRange', () => {
      expect(sdfBoldExtra(8)).toBeCloseTo(sdfBoldExtra(4) * 2);
    });

    it('is zero for a degenerate distance range', () => {
      expect(sdfBoldExtra(0)).toBe(0);
    });

    it('is positive, so bold always advances at least as far as regular', () => {
      expect(sdfBoldExtra(4)).toBeGreaterThan(0);
    });
  });

  describe('italicOverhang', () => {
    it('grows with the height of the glyph above the baseline', () => {
      const shallow = italicOverhang(30, 20);
      const tall = italicOverhang(30, 10);
      expect(tall).toBeGreaterThan(shallow);
      expect(tall).toBeCloseTo(20 * ITALIC_SHEAR);
    });

    it('is zero for a glyph that does not rise above the baseline', () => {
      // Descender-only box: nothing leans out to the right at the top.
      expect(italicOverhang(30, 30)).toBe(0);
      expect(italicOverhang(30, 40)).toBe(0);
    });

    it('matches the shear actually applied to the glyph top', () => {
      // Positioning uses shearTop = (baseline - y1) * ITALIC_SHEAR, so the
      // overhang paid for must equal that exact excursion.
      const baseline = 42;
      const y1 = 5;
      expect(italicOverhang(baseline, y1)).toBeCloseTo(
        (baseline - y1) * ITALIC_SHEAR,
      );
    });
  });

  describe('canvasSpanFont', () => {
    it('emits the bold keyword for a bold span', () => {
      expect(canvasSpanFont(span({ bold: true }), 'normal', 20, 'Arial')).toBe(
        'normal bold 20px Unknown, Arial',
      );
    });

    it('replaces the node font style for an italic span', () => {
      expect(
        canvasSpanFont(span({ italic: true }), 'normal', 20, 'Arial'),
      ).toBe('italic 20px Unknown, Arial');
    });

    it('combines bold and italic', () => {
      expect(
        canvasSpanFont(
          span({ bold: true, italic: true }),
          'normal',
          20,
          'Arial',
        ),
      ).toBe('italic bold 20px Unknown, Arial');
    });

    it('preserves the node font style for an unstyled span', () => {
      expect(canvasSpanFont(span(), 'oblique', 20, 'Arial')).toBe(
        'oblique 20px Unknown, Arial',
      );
    });

    it('produces a different font string for bold than for regular', () => {
      // This inequality is what drives the measure-font switch; if it ever
      // collapsed, bold runs would silently be measured with the regular face.
      expect(
        canvasSpanFont(span({ bold: true }), 'normal', 20, 'Arial'),
      ).not.toBe(canvasSpanFont(span(), 'normal', 20, 'Arial'));
    });
  });

  describe('spanIndexAt', () => {
    const result = new ParseResult();
    parseRichText('aa[b]bb[/b]cc', result);
    const spans = result.spans;
    const count = result.spanCount;

    it('resolves positions to the covering span', () => {
      // stripped text is 'aabbcc': [0,2) plain, [2,4) bold, [4,6) plain
      expect(result.stripped).toBe('aabbcc');
      expect(spans[spanIndexAt(spans, count, 0, 0)]!.bold).toBe(false);
      expect(spans[spanIndexAt(spans, count, 2, 0)]!.bold).toBe(true);
      expect(spans[spanIndexAt(spans, count, 3, 0)]!.bold).toBe(true);
      expect(spans[spanIndexAt(spans, count, 4, 0)]!.bold).toBe(false);
    });

    it('never moves backwards from the supplied cursor', () => {
      // Callers rely on this to keep the whole traversal linear.
      const idx = spanIndexAt(spans, count, 5, 2);
      expect(idx).toBeGreaterThanOrEqual(2);
    });

    it('clamps to the last span past the end of the text', () => {
      expect(spanIndexAt(spans, count, 999, 0)).toBe(count - 1);
    });

    it('is equivalent to a scan from zero when walked in order', () => {
      let cursor = 0;
      for (let pos = 0; pos < result.stripped.length; pos++) {
        cursor = spanIndexAt(spans, count, pos, cursor);
        expect(cursor).toBe(spanIndexAt(spans, count, pos, 0));
      }
    });
  });
});
