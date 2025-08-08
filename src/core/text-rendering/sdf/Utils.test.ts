/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2025 Comcast Cable Management, LLC.
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

import { describe, it, expect, beforeAll, vi } from 'vitest';
import {
  wrapText,
  wrapLine,
  measureText,
  truncateLineWithSuffix,
  breakWord,
} from './Utils.js';
import * as SdfFontHandler from '../SdfFontHandler.js';

// Mock font data for testing
const mockFontData: SdfFontHandler.SdfFontData = {
  info: {
    face: 'Arial',
    size: 16,
    bold: 0,
    italic: 0,
    charset: [],
    unicode: 1,
    stretchH: 100,
    smooth: 1,
    aa: 1,
    padding: [0, 0, 0, 0],
    spacing: [0, 0],
    outline: 0,
  },
  common: {
    lineHeight: 20,
    base: 16,
    scaleW: 512,
    scaleH: 512,
    pages: 1,
    packed: 0,
    alphaChnl: 0,
    redChnl: 0,
    greenChnl: 0,
    blueChnl: 0,
  },
  distanceField: {
    fieldType: 'msdf',
    distanceRange: 4,
  },
  pages: ['font.png'],
  chars: [],
  kernings: [],
};

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

describe('SDF Text Utils', () => {
  beforeAll(() => {
    // Mock the SdfFontHandler functions
    vi.spyOn(SdfFontHandler, 'getGlyph').mockImplementation(mockGetGlyph);
    vi.spyOn(SdfFontHandler, 'getKerning').mockImplementation(mockGetKerning);
  });

  describe('measureText', () => {
    it('should measure text width correctly', () => {
      const width = measureText('hello', 'Arial', 0);
      expect(width).toBe(50); // 5 characters * 10 units each
    });

    it('should handle empty text', () => {
      const width = measureText('', 'Arial', 0);
      expect(width).toBe(0);
    });

    it('should account for letter spacing', () => {
      const width = measureText('hello', 'Arial', 2);
      expect(width).toBe(60); // 5 characters * 10 units + 5 * 2 letter spacing
    });

    it('should skip zero-width spaces', () => {
      const width = measureText('hel\u200Blo', 'Arial', 0);
      expect(width).toBe(50); // ZWSP should not contribute to width
    });
  });

  describe('wrapLine', () => {
    it('should wrap text that exceeds max width', () => {
      const result = wrapLine(
        'hello world test',
        'Arial',
        100, // maxWidth (10 characters at 10 units each)
        0, // designLetterSpacing
        10, // spaceWidth
        '',
        'normal',
        0,
        false,
      );

      const [lines] = result;
      const [line1] = lines![0]!;
      const [line2] = lines![1]!;

      expect(line1).toEqual('hello'); // Break at space, not ZWSP
      expect(line2).toEqual('world test');
    });

    it('should handle single word that fits', () => {
      const result = wrapLine(
        'hello',
        'Arial',
        100,
        0,
        10, // spaceWidth
        '',
        'normal',
        0,
        false,
      );
      expect(result[0][0]).toEqual(['hello', 50]);
    });

    it('should break long words', () => {
      const result = wrapLine(
        'verylongwordthatdoesnotfit',
        'Arial',
        100, // Only 10 characters fit (each char = 10 units)
        0,
        10, // spaceWidth
        '',
        'normal',
        0,
        false,
      );
      expect(result.length).toBeGreaterThan(1);
      // The first line should exist and be appropriately sized
      expect(result[0]).toBeDefined();
      if (result[0][0]) {
        expect(result[0][0].length).toBeLessThanOrEqual(10);
      }
    });

    it('should handle ZWSP as word break opportunity', () => {
      // Test 1: ZWSP should provide break opportunity when needed
      const result1 = wrapLine(
        'hello\u200Bworld test',
        'Arial',
        100, // 10 characters max - 'helloworld' = 100 units (fits), ' test' = 50 units (exceeds)
        0,
        10, // spaceWidth
        '',
        'normal',
        0,
        false,
      );

      const [lines] = result1;
      const [line1] = lines![0]!;
      const [line2] = lines![1]!;

      expect(line1).toEqual('helloworld'); // Break at space, not ZWSP
      expect(line2).toEqual('test');

      // Test 2: ZWSP should NOT break when text fits on one line
      const result2 = wrapLine(
        'hi\u200Bthere',
        'Arial',
        200, // Wide enough for all text (7 characters = 70 units)
        0,
        10, // spaceWidth
        '',
        'normal',
        0,
        false,
      );
      expect(result2[0][0]).toEqual(['hithere', 70]); // ZWSP is invisible, no space added

      // Test 3: ZWSP should break when it's the only break opportunity
      const result3 = wrapLine(
        'verylongword\u200Bmore',
        'Arial',
        100, // 10 characters max - forces break at ZWSP
        0,
        10, // spaceWidth
        '',
        'normal',
        0,
        false,
      );
      expect(result3.length).toBeGreaterThan(1); // Should break at ZWSP position
      expect(result3[0][0]).toEqual(['verylongword', 120]);
    });

    it('should truncate with suffix when max lines reached', () => {
      const result = wrapLine(
        'hello world test more',
        'Arial',
        100,
        0,
        10, // spaceWidth
        '...',
        'normal',
        1, // remainingLines = 1
        false,
      );
      expect(result[0]).toHaveLength(1);
      expect(result[0][0]?.[0]).toContain('...');
    });
  });

  describe('wrapText', () => {
    it('should wrap multiple lines', () => {
      const result = wrapText(
        'line one\nline two that is longer',
        'Arial',
        1.0,
        100,
        0,
        '',
        'normal',
        0,
        false,
      );
      expect(result[0].length).toBeGreaterThan(2);
      expect(result[0][0]).toStrictEqual(['line one', 80]);
    });

    it('should handle empty lines', () => {
      const result = wrapText(
        'line one\n\nline three',
        'Arial',
        1.0,
        100,
        0,
        '',
        'normal',
        0,
        false,
      );
      expect(result[0][1]?.[0]).toBe('');
    });

    it('should respect max lines limit', () => {
      const result = wrapText(
        'line one\\nline two\\nline three\\nline four',
        'Arial',
        1.0,
        100,
        0,
        '',
        'normal',
        2, // maxLines = 2
        true,
      );
      const [lines] = result;
      expect(lines).toHaveLength(2);
    });
  });

  describe('truncateLineWithSuffix', () => {
    it('should truncate line and add suffix', () => {
      const result = truncateLineWithSuffix(
        'this is a very long line',
        'Arial',
        100, // Max width for 10 characters
        0,
        '...',
      );
      expect(result).toContain('...');
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should return suffix if suffix is too long', () => {
      const result = truncateLineWithSuffix(
        'hello',
        'Arial',
        30, // Only 3 characters fit
        0,
        'verylongsuffix',
      );
      expect(result).toMatch(/verylongsuffi/); // Truncated suffix
    });

    it('should return original line with suffix (current behavior)', () => {
      // Note: The current implementation always adds the suffix, even if the line fits.
      // This is the expected behavior when used in overflow contexts where the suffix
      // indicates that content was truncated at the line limit.
      const result = truncateLineWithSuffix('short', 'Arial', 100, 0, '...');
      expect(result).toBe('short...');
    });
  });

  describe('breakLongWord', () => {
    it('should break word into multiple lines', () => {
      const result = breakWord(
        'verylongword',
        'Arial',
        50, // 5 characters max per line
        0,
        0,
        false,
      );
      expect(result[0].length).toBeGreaterThan(1);
      expect(result[0][0]?.[0]).toHaveLength(5);
    });

    it('should handle single character word', () => {
      const result = breakWord('a', 'Arial', 50, 0, 0, false);
      expect(result[0][0]).toStrictEqual(['a', 10]);
    });

    it('should truncate with suffix when max lines reached', () => {
      const result = breakWord(
        'verylongword',
        'Arial',
        50,
        0,
        1, // remainingLines = 1
        true,
      );
      expect(result[0]).toHaveLength(1);
    });

    it('should handle empty word', () => {
      const result = breakWord('', 'Arial', 50, 0, 0, true);
      expect(result[0]).toEqual([]);
    });
  });

  describe('Integration tests', () => {
    it('should handle complex text with ZWSP and wrapping', () => {
      const text =
        'This is a test\u200Bwith zero-width\u200Bspaces that should wrap properly';
      const result = wrapText(
        text,
        'Arial',
        1.0,
        200, // 20 characters max per line
        0,
        '...',
        'normal',
        0,
        false,
      );
      expect(result.length).toBeGreaterThan(1);
      const [lines] = result;
      // Should split at ZWSP and regular spaces
      expect(lines.some((line) => line[0].includes('zero-width'))).toBe(true);
    });

    it('should handle mixed content with long words and ZWSP', () => {
      const text = 'Short\u200Bverylongwordthatmustbebroken\u200Bshort';
      const result = wrapText(
        text,
        'Arial',
        1.0,
        100, // 10 characters max per line
        0,
        '',
        'normal',
        0,
        false,
      );
      expect(result.length).toBeGreaterThan(2);
      expect(result[0][0]?.[0]).toBe('Short');
      expect(result[0][result.length - 1]?.[0]).toBe('short');
    });
  });
});
