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

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ParseResult,
  RichSpan,
  parseRichText,
  stripRichText,
} from '../RichTextParser.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let out: ParseResult;

beforeEach(() => {
  out = new ParseResult();
});

const parse = (text: string) => {
  parseRichText(text, out);
  return out;
};

/** Extract only the fields we care about from a span for concise assertions. */
const span = (
  start: number,
  end: number,
  overrides: Partial<Omit<RichSpan, 'start' | 'end'>> = {},
) => ({
  start,
  end,
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  color: 0,
  ...overrides,
});

const spansOf = (r: ParseResult) =>
  Array.from({ length: r.spanCount }, (_, i) => {
    const s = r.spans[i]!;
    return {
      start: s.start,
      end: s.end,
      bold: s.bold,
      italic: s.italic,
      underline: s.underline,
      strikethrough: s.strikethrough,
      color: s.color,
    };
  });

// ---------------------------------------------------------------------------
// parseRichText — empty / plain text
// ---------------------------------------------------------------------------

describe('parseRichText', () => {
  describe('empty and plain text', () => {
    it('returns empty stripped and zero spans for empty string', () => {
      parse('');
      expect(out.stripped).toBe('');
      expect(out.spanCount).toBe(0);
    });

    it('returns full text and one default span for plain text', () => {
      parse('Hello World');
      expect(out.stripped).toBe('Hello World');
      expect(out.spanCount).toBe(1);
      expect(spansOf(out)).toEqual([span(0, 11)]);
    });

    it('returns original text and one span when no tags are present', () => {
      parse('No [markup] here');
      // '[markup]' is unrecognised — emitted as literal
      expect(out.stripped).toBe('No [markup] here');
      expect(out.spanCount).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Single tags
  // -------------------------------------------------------------------------

  describe('bold [b]', () => {
    it('parses a fully wrapped bold string', () => {
      parse('[b]hello[/b]');
      expect(out.stripped).toBe('hello');
      expect(spansOf(out)).toEqual([span(0, 5, { bold: true })]);
    });

    it('produces three spans for bold inline', () => {
      parse('a [b]b[/b] c');
      expect(out.stripped).toBe('a b c');
      expect(spansOf(out)).toEqual([
        span(0, 2), // 'a '
        span(2, 3, { bold: true }), // 'b'
        span(3, 5), // ' c'
      ]);
    });
  });

  describe('italic [i]', () => {
    it('parses a fully wrapped italic string', () => {
      parse('[i]world[/i]');
      expect(out.stripped).toBe('world');
      expect(spansOf(out)).toEqual([span(0, 5, { italic: true })]);
    });
  });

  describe('underline [u]', () => {
    it('parses underline', () => {
      parse('[u]under[/u]');
      expect(out.stripped).toBe('under');
      expect(spansOf(out)).toEqual([span(0, 5, { underline: true })]);
    });
  });

  describe('strikethrough [s]', () => {
    it('parses strikethrough', () => {
      parse('[s]strike[/s]');
      expect(out.stripped).toBe('strike');
      expect(spansOf(out)).toEqual([span(0, 6, { strikethrough: true })]);
    });
  });

  // -------------------------------------------------------------------------
  // Color tag
  // -------------------------------------------------------------------------

  describe('[color]', () => {
    it('parses 0xRRGGBBAA color (opaque red)', () => {
      parse('[color=0xff0000ff]red[/color]');
      expect(out.stripped).toBe('red');
      expect(spansOf(out)).toEqual([span(0, 3, { color: 0xff0000ff })]);
    });

    it('parses 0xRRGGBBAA color with partial alpha', () => {
      parse('[color=0xff000080]red[/color]');
      expect(out.stripped).toBe('red');
      expect(spansOf(out)).toEqual([span(0, 3, { color: 0xff000080 })]);
    });

    it('parses 0xRRGGBBAA with uppercase 0X prefix', () => {
      parse('[color=0XFF0000FF]red[/color]');
      expect(out.stripped).toBe('red');
      expect(spansOf(out)).toEqual([span(0, 3, { color: 0xff0000ff })]);
    });

    it('parses 0xRRGGBBAA with mixed-case hex digits', () => {
      parse('[color=0xFF0000ff]red[/color]');
      expect(out.stripped).toBe('red');
      expect(spansOf(out)).toEqual([span(0, 3, { color: 0xff0000ff })]);
    });

    it('treats [color=] with no value as literal', () => {
      parse('[color=]text');
      expect(out.stripped).toBe('[color=]text');
    });

    it('treats CSS #rrggbb as literal (app-level format not supported)', () => {
      parse('[color=#ff0000]text[/color]');
      expect(out.stripped).toContain('[color=#ff0000]');
      expect(out.stripped).toContain('text');
    });

    it('treats CSS #rgb shorthand as literal (app-level format not supported)', () => {
      parse('[color=#f00]text[/color]');
      expect(out.stripped).toContain('[color=#f00]');
    });

    it('treats 0xRRGGBB (6-digit, no alpha) as literal', () => {
      parse('[color=0xff0000]text[/color]');
      expect(out.stripped).toContain('[color=0xff0000]');
      expect(out.stripped).toContain('text');
    });

    it('treats invalid hex chars in 0x color as literal', () => {
      parse('[color=0xGGGGGGGG]text');
      expect(out.stripped).toContain('[color=0xGGGGGGGG]');
    });

    it('treats named color as literal (app-level format not supported)', () => {
      parse('[color=red]text[/color]');
      expect(out.stripped).toContain('[color=red]');
      expect(out.stripped).toContain('text');
    });

    it('resets color on [/color]', () => {
      parse('[color=0xff0000ff]A[/color]B');
      expect(out.stripped).toBe('AB');
      const spans = spansOf(out);
      expect(spans[0]).toEqual(span(0, 1, { color: 0xff0000ff }));
      expect(spans[1]).toEqual(span(1, 2)); // color back to 0 (inherit)
    });
  });

  // -------------------------------------------------------------------------
  // Nesting
  // -------------------------------------------------------------------------

  describe('nested tags', () => {
    it('combines bold + italic when nested', () => {
      parse('[b][i]bold italic[/i][/b]');
      expect(out.stripped).toBe('bold italic');
      expect(spansOf(out)).toEqual([span(0, 11, { bold: true, italic: true })]);
    });

    it('correctly splits spans for partially overlapping styles', () => {
      parse('[b]bold[/b][i]italic[/i]');
      expect(out.stripped).toBe('bolditalic');
      expect(spansOf(out)).toEqual([
        span(0, 4, { bold: true }),
        span(4, 10, { italic: true }),
      ]);
    });

    it('handles three nested tags', () => {
      parse('[b][i][u]all[/u][/i][/b]');
      expect(out.stripped).toBe('all');
      expect(spansOf(out)).toEqual([
        span(0, 3, { bold: true, italic: true, underline: true }),
      ]);
    });

    it('combines color with bold', () => {
      parse('[color=0xff0000ff][b]red bold[/b][/color]');
      expect(out.stripped).toBe('red bold');
      expect(spansOf(out)).toEqual([
        span(0, 8, { bold: true, color: 0xff0000ff }),
      ]);
    });

    it('produces correct spans for text before, inside and after tags', () => {
      parse('Hello [b]World[/b]!');
      expect(out.stripped).toBe('Hello World!');
      expect(spansOf(out)).toEqual([
        span(0, 6), // 'Hello '
        span(6, 11, { bold: true }), // 'World'
        span(11, 12), // '!'
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // Mis-nested / malformed tags
  // -------------------------------------------------------------------------

  describe('mis-nesting and malformed tags', () => {
    it('handles mis-nested closing tag by implicitly closing inner tags', () => {
      // [b][i]…[/b] — [/b] closes both italic (inner) and bold, leaving plain
      parse('[b][i]AB[/b]C');
      expect(out.stripped).toBe('ABC');
      const spans = spansOf(out);
      // 'AB' is bold+italic; 'C' is plain (both closed by [/b])
      expect(spans[0]).toEqual(span(0, 2, { bold: true, italic: true }));
      expect(spans[1]).toEqual(span(2, 3));
    });

    it('ignores over-closing (close without matching open)', () => {
      parse('hello[/b]');
      expect(out.stripped).toBe('hello');
      expect(spansOf(out)).toEqual([span(0, 5)]);
    });

    it('treats tag without closing bracket as literal', () => {
      parse('[b');
      expect(out.stripped).toBe('[b');
      expect(out.spanCount).toBe(1);
    });

    it('treats unknown tag as literal text', () => {
      parse('[xyz]text[/xyz]');
      expect(out.stripped).toBe('[xyz]text[/xyz]');
    });

    it('treats empty tag [] as literal', () => {
      parse('a[]b');
      expect(out.stripped).toBe('a[]b');
    });

    it('treats empty closing tag [/] as literal', () => {
      parse('a[/]b');
      expect(out.stripped).toBe('a[/]b');
    });
  });

  // -------------------------------------------------------------------------
  // Unclosed tags
  // -------------------------------------------------------------------------

  describe('unclosed tags', () => {
    it('extends an unclosed tag to end of string', () => {
      parse('[b]hello');
      expect(out.stripped).toBe('hello');
      expect(spansOf(out)).toEqual([span(0, 5, { bold: true })]);
    });

    it('extends multiple stacked unclosed tags to end of string', () => {
      parse('[b][i]text');
      expect(out.stripped).toBe('text');
      expect(spansOf(out)).toEqual([span(0, 4, { bold: true, italic: true })]);
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  describe('edge cases', () => {
    it('produces no spans for a string that is only tags with no characters', () => {
      parse('[b][/b]');
      expect(out.stripped).toBe('');
      expect(out.spanCount).toBe(0);
    });

    it('does not create a span when the style does not change (duplicate tag)', () => {
      // [b][b]text[/b][/b] — nested bold: still one span, bold throughout
      parse('[b][b]text[/b][/b]');
      expect(out.stripped).toBe('text');
      // Both [b] frames push bold=true; stylesEqual detects no visible change
      // on the second [b], so there is exactly one span.
      expect(out.spanCount).toBe(1);
      expect(spansOf(out)).toEqual([span(0, 4, { bold: true })]);
    });

    it('handles adjacent spans with different styles', () => {
      parse('[b]A[/b][i]B[/i][u]C[/u]');
      expect(out.stripped).toBe('ABC');
      expect(spansOf(out)).toEqual([
        span(0, 1, { bold: true }),
        span(1, 2, { italic: true }),
        span(2, 3, { underline: true }),
      ]);
    });

    it('reuses the ParseResult correctly on a second call', () => {
      parse('[b]first[/b]');
      expect(out.stripped).toBe('first');

      parse('[i]second[/i]');
      expect(out.stripped).toBe('second');
      expect(spansOf(out)).toEqual([span(0, 6, { italic: true })]);
    });

    it('handles text with multiple [ that are not tags', () => {
      parse('a[0]b[1]c');
      // '[0]' and '[1]' are unrecognised — literal
      expect(out.stripped).toBe('a[0]b[1]c');
    });
  });
});

// ---------------------------------------------------------------------------
// stripRichText
// ---------------------------------------------------------------------------

describe('stripRichText', () => {
  it('returns the same string reference when there are no brackets', () => {
    const input = 'no brackets here';
    expect(stripRichText(input)).toBe(input);
  });

  it('strips bold tags', () => {
    expect(stripRichText('[b]hello[/b]')).toBe('hello');
  });

  it('strips italic tags', () => {
    expect(stripRichText('[i]hello[/i]')).toBe('hello');
  });

  it('strips underline tags', () => {
    expect(stripRichText('[u]under[/u]')).toBe('under');
  });

  it('strips strikethrough tags', () => {
    expect(stripRichText('[s]strike[/s]')).toBe('strike');
  });

  it('strips color tags', () => {
    expect(stripRichText('[color=0xff0000ff]text[/color]')).toBe('text');
  });

  it('strips multiple tags leaving plain text', () => {
    expect(stripRichText('Hello [b]World[/b]!')).toBe('Hello World!');
  });

  it('preserves unrecognised tags as literal', () => {
    expect(stripRichText('[xyz]text[/xyz]')).toBe('[xyz]text[/xyz]');
  });

  it('handles empty string', () => {
    expect(stripRichText('')).toBe('');
  });

  it('handles only tags with no text', () => {
    expect(stripRichText('[b][/b]')).toBe('');
  });

  it('strips nested tags', () => {
    expect(stripRichText('[b][i]text[/i][/b]')).toBe('text');
  });

  it('handles tag without closing bracket as literal', () => {
    expect(stripRichText('[b')).toBe('[b');
  });
});
