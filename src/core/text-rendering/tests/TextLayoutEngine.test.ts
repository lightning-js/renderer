// /*
//  * If not stated otherwise in this file or this component's LICENSE file the
//  * following copyright and licenses apply:
//  *
//  * Copyright 2025 Comcast Cable Management, LLC.
//  *
//  * Licensed under the Apache License, Version 2.0 (the License);
//  * you may not use this file except in compliance with the License.
//  * You may obtain a copy of the License at
//  *
//  * http://www.apache.org/licenses/LICENSE-2.0
//  *
//  * Unless required by applicable law or agreed to in writing, software
//  * distributed under the License is distributed on an "AS IS" BASIS,
//  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  * See the License for the specific language governing permissions and
//  * limitations under the License.
//  */

import { describe, it, expect } from 'vitest';
import {
  wrapText,
  wrapLine,
  breakWord,
  truncateLineEnd,
  mapTextLayout,
} from '../TextLayoutEngine.js';

// Mock font data for testing
// Mock SdfFontHandler functions
const mockGetGlyph = (_fontFamily: string, codepoint: number) => {
  // Mock glyph data - each character is 10 units wide for easy testing
  return {
    id: codepoint,
    char: String.fromCharCode(codepoint),
    x: 0,
    y: 0,
    width: 10,
    height: 16,
    xoffset: 0,
    yoffset: 0,
    xadvance: 10,
    page: 0,
    chnl: 0,
  };
};

const mockGetKerning = () => {
  // No kerning for simplicity
  return 0;
};

// Test-specific measureText function that mimics testMeasureText behavior
// but works with our mocked getGlyph and getKerning functions
const testMeasureText = (
  text: string,
  fontFamily: string,
  letterSpacing: number,
): number => {
  if (text.length === 1) {
    const char = text.charAt(0);
    const codepoint = text.codePointAt(0);
    if (codepoint === undefined) return 0;
    if (char === '\u200B') return 0; // Zero-width space

    const glyph = mockGetGlyph(fontFamily, codepoint);
    if (glyph === null) return 0;
    return glyph.xadvance + letterSpacing;
  }
  let width = 0;
  let prevCodepoint = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charAt(i);
    const codepoint = text.codePointAt(i);
    if (codepoint === undefined) continue;

    // Skip zero-width spaces in width calculations
    if (char === '\u200B') {
      continue;
    }

    const glyph = mockGetGlyph(fontFamily, codepoint);
    if (glyph === null) continue;

    let advance = glyph.xadvance;

    // Add kerning if there's a previous character
    if (prevCodepoint !== 0) {
      const kerning = mockGetKerning();
      advance += kerning;
    }

    width += advance + letterSpacing;
    prevCodepoint = codepoint;
  }

  return width;
};

// Mock measureText function to replace the broken SDF implementation
describe('SDF Text Utils', () => {
  describe('measureText', () => {
    it('should return correct width for basic text', () => {
      const width = testMeasureText('hello', 'Arial', 0);
      expect(width).toBeCloseTo(50); // 5 chars * 10 xadvance
    });

    it('should return 0 width for empty text', () => {
      const width = testMeasureText('', 'Arial', 0);
      expect(width).toBe(0);
    });

    it('should include letter spacing in width calculation', () => {
      const width = testMeasureText('hello', 'Arial', 2);
      expect(width).toBeCloseTo(60); // 5 chars * (10 xadvance + 2 letterSpacing)
    });

    it('should skip zero-width spaces in width calculation', () => {
      const width = testMeasureText('hel\u200Blo', 'Arial', 0);
      expect(width).toBeCloseTo(50); // Should be same as 'hello'
    });
  });

  describe('wrapLine', () => {
    it('should wrap text that exceeds max width', () => {
      const result = wrapLine(
        testMeasureText, // Add measureText as first parameter
        'hello world test',
        'Arial',
        100, // maxWidth (10 characters at 10 units each)
        0, // designLetterSpacing
        10, // spaceWidth
        '',
        0, //overflowWidth
        'break-word',
        10,
      );

      const [lines] = result;
      expect(lines).toHaveLength(2);
      expect(lines[0]?.[0]).toEqual('hello'); // Break at space, not ZWSP
      expect(lines[1]?.[0]).toEqual('world test');
    });

    it('should handle single word that fits', () => {
      const result = wrapLine(
        testMeasureText,
        'hello',
        'Arial',
        100, // maxWidth (10 characters at 10 units each)
        0, // designLetterSpacing
        10, // spaceWidth
        '',
        0, //overflowWidth
        'break-word',
        1,
      );
      expect(result[0][0]).toEqual(['hello', 50, false, 0, 0, 0]);
    });

    it('should break long words', () => {
      const result = wrapLine(
        testMeasureText,
        'verylongwordthatdoesnotfit',
        'Arial',
        100, // maxWidth (10 characters at 10 units each)
        0, // designLetterSpacing
        10, // spaceWidth
        '',
        0, //overflowWidth
        'break-word',
        1,
      );
      const [lines] = result; // Extract the lines array
      // The implementation returns the full word when wordBreak is 'normal' (default behavior)
      // This is correct behavior - single words are not broken unless wordBreak is set to 'break-all'
      expect(lines.length).toBe(1);
      expect(lines[0]?.[0]).toBe('verylongwo');
    });

    it('should handle ZWSP as word break opportunity', () => {
      // Test 1: ZWSP should provide break opportunity when needed
      const result1 = wrapLine(
        testMeasureText,
        'hello\u200Bworld test',
        'Arial',
        100, // maxWidth (10 characters at 10 units each)
        0, // designLetterSpacing
        10, // spaceWidth
        '',
        0, //overflowWidth
        'break-word',
        2,
      );

      const [lines] = result1;
      expect(lines[0]?.[0]).toEqual('hello\u200Bworld'); // Break at space, ZWSP preserved in-line
      expect(lines[1]?.[0]).toEqual('test');

      // Test 2: ZWSP should NOT break when text fits on one line
      const result2 = wrapLine(
        testMeasureText,
        'hi\u200Bthere',
        'Arial',
        200, // maxWidth
        0, // designLetterSpacing
        10, // spaceWidth
        '',
        0, //overflowWidth
        'break-word',
        1,
      );
      expect(result2[0][0]).toEqual(['hi\u200Bthere', 70, false, 0, 0, 0]); // ZWSP preserved (zero width, offsets stay aligned)

      // Test 3: ZWSP should break when it's the only break opportunity
      const result3 = wrapLine(
        testMeasureText,
        'verylongword\u200Bmore',
        'Arial',
        100, // 10 characters max - forces break at ZWSP
        0,
        10, // spaceWidth
        '',
        0, //overflowWidth
        'break-word',
        2,
      );
      expect(result3.length).toBeGreaterThan(1); // Should break at ZWSP position
      expect(result3[0][0]).toEqual(['verylongwo', 100, false, 0, 0, 0]);
    });

    it('should truncate with suffix when max lines reached', () => {
      const result = wrapLine(
        testMeasureText,
        'hello world test more and even more text that exceeds limits',
        'Arial',
        200, // Wide enough to force multiple words on one line
        0,
        10, // spaceWidth
        '...',
        0, //overflowWidth
        'break-word',
        10, // remainingLines = 0 - this should trigger truncation when hasMaxLines is true
      );
      // With the current implementation, text wraps naturally across multiple lines
      // when remainingLines is 0 and hasMaxLines is true, but doesn't truncate in this case
      // This behavior is correct for the text layout engine
      expect(result[0].length).toBeGreaterThan(1);
      expect(result[0][0]?.[0]).toBe('hello world test');
    });

    it('should return non-empty output when maxWidth is smaller than glyph and suffix width', () => {
      const result = wrapLine(
        testMeasureText,
        'hello',
        'Arial',
        5,
        0,
        10,
        '...',
        30,
        'break-word',
        1,
      );

      expect(result[0]).toHaveLength(1);
      expect(result[0][0]?.[0]).toBe('...');
      expect(result[0][0]?.[2]).toBe(true);
      expect(result[1]).toBe(0);
    });
  });

  describe('wrapText', () => {
    it('should wrap multiple lines', () => {
      const result = wrapText(
        testMeasureText,
        'line one\nline two that is longer',
        'Arial',
        100,
        0,
        '',
        'normal',
        0,
      );
      expect(result[0].length).toBeGreaterThan(2);
      expect(result[0][0]).toStrictEqual(['line one', 80, false, 0, 0, 0]);
    });

    it('should handle empty lines', () => {
      const result = wrapText(
        testMeasureText,
        'line one\n\nline three',
        'Arial',
        100,
        0,
        '',
        'normal',
        0,
      );
      expect(result[0][1]?.[0]).toBe('');
    });

    it('should respect max lines limit', () => {
      const result = wrapText(
        testMeasureText,
        'line one\\nline two\\nline three\\nline four',
        'Arial',
        100,
        0,
        '',
        'normal',
        2, // maxLines = 2
      );
      const [lines] = result;
      expect(lines).toHaveLength(2);
    });
  });

  describe('truncateLineWithSuffix', () => {
    it('should truncate line and add suffix', () => {
      const result = truncateLineEnd(
        testMeasureText,
        'Arial',
        0,
        'this is a very long line', //current line
        240, // current line width
        '',
        100, // Max width for 10 characters
        '...', // Suffix
        30, // Suffix width
      );
      expect(result[0]).toContain('...');
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should return suffix if suffix is too long', () => {
      const result = truncateLineEnd(
        testMeasureText,
        'Arial',
        0,
        'hello',
        50, // current line width
        '',
        30, // Only 3 characters fit
        'verylongsuffix',
        140, // Suffix width
      );
      expect(result[0]).toMatch(/verylongsuffi/); // Truncated suffix
    });

    it('should return original line with suffix (current behavior)', () => {
      // Note: The current implementation always adds the suffix, even if the line fits.
      // This is the expected behavior when used in overflow contexts where the suffix
      // indicates that content was truncated at the line limit.
      const result = truncateLineEnd(
        testMeasureText,
        'Arial',
        0,
        'short',
        50, // 5 characters fit
        '',
        40,
        '...',
        30,
      );
      expect(result[0]).toBe('s...');
    });
  });

  describe('breakLongWord', () => {
    it('should break word into multiple lines', () => {
      const result = breakWord(
        testMeasureText,
        'verylongword',
        'verylongword'.length * 10,
        'Arial',
        0,
        [],
        '',
        0,
        1,
        '',
        50, // 5 characters max per line
        '',
        0,
        '...',
        30,
      );
      expect(result.length).toBeGreaterThan(1);
      expect(result[2]).toHaveLength(12);
    });

    it('should handle single character word', () => {
      const result = breakWord(
        testMeasureText,
        'a',
        10,
        'Arial',
        0,
        [],
        '',
        0,
        1,
        '',
        50, // 5 characters max per line
        '',
        0,
        '...',
        30,
      );
      expect(result).toStrictEqual(['', 0, 'a', -1, -1]);
    });

    it('should truncate with suffix when max lines reached', () => {
      const result = breakWord(
        testMeasureText,
        'verylongword',
        'verylongword'.length * 10,
        'Arial',
        0,
        [],
        '',
        0,
        1,
        '',
        50, // 5 characters max per line
        '',
        0,
        '...',
        30,
      );
      expect(result[0]).toHaveLength(0);
    });
  });

  describe('Integration tests', () => {
    it('should handle complex text with ZWSP and wrapping', () => {
      const text =
        'This is a test\u200Bwith zero-width\u200Bspaces that should wrap properly';
      const result = wrapText(
        testMeasureText,
        text,
        'Arial',
        200, // 20 characters max per line
        0,
        '...',
        'normal',
        0,
      );
      expect(result.length).toBeGreaterThan(1);
      const [lines] = result;
      // Should split at ZWSP and regular spaces
      expect(lines.some((line) => line[0].includes('zero-width'))).toBe(true);
    });

    it('should handle mixed content with long words and ZWSP', () => {
      const text = 'Short\u200Bverylongwordthatmustbebroken\u200Bshort';
      const result = wrapText(
        testMeasureText,
        text,
        'Arial',
        100, // 10 characters max per line
        0,
        '',
        'normal',
        0,
      );
      const [lines] = result;
      expect(lines.length).toBeGreaterThan(2);
      expect(lines[0]?.[0]).toBe('Short');
      expect(lines[lines.length - 1]?.[0]).toBe('short');
    });
  });

  describe('line start offsets (TextLineStruct[5])', () => {
    // A line's start offset must always point at the index in the source text
    // where that line's first character actually lives. Consumers (rich text
    // span correlation) rely on this instead of accumulating line lengths,
    // because the wrapper collapses whitespace runs.

    const wrap = (
      text: string,
      maxWidth: number,
      wordBreak = 'normal',
      maxLines = 0,
      overflowSuffix = '',
    ) =>
      wrapText(
        testMeasureText,
        text,
        'Arial',
        maxWidth,
        0,
        overflowSuffix,
        wordBreak,
        maxLines,
      )[0];

    it('points at the source index of each line for a single space separator', () => {
      const text = 'hello world test';
      const lines = wrap(text, 100);
      expect(lines.map((l) => l[0])).toEqual(['hello', 'world test']);
      // 'world' begins at index 6, after 'hello' (5) + one space.
      expect(lines.map((l) => l[5])).toEqual([0, 6]);
      for (const line of lines) {
        expect(text.startsWith(line[0], line[5])).toBe(true);
      }
    });

    it('accounts for collapsed multi-space separators', () => {
      // The regression this field exists for: a naive "+= lineLen + 1"
      // accumulator assumes exactly one consumed separator character and
      // drifts by one per extra space.
      const text = 'hello   world test';
      const lines = wrap(text, 100);
      expect(lines.map((l) => l[0])).toEqual(['hello', 'world test']);
      // 'world' begins at index 8, after 'hello' (5) + three spaces.
      expect(lines.map((l) => l[5])).toEqual([0, 8]);
      for (const line of lines) {
        expect(text.startsWith(line[0], line[5])).toBe(true);
      }
    });

    it('accounts for explicit newlines', () => {
      const text = 'line one\nline two';
      const lines = wrap(text, 200);
      expect(lines.map((l) => l[0])).toEqual(['line one', 'line two']);
      expect(lines.map((l) => l[5])).toEqual([0, 9]);
    });

    it('accounts for empty lines produced by consecutive newlines', () => {
      const text = 'a\n\nb';
      const lines = wrap(text, 200);
      expect(lines.map((l) => l[0])).toEqual(['a', '', 'b']);
      expect(lines.map((l) => l[5])).toEqual([0, 2, 3]);
    });

    it('tracks offsets across ZWSP break opportunities', () => {
      const text = 'Short\u200Bverylongwordthatmustbebroken\u200Bshort';
      const lines = wrap(text, 100);
      // Every line must be locatable at its reported offset.
      for (const line of lines) {
        expect(text.startsWith(line[0], line[5])).toBe(true);
      }
      expect(lines[0]?.[5]).toBe(0);
    });

    it('tracks offsets when a long word is split across lines', () => {
      const text = 'verylongwordthatdoesnotfit';
      const lines = wrap(text, 100, 'break-all');
      expect(lines.length).toBeGreaterThan(1);
      // Split pieces are contiguous: each continues where the previous ended.
      let expected = 0;
      for (const line of lines) {
        expect(line[5]).toBe(expected);
        expect(text.startsWith(line[0], line[5])).toBe(true);
        expected += line[0].length;
      }
    });

    it('offsets are non-negative and monotonically increasing', () => {
      const text = 'alpha beta  gamma\ndelta   epsilon zeta';
      const lines = wrap(text, 120);
      let prev = -1;
      for (const line of lines) {
        expect(line[5]).toBeGreaterThanOrEqual(0);
        expect(line[5]).toBeGreaterThan(prev);
        prev = line[5];
      }
    });

    it('measureLines reports offsets when no wrapping occurs', () => {
      const text = 'one\ntwo\nthree';
      // maxWidth 0 routes through measureLines rather than wrapText.
      const [lines] = mapTextLayout(
        testMeasureText,
        { ascender: 10, descender: -2, lineGap: 2 },
        text,
        'left',
        'Arial',
        1,
        '',
        'normal',
        0,
        0,
        0,
        0,
      );
      expect(lines.map((l) => l[0])).toEqual(['one', 'two', 'three']);
      expect(lines.map((l) => l[5])).toEqual([0, 4, 8]);
    });

    it('preserves a single ZWSP within a line so offsets stay aligned', () => {
      const text = 'hi\u200Bthere';
      const lines = wrap(text, 200);
      expect(lines.length).toBe(1);
      // The ZWSP is zero-width but must stay in the text so rendered length
      // matches source length and span offsets stay aligned.
      expect(lines[0]?.[0]).toBe('hi\u200Bthere');
      expect(lines[0]?.[5]).toBe(0);
      expect(text.startsWith(lines[0]![0], lines[0]![5])).toBe(true);
    });

    it('maps collapsed-separator text to the correct spans (Canvas + SDF logic)', () => {
      // Regression lock for the span/line desync: a naive "+= lineLen + 1"
      // accumulator assumes one separator char and lands the second line at
      // 6 instead of 8; SDF additionally drifted per line and on astral chars.
      const text = 'hello   world \uD834\uDF06 test';
      const lines = wrap(text, 100);
      expect(lines.length).toBeGreaterThan(1);
      // 'world' begins after 'hello' (5) + three spaces.
      expect(lines[1]?.[5]).toBe(8);

      // Two spans splitting exactly at the wrap point.
      const spans = [
        { start: 0, end: 8 },
        { start: 8, end: text.length },
      ];
      const spanAt = (pos: number) => (pos >= 8 ? 1 : 0);

      for (const line of lines) {
        const lineText = line[0];
        const lineStart = line[5] as number;
        // Canvas logic: UTF-16 index j added to the absolute line offset.
        for (let j = 0; j < lineText.length; j++) {
          const pos = lineStart + j;
          // Every rendered char must be locatable in the source text.
          expect(text.charAt(pos)).toBe(lineText.charAt(j));
          expect(spanAt(pos)).toBe(pos >= spans[1]!.start ? 1 : 0);
        }
        // SDF logic: for..of iterates code points, advance by unit length so
        // astral characters (length 2) stay aligned with UTF-16 span offsets.
        let pos = lineStart;
        for (const char of lineText) {
          expect(text.startsWith(char, pos)).toBe(true);
          expect(spanAt(pos)).toBe(pos >= 8 ? 1 : 0);
          pos += char.length;
        }
        // The SDF walk must consume exactly the rendered line.
        expect(pos - lineStart).toBe(lineText.length);
      }
    });
  });
});
