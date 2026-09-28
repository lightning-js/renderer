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

import { describe, it, expect, beforeAll } from 'vitest';
import * as CanvasFontHandler from '../CanvasFontHandler.js';
import { canvasSpanFont } from '../RichTextMetrics.js';
import {
  parseRichText,
  ParseResult,
  type RichSpan,
} from '../RichTextParser.js';

/**
 * Minimal 2D context stub whose measureText depends on the current font, the
 * way a real UA's does: bold glyphs are wider than regular ones.
 */
const makeContext = () => {
  let font = '';
  return {
    get font() {
      return font;
    },
    set font(v: string) {
      font = v;
    },
    textBaseline: 'alphabetic',
    textRendering: 'auto',
    measureText(text: string) {
      const perChar = font.includes('bold') ? 12 : 10;
      return { width: text.length * perChar };
    },
    setTransform() {
      /* no-op */
    },
  } as unknown as CanvasRenderingContext2D;
};

describe('CanvasFontHandler measure font', () => {
  beforeAll(() => {
    const ctx = makeContext();
    CanvasFontHandler.init(ctx, ctx);
  });

  it('measureText follows setMeasureFont', () => {
    CanvasFontHandler.setMeasureFont('normal 20px Arial');
    const regular = CanvasFontHandler.measureText('brown', 'Arial', 0);

    CanvasFontHandler.setMeasureFont('normal bold 20px Arial');
    const bold = CanvasFontHandler.measureText('brown', 'Arial', 0);

    expect(regular).toBe(50);
    expect(bold).toBe(60);
    // The whole point: a bold run is wider, so advancing by the regular
    // measurement runs the following text into it.
    expect(bold).toBeGreaterThan(regular);
  });

  it('reports the active measure font', () => {
    CanvasFontHandler.setMeasureFont('italic 20px Arial');
    expect(CanvasFontHandler.getMeasureFont()).toBe('italic 20px Arial');
  });

  it('reports whether the font actually changed', () => {
    CanvasFontHandler.setMeasureFont('normal 20px Arial');
    // Redundant writes are skipped; assigning context.font forces the UA to
    // reparse the shorthand, which is why the draw loop guards on this.
    expect(CanvasFontHandler.setMeasureFont('normal 20px Arial')).toBe(false);
    expect(CanvasFontHandler.setMeasureFont('normal bold 20px Arial')).toBe(
      true,
    );
  });

  it('measures a styled line wider than the base font measured it', () => {
    // Reproduces the reported defect: '[b]brown[/b] fox' measured entirely
    // with the regular face is narrower than what actually gets drawn, so the
    // space between 'brown' and 'fox' is consumed and the words collide.
    const parsed = new ParseResult();
    parseRichText('The [b]brown[/b] fox', parsed);
    expect(parsed.stripped).toBe('The brown fox');

    const fontStyle = 'normal';
    const fontSize = 20;
    const fontFamily = 'Arial';
    const baseFont = `${fontStyle} ${fontSize}px Unknown, ${fontFamily}`;

    // What the style-agnostic layout engine measures.
    CanvasFontHandler.setMeasureFont(baseFont);
    const baseWidth = CanvasFontHandler.measureText(
      parsed.stripped,
      fontFamily,
      0,
    );

    // What the draw path actually advances, span by span.
    let styledWidth = 0;
    let cursor = 0;
    for (let i = 0; i < parsed.spanCount; i++) {
      const s = parsed.spans[i] as RichSpan;
      CanvasFontHandler.setMeasureFont(
        canvasSpanFont(s, fontStyle, fontSize, fontFamily),
      );
      styledWidth += CanvasFontHandler.measureText(
        parsed.stripped.substring(cursor, s.end),
        fontFamily,
        0,
      );
      cursor = s.end;
    }

    expect(styledWidth).toBeGreaterThan(baseWidth);
    // 'brown' is 5 chars and gains 2px per char in the stub's bold face.
    expect(styledWidth - baseWidth).toBe(10);
  });
});
