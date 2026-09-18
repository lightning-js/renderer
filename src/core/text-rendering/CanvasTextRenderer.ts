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

import { assertTruthy } from '../../utils.js';
import type { Stage } from '../Stage.js';
import type {
  CanvasRenderInfo,
  FontHandler,
  MeasureTextFn,
  TextLineStruct,
  TextRenderInfo,
} from './TextRenderer.js';
import * as CanvasFontHandler from './CanvasFontHandler.js';
import type { CoreTextNodeProps } from '../CoreTextNode.js';
import { getLayoutCacheKey, hasZeroWidthSpace } from './Utils.js';
import { mapTextLayout } from './TextLayoutEngine.js';
import { parseRichText, ParseResult } from './RichTextParser.js';
import { canvasSpanFont, spanIndexAt } from './RichTextMetrics.js';
import { normalizeCanvasColor } from '../lib/colorCache.js';

const type = 'canvas' as const;
const font: FontHandler = CanvasFontHandler;

let stage: Stage | null = null;
let canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
let context:
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D
  | null = null;

// Whether the drawing canvas is an OffscreenCanvas (supports transferToImageBitmap)
let isOffscreen = false;

// Separate canvas and context for text measurements
let measureCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;
type MeasureContext =
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D
  | null;
let measureContext: MeasureContext = null;

// Cache for text layout calculations
const renderInfoCache = new Map<string, CanvasRenderInfo>();

// Pre-allocated rich text parse result — reused across renderText calls.
// Safe because renderText is synchronous and JS is single-threaded.
const _richTextResult = new ParseResult();

/**
 * Build a {@link MeasureTextFn} that measures each substring with the fonts of
 * the rich text spans covering it.
 *
 * @remarks
 * The layout engine hands us the absolute offset of every substring it
 * measures, so a bold run can be measured with the bold face during line
 * breaking instead of afterwards. Without this, a line that fits under regular
 * metrics but overflows in bold wraps in the wrong place.
 *
 * The range is split at span boundaries and each run measured with its own
 * font. Measuring whole runs keeps kerning intact within a run; kerning across
 * a style boundary is dropped, which is correct — the glyphs come from
 * different faces.
 *
 * `start < 0` means the caller could not locate the substring in the source
 * (the overflow suffix, or a separator), so the base font is used.
 *
 * The returned function leaves the shared measure context on whatever font it
 * last used; callers restore it.
 */
const makeStyledMeasureText = (
  baseFont: string,
  fontStyle: string,
  fontSize: number,
  fontFamily: string,
): MeasureTextFn => {
  const spans = _richTextResult.spans;

  return (text, family, letterSpacing, start) => {
    const spanCount = _richTextResult.spanCount;
    const len = text.length;

    if (start === undefined || start < 0 || spanCount === 0 || len === 0) {
      CanvasFontHandler.setMeasureFont(baseFont);
      return CanvasFontHandler.measureText(text, family, letterSpacing);
    }

    let width = 0;
    let segStart = 0;
    let segSpanIdx = spanIndexAt(spans, spanCount, start, 0);

    for (let j = 1; j <= len; j++) {
      let nextSpanIdx = segSpanIdx;
      if (j < len) {
        nextSpanIdx = spanIndexAt(spans, spanCount, start + j, segSpanIdx);
      }
      if (j === len || nextSpanIdx !== segSpanIdx) {
        CanvasFontHandler.setMeasureFont(
          canvasSpanFont(spans[segSpanIdx]!, fontStyle, fontSize, fontFamily),
        );
        width += CanvasFontHandler.measureText(
          text.substring(segStart, j),
          family,
          letterSpacing,
        );
        segStart = j;
        segSpanIdx = nextSpanIdx;
      }
    }
    return width;
  };
};

/**
 * Recompute line widths using a style-aware measure function, returning the
 * widest.
 *
 * @remarks
 * The layout engine now measures styled runs correctly, but a line's width is
 * accumulated from word widths plus base-font separator widths, so it is not
 * exactly the drawn extent. That width sizes the texture and is published as
 * the node's width, so measure each final line in one go instead.
 *
 * Line `x` offsets are recomputed too, because the non-left alignments are
 * relative to the widest line and that reference may have moved.
 *
 * Mutates `lines` in place (widths at index 1, x offsets at index 3).
 */
const correctStyledLineWidths = (
  lines: TextLineStruct[],
  measureStyled: MeasureTextFn,
  fontFamily: string,
  letterSpacing: number,
  textAlign: string,
  fallbackWidth: number,
): number => {
  if (_richTextResult.spanCount === 0) {
    // No spans means no style variation, so the base measurement already holds.
    return fallbackWidth;
  }

  let widest = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line[0].length === 0) {
      continue;
    }
    const width = measureStyled(line[0], fontFamily, letterSpacing, line[5]);
    line[1] = width;
    if (width > widest) {
      widest = width;
    }
  }

  if (textAlign !== 'left') {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      line[3] =
        textAlign === 'right' ? widest - line[1] : (widest - line[1]) / 2;
    }
  }

  return widest > 0 ? widest : fallbackWidth;
};

// Initialize the Text Renderer
const init = (_stage: Stage): void => {
  stage = _stage;
  const dpr = stage.options.devicePhysicalPixelRatio;

  // Drawing canvas and context
  canvas = stage.platform.createOffscreenCanvas();
  if (canvas !== null) {
    isOffscreen = true;
    measureCanvas = stage.platform.createOffscreenCanvas();
  } else {
    isOffscreen = false;
    canvas = stage.platform.createCanvas();
    measureCanvas = stage.platform.createCanvas();
  }

  context = canvas.getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D;
  assertTruthy(context, '.getContext(2d) failed');

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.textRendering = 'optimizeSpeed';

  assertTruthy(measureCanvas, 'measureCanvas is not initialized');
  measureContext = measureCanvas.getContext('2d') as MeasureContext;
  assertTruthy(measureContext, '.getContext(2d) failed');
  measureContext.setTransform(dpr, 0, 0, dpr, 0, 0);
  measureContext.textRendering = 'optimizeSpeed';

  // Set up a minimal size for the measuring canvas since we only use it for measurements
  measureCanvas.width = 1;
  measureCanvas.height = 1;

  CanvasFontHandler.init(context, measureContext);
};

/**
 * Canvas text renderer
 *
 * @param stage - Stage instance for font resolution
 * @param props - Text rendering properties
 * @returns Object containing ImageData and dimensions
 */
const renderText = (props: CoreTextNodeProps): TextRenderInfo => {
  assertTruthy(canvas, 'Canvas is not initialized');
  assertTruthy(context, 'Canvas context is not available');
  assertTruthy(measureContext, 'Canvas measureContext is not available');
  const cacheKey = getLayoutCacheKey(props);

  let layout = renderInfoCache.get(cacheKey);
  if (layout !== undefined) {
    return layout;
  }
  // Extract already normalized properties
  const {
    text,
    fontFamily,
    fontStyle,
    fontSize,
    textAlign,
    maxLines,
    lineHeight,
    overflowSuffix,
    maxWidth,
    maxHeight,
    wordBreak,
    richText,
    color,
  } = props;

  // When richText is enabled, parse BB-code tags from text and use the
  // stripped plain text for layout. The parse result is stored in the
  // module-level singleton (safe — renderText is synchronous).
  let layoutText = text;
  if (richText === true) {
    parseRichText(text, _richTextResult);
    layoutText = _richTextResult.stripped;
  }

  // Rename to baseFont to avoid shadowing the module-level FontHandler
  const baseFont = `${fontStyle} ${fontSize}px Unknown, ${fontFamily}`;
  // Get font metrics and calculate line height
  measureContext.font = baseFont;
  measureContext.textBaseline = 'hanging';

  const metrics = CanvasFontHandler.getFontMetrics(fontFamily, fontSize);

  const letterSpacing = props.letterSpacing || 0;

  // Rich text measures each run with its span's own font, so line breaking and
  // the reported width both account for bold and italic.
  const measureTextFn: MeasureTextFn =
    richText === true
      ? makeStyledMeasureText(baseFont, fontStyle, fontSize, fontFamily)
      : CanvasFontHandler.measureText;

  const [
    lines,
    remainingLines,
    hasRemainingText,
    _bareLineHeight,
    _lineHeightPx,
    baseEffectiveWidth,
    effectiveHeight,
  ] = mapTextLayout(
    measureTextFn,
    metrics,
    layoutText,
    textAlign,
    fontFamily,
    lineHeight,
    overflowSuffix,
    wordBreak,
    letterSpacing,
    maxLines,
    maxWidth,
    maxHeight,
  );
  const lineAmount = lines.length;

  // mapTextLayout measured every line with the base font, so a line containing
  // bold or italic spans is wider on screen than the width it reported. That
  // width both sizes the texture and is published as the node's width, so
  // without a correction the styled run would be clipped at the right edge and
  // siblings would be laid out against a too-small box.
  //
  // Line breaking itself is still base-font based; this only corrects the
  // extent of the lines that were chosen.
  const effectiveWidth =
    richText === true
      ? correctStyledLineWidths(
          lines,
          measureTextFn,
          fontFamily,
          letterSpacing,
          textAlign,
          baseEffectiveWidth,
        )
      : baseEffectiveWidth;

  // mapTextLayout and the width correction both leave the shared measure
  // context on whichever span font they last used. Hand it back on the base
  // font: it is shared with font metric calculation and the plain text path.
  CanvasFontHandler.setMeasureFont(baseFont);

  const canvasW = Math.ceil(effectiveWidth);
  const canvasH = Math.ceil(effectiveHeight);

  // For OffscreenCanvas we reuse the shared canvas and snapshot via
  // transferToImageBitmap at the end. For HTMLCanvasElement we allocate a
  // fresh canvas per text node so it can be passed directly as the texture
  // source — no pixel readback or intermediate copy needed.
  let drawCanvas: HTMLCanvasElement | OffscreenCanvas;
  if (isOffscreen) {
    drawCanvas = canvas;
  } else {
    assertTruthy(stage, 'Stage is not available');
    drawCanvas = stage.platform.createCanvas();
    context = drawCanvas.getContext('2d') as CanvasRenderingContext2D;
  }

  drawCanvas.width = canvasW;
  drawCanvas.height = canvasH;
  context.fillStyle = 'white';
  context.font = baseFont;
  context.textBaseline = 'hanging';

  // Performance optimization for large fonts
  if (fontSize >= 128) {
    context.globalAlpha = 0.01;
    context.fillRect(0, 0, 0.01, 0.01);
    context.globalAlpha = 1.0;
  }

  if (richText === true) {
    // -------------------------------------------------------------------------
    // Rich text draw path — segment-by-segment with per-span font and color.
    //
    // Each layout line carries its own absolute start offset in the stripped
    // text (TextLineStruct index 5). curSpanIdx advances monotonically with
    // that offset (spans are sorted by start, no backward scan is needed).
    //
    // Layout measured styled runs with their own fonts, so the advances below
    // agree with the widths line breaking was based on.
    // -------------------------------------------------------------------------
    const spanCount = _richTextResult.spanCount;
    const spans = _richTextResult.spans;

    // CSS color string for uncolored spans — inherits the node's text color.
    // normalizeCanvasColor caches the string, so no allocation in hot path.
    const nodeColor = normalizeCanvasColor(color, true);

    let curSpanIdx = 0;
    let activeFont = baseFont;
    let activeFillStyle = nodeColor;

    // Prime the context with the node color; individual segments may override.
    context.fillStyle = activeFillStyle;

    // Pre-computed decoration geometry — all integers, zero allocation in the
    // draw loop. Positions are offsets from currentY (top of the em box with
    // textBaseline:'hanging'). metrics.ascender is the distance from the
    // hanging baseline down to the alphabetic baseline in pixels.
    const ascenderPx = metrics.ascender;
    const decoThickness = Math.max(1, Math.round(fontSize / 20));
    const decoUnderlineBase =
      Math.ceil(ascenderPx) + Math.max(1, Math.round(fontSize * 0.08));
    const decoStrikeBase = Math.ceil(ascenderPx) - Math.round(ascenderPx * 0.4);

    for (let i = 0; i < lineAmount; i++) {
      const line = lines[i] as TextLineStruct;
      const textLine = line[0];
      const lineLen = textLine.length;
      let currentX = Math.ceil(line[3]);
      const currentY = Math.ceil(line[4]);

      // Absolute offset of this line's first character in the stripped text,
      // supplied by the layout engine. Do not accumulate line lengths here:
      // the wrapper collapses whitespace runs, so the gap between two layout
      // lines is not always a single character.
      const strippedPos = line[5];

      // Advance span pointer to cover strippedPos (first char of this line).
      while (
        curSpanIdx < spanCount - 1 &&
        strippedPos >= spans[curSpanIdx]!.end
      ) {
        curSpanIdx++;
      }

      let segStartJ = 0;
      let segSpanIdx = curSpanIdx;

      // Iterate one past the line end so the final segment is always flushed.
      for (let j = 1; j <= lineLen; j++) {
        // Determine the span index for character at (strippedPos + j).
        // At end-of-line (j === lineLen) we force a flush without advancing.
        let nextSpanIdx = segSpanIdx;
        if (j < lineLen) {
          while (
            nextSpanIdx < spanCount - 1 &&
            strippedPos + j >= spans[nextSpanIdx]!.end
          ) {
            nextSpanIdx++;
          }
          curSpanIdx = nextSpanIdx;
        }

        if (j === lineLen || nextSpanIdx !== segSpanIdx) {
          // Flush segment [segStartJ, j) with the style from spans[segSpanIdx].
          const span = spans[segSpanIdx]!;

          // Build the CSS font string for this segment.
          // Bold/italic from the span override the node-level fontStyle.
          const spanFont = canvasSpanFont(
            span,
            fontStyle,
            fontSize,
            fontFamily,
          );

          if (spanFont !== activeFont) {
            context.font = spanFont;
            // The measure context must track the draw context. measureText
            // ignores its fontFamily argument and measures against this
            // shared context, so leaving it on the base font advances bold
            // and italic runs by regular-face widths and runs the following
            // text into them.
            CanvasFontHandler.setMeasureFont(spanFont);
            activeFont = spanFont;
          }

          // Colored span uses span.color; uncolored span inherits node color.
          const spanFillStyle =
            span.color !== 0
              ? normalizeCanvasColor(span.color, true)
              : nodeColor;

          if (spanFillStyle !== activeFillStyle) {
            context.fillStyle = spanFillStyle;
            activeFillStyle = spanFillStyle;
          }

          const segStartX = currentX;
          if (letterSpacing === 0) {
            const segment = textLine.substring(segStartJ, j);
            context.fillText(segment, currentX, currentY);
            currentX += CanvasFontHandler.measureText(segment, fontFamily, 0);
          } else {
            for (let k = segStartJ; k < j; k++) {
              const char = textLine.charAt(k);
              if (hasZeroWidthSpace(char) === false) {
                context.fillText(char, currentX, currentY);
              }
              currentX += CanvasFontHandler.measureText(
                char,
                fontFamily,
                letterSpacing,
              );
            }
          }

          // Draw underline and/or strikethrough using the same fillStyle as
          // the segment text (decorations inherit span color, matching CSS).
          if (span.underline === true || span.strikethrough === true) {
            const segWidth = currentX - segStartX;
            if (segWidth > 0) {
              if (span.underline === true) {
                context.fillRect(
                  segStartX,
                  currentY + decoUnderlineBase,
                  segWidth,
                  decoThickness,
                );
              }
              if (span.strikethrough === true) {
                context.fillRect(
                  segStartX,
                  currentY + decoStrikeBase,
                  segWidth,
                  decoThickness,
                );
              }
            }
          }

          segStartJ = j;
          segSpanIdx = nextSpanIdx;
        }
      }
    }

    // The measure context is shared with font metric calculation and the plain
    // text path, so hand it back on the base font rather than whatever style
    // the last span happened to use.
    CanvasFontHandler.setMeasureFont(baseFont);
  } else {
    // -------------------------------------------------------------------------
    // Plain text draw path — unchanged from original implementation.
    // -------------------------------------------------------------------------
    for (let i = 0; i < lineAmount; i++) {
      const line = lines[i] as TextLineStruct;
      const textLine = line[0];
      let currentX = Math.ceil(line[3]);
      const currentY = Math.ceil(line[4]);
      if (letterSpacing === 0) {
        context.fillText(textLine, currentX, currentY);
      } else {
        const textLineLength = textLine.length;
        for (let j = 0; j < textLineLength; j++) {
          const char = textLine.charAt(j);
          if (hasZeroWidthSpace(char) === true) {
            continue;
          }
          context.fillText(char, currentX, currentY);
          currentX += CanvasFontHandler.measureText(
            char,
            fontFamily,
            letterSpacing,
          );
        }
      }
    }
  }

  // Capture the rendered text as a texture source.
  // OffscreenCanvas: transferToImageBitmap detaches the backing bitmap
  //   synchronously (zero-copy). The shared canvas gets a fresh empty bitmap.
  // HTMLCanvasElement: drawCanvas was allocated specifically for this text
  //   node, so it can be passed directly — no copy needed.
  let imageData: ImageBitmap | HTMLCanvasElement | null = null;
  if (drawCanvas.width > 0 && drawCanvas.height > 0) {
    if (isOffscreen) {
      assertTruthy(
        drawCanvas instanceof OffscreenCanvas,
        'drawCanvas is not an OffscreenCanvas',
      );
      imageData = drawCanvas.transferToImageBitmap();
    } else {
      assertTruthy(
        drawCanvas instanceof HTMLCanvasElement,
        'drawCanvas is not an HTMLCanvasElement',
      );
      imageData = drawCanvas;
    }
  }
  const renderInfo = {
    type,
    imageData,
    width: effectiveWidth,
    height: effectiveHeight,
    remainingLines,
    hasRemainingText,
  } as CanvasRenderInfo;
  renderInfoCache.set(cacheKey, renderInfo);
  return renderInfo;
};

/**
 * Clear layout cache for memory management
 */
const clearCache = (): void => {
  renderInfoCache.clear();
};

/**
 * Render quads for Canvas renderer (Canvas doesn't use quad-based rendering)
 */
const renderQuads = (): void => {
  // Canvas renderer doesn't use quad-based rendering
  // This method is for interface compatibility only
};

/**
 * Canvas Text Renderer - implements TextRenderer interface
 */
const CanvasTextRenderer = {
  type,
  font,
  renderText,
  renderQuads,
  init,
  clearCache,
};

export default CanvasTextRenderer;
