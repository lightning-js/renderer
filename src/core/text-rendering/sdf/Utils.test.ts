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
  breakLongWord,
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
      const width = measureText('hello', 'Arial', mockFontData, 0);
      expect(width).toBe(50); // 5 characters * 10 units each
    });

    it('should handle empty text', () => {
      const width = measureText('', 'Arial', mockFontData, 0);
      expect(width).toBe(0);
    });

    it('should account for letter spacing', () => {
      const width = measureText('hello', 'Arial', mockFontData, 2);
      expect(width).toBe(60); // 5 characters * 10 units + 5 * 2 letter spacing
    });

    it('should skip zero-width spaces', () => {
      const width = measureText('hel\u200Blo', 'Arial', mockFontData, 0);
      expect(width).toBe(50); // ZWSP should not contribute to width
    });
  });

  describe('wrapLine', () => {
    it('should wrap text that exceeds max width', () => {
      const result = wrapLine(
        'hello world test',
        'Arial',
        mockFontData,
        1.0, // fontScale
        100, // maxWidth (10 characters at 10 units each)
        0, // designLetterSpacing
        10, // spaceWidth
        '',
        0,
      );
      expect(result).toEqual(['hello', 'world test']);
    });

    it('should handle single word that fits', () => {
      const result = wrapLine(
        'hello',
        'Arial',
        mockFontData,
        1.0,
        100,
        0,
        10, // spaceWidth
        '',
        0,
      );
      expect(result).toEqual(['hello']);
    });

    it('should break long words', () => {
      const result = wrapLine(
        'verylongwordthatdoesnotfit',
        'Arial',
        mockFontData,
        1.0,
        100, // Only 10 characters fit
        0,
        10, // spaceWidth
        '',
        0,
      );
      expect(result.length).toBeGreaterThan(1);
      expect(result[0]).toHaveLength(10);
    });

    it('should handle ZWSP as word break opportunity', () => {
      const result = wrapLine(
        'hello\u200Bworld test',
        'Arial',
        mockFontData,
        1.0,
        100,
        0,
        10, // spaceWidth
        '',
        0,
      );
      expect(result).toEqual(['hello', 'world test']);
    });

    it('should truncate with suffix when max lines reached', () => {
      const result = wrapLine(
        'hello world test more',
        'Arial',
        mockFontData,
        1.0,
        100,
        0,
        10, // spaceWidth
        '...',
        1, // remainingLines = 1
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toContain('...');
    });
  });

  describe('wrapText', () => {
    it('should wrap multiple lines', () => {
      const result = wrapText(
        'line one\nline two that is longer',
        'Arial',
        mockFontData,
        16,
        1.0,
        100,
        0,
        '',
        0,
      );
      expect(result.length).toBeGreaterThan(2);
      expect(result[0]).toBe('line one');
    });

    it('should handle empty lines', () => {
      const result = wrapText(
        'line one\n\nline three',
        'Arial',
        mockFontData,
        16,
        1.0,
        100,
        0,
        '',
        0,
      );
      expect(result[1]).toBe('');
    });

    it('should respect max lines limit', () => {
      const result = wrapText(
        'line one\\nline two\\nline three\\nline four',
        'Arial',
        mockFontData,
        16,
        1.0,
        100,
        0,
        '',
        2, // maxLines = 2
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('truncateLineWithSuffix', () => {
    it('should truncate line and add suffix', () => {
      const result = truncateLineWithSuffix(
        'this is a very long line',
        'Arial',
        mockFontData,
        1.0,
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
        mockFontData,
        1.0,
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
      const result = truncateLineWithSuffix(
        'short',
        'Arial',
        mockFontData,
        1.0,
        100,
        0,
        '...',
      );
      expect(result).toBe('short...');
    });
  });

  describe('breakLongWord', () => {
    it('should break word into multiple lines', () => {
      const result = breakLongWord(
        'verylongword',
        'Arial',
        mockFontData,
        1.0,
        50, // 5 characters max per line
        0,
        '',
        0,
      );
      expect(result.length).toBeGreaterThan(1);
      expect(result[0]).toHaveLength(5);
    });

    it('should handle single character word', () => {
      const result = breakLongWord(
        'a',
        'Arial',
        mockFontData,
        1.0,
        50,
        0,
        '',
        0,
      );
      expect(result).toEqual(['a']);
    });

    it('should truncate with suffix when max lines reached', () => {
      const result = breakLongWord(
        'verylongword',
        'Arial',
        mockFontData,
        1.0,
        50,
        0,
        '...',
        1, // remainingLines = 1
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toContain('...');
    });

    it('should handle empty word', () => {
      const result = breakLongWord(
        '',
        'Arial',
        mockFontData,
        1.0,
        50,
        0,
        '',
        0,
      );
      expect(result).toEqual([]);
    });
  });

  describe('Integration tests', () => {
    it('should handle complex text with ZWSP and wrapping', () => {
      const text =
        'This is a test\u200Bwith zero-width\u200Bspaces that should wrap properly';
      const result = wrapText(
        text,
        'Arial',
        mockFontData,
        16,
        1.0,
        200, // 20 characters max per line
        0,
        '...',
        0,
      );
      expect(result.length).toBeGreaterThan(1);
      // Should split at ZWSP and regular spaces
      expect(result.some((line) => line.includes('zero-width'))).toBe(true);
    });

    it('should handle mixed content with long words and ZWSP', () => {
      const text = 'Short\u200Bverylongwordthatmustbebroken\u200Bshort';
      const result = wrapText(
        text,
        'Arial',
        mockFontData,
        16,
        1.0,
        100, // 10 characters max per line
        0,
        '',
        0,
      );
      expect(result.length).toBeGreaterThan(2);
      expect(result[0]).toBe('Short');
      expect(result[result.length - 1]).toBe('short');
    });
  });
});
