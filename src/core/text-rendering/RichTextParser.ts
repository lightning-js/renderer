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

// ---------------------------------------------------------------------------
// Character codes — avoids string allocation in the hot path
// ---------------------------------------------------------------------------
const CC_LBRACKET = 91; // '['
const CC_SLASH = 47; // '/'
const CC_ZERO = 48; // '0'
const CC_LC_X = 120; // 'x'
const CC_UC_X = 88; // 'X'
const CC_EQUALS = 61; // '='

// ---------------------------------------------------------------------------
// Tag type identifiers
// ---------------------------------------------------------------------------
const TAG_BOLD = 1;
const TAG_ITALIC = 2;
const TAG_UNDERLINE = 3;
const TAG_STRIKETHROUGH = 4;
const TAG_COLOR = 5;

// ---------------------------------------------------------------------------
// Pool limits
// ---------------------------------------------------------------------------
const MAX_SPANS = 64;
const MAX_STACK = 8;

// ---------------------------------------------------------------------------
// Pool limits
// ---------------------------------------------------------------------------
const namedColors: Record<string, number> = Object.create(null) as Record<
  string,
  number
>;
namedColors['red'] = 0xff0000ff;
namedColors['green'] = 0x00ff00ff;
namedColors['blue'] = 0x0000ffff;
namedColors['white'] = 0xffffffff;
namedColors['black'] = 0x000000ff;
namedColors['yellow'] = 0xffff00ff;
namedColors['cyan'] = 0x00ffffff;
namedColors['magenta'] = 0xff00ffff;
namedColors['orange'] = 0xff8000ff;
namedColors['purple'] = 0x800080ff;
namedColors['pink'] = 0xff69b4ff;
namedColors['brown'] = 0xa52a2aff;
namedColors['gray'] = 0x808080ff;
namedColors['grey'] = 0x808080ff;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * A single styled run within stripped text.
 *
 * Instances live in the pre-allocated pool inside ParseResult and are reused
 * across calls. Only indices [0, ParseResult.spanCount) are valid after a
 * parse. Do not retain references across subsequent parseRichText calls on the
 * same ParseResult instance.
 */
export class RichSpan {
  start = 0; // inclusive index into stripped text
  end = 0; // exclusive index into stripped text
  bold = false;
  italic = false;
  underline = false;
  strikethrough = false;
  color = 0; // 0 = inherit node color; otherwise 0xRRGGBBAA
}

/**
 * Output container for parseRichText.
 *
 * Create one instance per rendering module and reuse it. The internal span
 * pool is pre-allocated in the constructor — zero heap allocation per parse.
 */
export class ParseResult {
  stripped = '';
  spanCount = 0;
  readonly spans: RichSpan[];

  constructor() {
    this.spans = new Array<RichSpan>(MAX_SPANS);
    for (let i = 0; i < MAX_SPANS; i++) {
      this.spans[i] = new RichSpan();
    }
  }

  reset(): void {
    this.stripped = '';
    this.spanCount = 0;
  }
}

// ---------------------------------------------------------------------------
// Internal: style stack (module-level singleton — JS is single-threaded)
// ---------------------------------------------------------------------------

class StyleFrame {
  bold = false;
  italic = false;
  underline = false;
  strikethrough = false;
  color = 0;
  tagType = 0; // TAG_* constant that opened this frame; 0 = base

  copyFrom(src: StyleFrame): void {
    this.bold = src.bold;
    this.italic = src.italic;
    this.underline = src.underline;
    this.strikethrough = src.strikethrough;
    this.color = src.color;
    this.tagType = src.tagType;
  }
}

const _stack: StyleFrame[] = new Array<StyleFrame>(MAX_STACK);
for (let _i = 0; _i < MAX_STACK; _i++) {
  _stack[_i] = new StyleFrame();
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns the numeric value of a hex digit char code, or -1 when invalid.
 */
const hexDigitVal = (code: number): number => {
  if (code >= 48 && code <= 57) return code - 48; // '0'-'9'
  if (code >= 97 && code <= 102) return code - 87; // 'a'-'f'
  if (code >= 65 && code <= 70) return code - 55; // 'A'-'F'
  return -1;
};

/**
 * Parses a color value from text[start, tagEnd).
 *
 * Accepted format: 0xRRGGBBAA (8 hex digits after the 0x prefix), matching
 * the renderer's internal color representation exactly.
 * Returns the color as a 0xRRGGBBAA unsigned 32-bit integer, or -1 when the
 * value is not recognised.
 */
const parseColorValue = (
  text: string,
  start: number,
  tagEnd: number,
): number => {
  if (start >= tagEnd) return -1;

  const firstChar = text.charCodeAt(start);

  // ---- 0xRRGGBBAA — renderer internal format (8 hex digits) ----
  if (firstChar === CC_ZERO) {
    const secondChar = text.charCodeAt(start + 1);
    if (secondChar === CC_LC_X || secondChar === CC_UC_X) {
      const hexLen = tagEnd - start - 2; // digits after '0x'
      if (hexLen === 8) {
        let v = 0;
        for (let k = 2; k < 10; k++) {
          const d = hexDigitVal(text.charCodeAt(start + k));
          if (d === -1) return -1;
          v = v * 16 + d;
        }
        return v >>> 0;
      }
    }
  }

  return -1;
};

/**
 * Identifies the tag at text[pos, tagEnd) where pos is the first char of the
 * tag name (after '[' and any leading '/').
 *
 * Returns a TAG_* constant, or 0 when the tag is not recognised.
 */
const identifyTag = (text: string, pos: number, tagEnd: number): number => {
  const firstChar = text.charCodeAt(pos);
  const tagLen = tagEnd - pos;

  // Single-char tags: b i u s
  if (tagLen === 1) {
    if (firstChar === 98) return TAG_BOLD; // 'b'
    if (firstChar === 105) return TAG_ITALIC; // 'i'
    if (firstChar === 117) return TAG_UNDERLINE; // 'u'
    if (firstChar === 115) return TAG_STRIKETHROUGH; // 's'
    return 0;
  }

  // 'color' (5 chars, closing tag) or 'color=...' (6+ chars, opening tag)
  if (
    firstChar === 99 && // 'c'
    text.charCodeAt(pos + 1) === 111 && // 'o'
    text.charCodeAt(pos + 2) === 108 && // 'l'
    text.charCodeAt(pos + 3) === 111 && // 'o'
    text.charCodeAt(pos + 4) === 114 && // 'r'
    (tagLen === 5 || text.charCodeAt(pos + 5) === CC_EQUALS) // bare or 'color='
  ) {
    return TAG_COLOR;
  }

  return 0;
};

/**
 * Applies one tag to the style stack and returns the new stack depth.
 *
 * Opening: pushes a new frame copying the current style then modifying it.
 * Closing: searches backwards for the nearest matching opening frame and pops
 *          back to the frame before it, implicitly closing any intervening
 *          tags (handles mis-nested markup gracefully).
 */
const applyTag = (
  tagType: number,
  isClosing: boolean,
  stackDepth: number,
  colorValue: number,
): number => {
  if (isClosing === true) {
    for (let k = stackDepth; k > 0; k--) {
      if (_stack[k]!.tagType === tagType) {
        return k - 1;
      }
    }
    return stackDepth; // no matching open tag — ignore
  }

  if (stackDepth >= MAX_STACK - 1) return stackDepth; // stack full — ignore

  const next = stackDepth + 1;
  _stack[next]!.copyFrom(_stack[stackDepth]!);
  _stack[next]!.tagType = tagType;

  if (tagType === TAG_BOLD) {
    _stack[next]!.bold = true;
  } else if (tagType === TAG_ITALIC) {
    _stack[next]!.italic = true;
  } else if (tagType === TAG_UNDERLINE) {
    _stack[next]!.underline = true;
  } else if (tagType === TAG_STRIKETHROUGH) {
    _stack[next]!.strikethrough = true;
  } else if (tagType === TAG_COLOR) {
    _stack[next]!.color = colorValue;
  }

  return next;
};

/**
 * Writes a completed span into the pool when the range [start, end) is
 * non-empty and the pool has capacity. Returns the updated spanCount.
 */
const flushSpan = (
  spans: RichSpan[],
  spanCount: number,
  start: number,
  end: number,
  style: StyleFrame,
): number => {
  if (end <= start) return spanCount;
  if (spanCount >= MAX_SPANS) return spanCount;

  const span = spans[spanCount]!;
  span.start = start;
  span.end = end;
  span.bold = style.bold;
  span.italic = style.italic;
  span.underline = style.underline;
  span.strikethrough = style.strikethrough;
  span.color = style.color;

  return spanCount + 1;
};

/**
 * Returns true when two frames produce identical visible output (tagType is
 * internal metadata and is not compared).
 */
const stylesEqual = (a: StyleFrame, b: StyleFrame): boolean =>
  a.bold === b.bold &&
  a.italic === b.italic &&
  a.underline === b.underline &&
  a.strikethrough === b.strikethrough &&
  a.color === b.color;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses BB-code formatted text into stripped plain text and an array of
 * styled spans.
 *
 * Supported tags (all lowercase, nestable):
 *   [b]…[/b]                 bold
 *   [i]…[/i]                 italic
 *   [u]…[/u]                 underline
 *   [s]…[/s]                 strikethrough
 *   [color=0xRRGGBBAA]…[/color]   inline color (VALUE must be a 0xRRGGBBAA
 *                            hex literal matching the renderer's internal
 *                            color format, e.g. [color=0xff0000ff])
 *
 * Unrecognised or malformed tags are emitted as literal text.
 * Mis-nested closing tags implicitly close any intervening open tags.
 *
 * The result is written into `out`. Span data is valid for indices
 * [0, out.spanCount). Do not retain span references across subsequent calls
 * on the same `out` instance.
 *
 * Performance: single-pass, O(n) in text length. Zero heap allocation in the
 * hot path — all spans and stack frames are reused from pre-allocated pools.
 */
export const parseRichText = (text: string, out: ParseResult): void => {
  out.reset();

  const textLen = text.length;
  if (textLen === 0) return;

  // Reset base stack frame to defaults
  const base = _stack[0]!;
  base.bold = false;
  base.italic = false;
  base.underline = false;
  base.strikethrough = false;
  base.color = 0;
  base.tagType = 0;

  let stackDepth = 0;
  let spanStart = 0; // start of current span in stripped text
  let spanCount = 0;
  let stripped = '';
  let runStart = 0; // start of current literal run in original text

  let i = 0;
  while (i < textLen) {
    if (text.charCodeAt(i) !== CC_LBRACKET) {
      i++;
      continue;
    }

    // Possible tag — find closing ']'
    const tagEnd = text.indexOf(']', i + 1);
    if (tagEnd === -1) {
      i++;
      continue; // no ']' found — treat '[' as literal
    }

    let pos = i + 1;
    let isClosing = false;
    if (text.charCodeAt(pos) === CC_SLASH) {
      isClosing = true;
      pos++;
    }

    if (pos >= tagEnd) {
      i++;
      continue; // empty tag '[]' or '[/]' — literal
    }

    const tagType = identifyTag(text, pos, tagEnd);
    if (tagType === 0) {
      i++;
      continue; // unrecognised tag — treat '[' as literal
    }

    // Resolve color value for opening [color=...] before touching the stack
    let colorValue = 0;
    if (tagType === TAG_COLOR && isClosing === false) {
      colorValue = parseColorValue(text, pos + 6, tagEnd); // skip 'color='
      if (colorValue === -1) {
        i++;
        continue; // invalid color value — treat '[' as literal
      }
    }

    // Flush the literal run [runStart, i) into stripped
    stripped += text.substring(runStart, i);
    runStart = tagEnd + 1;

    // Apply the tag to the stack
    const prevDepth = stackDepth;
    stackDepth = applyTag(tagType, isClosing, stackDepth, colorValue);

    // When the visible style changes, close the current span
    if (stylesEqual(_stack[prevDepth]!, _stack[stackDepth]!) === false) {
      spanCount = flushSpan(
        out.spans,
        spanCount,
        spanStart,
        stripped.length,
        _stack[prevDepth]!,
      );
      spanStart = stripped.length;
    }

    i = tagEnd + 1;
  }

  // Flush the final literal run
  stripped += text.substring(runStart, textLen);

  // Close any open span
  spanCount = flushSpan(
    out.spans,
    spanCount,
    spanStart,
    stripped.length,
    _stack[stackDepth]!,
  );

  out.stripped = stripped;
  out.spanCount = spanCount;
};

/**
 * Returns the plain text with all recognised BB-code tags removed.
 *
 * Faster than parseRichText when span metadata is not needed (e.g. layout
 * measurement). Unrecognised tags are preserved as literal text.
 *
 * Fast-paths text that contains no '[' characters with a single indexOf check.
 */
export const stripRichText = (text: string): string => {
  if (text.indexOf('[') === -1) return text;

  let stripped = '';
  let runStart = 0;
  let i = 0;
  const textLen = text.length;

  while (i < textLen) {
    if (text.charCodeAt(i) !== CC_LBRACKET) {
      i++;
      continue;
    }

    const tagEnd = text.indexOf(']', i + 1);
    if (tagEnd === -1) {
      i++;
      continue;
    }

    let pos = i + 1;
    if (text.charCodeAt(pos) === CC_SLASH) pos++;
    if (pos >= tagEnd) {
      i++;
      continue;
    }

    if (identifyTag(text, pos, tagEnd) === 0) {
      i++;
      continue; // unrecognised — keep literal
    }

    stripped += text.substring(runStart, i);
    runStart = tagEnd + 1;
    i = tagEnd + 1;
  }

  stripped += text.substring(runStart, textLen);
  return stripped;
};
