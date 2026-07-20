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
  TextLineStruct,
  TextRenderInfo,
} from './TextRenderer.js';
import * as CanvasFontHandler from './CanvasFontHandler.js';
import type { CoreTextNodeProps } from '../CoreTextNode.js';
import { getLayoutCacheKey, hasZeroWidthSpace } from './Utils.js';
import { mapTextLayout } from './TextLayoutEngine.js';
import { parseRichText, ParseResult } from './RichTextParser.js';
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
let measureContext:
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D
  | null = null;

// Cache for text layout calculations
const renderInfoCache = new Map<string, CanvasRenderInfo>();

// Pre-allocated rich text parse result — reused across renderText calls.
// Safe because renderText is synchronous and JS is single-threaded.
const _richTextResult = new ParseResult();

// Initialize the Text Renderer
const init = (_stage: Stage): void => {
  stage = _stage;
  const dpr = stage.options.devicePhysicalPixelRatio;

  // Drawing canvas and context
  canvas = stage.platform.createOffscreenCanvas();
  if (canvas !== null) {
    isOffscreen = true;
  } else {
    isOffscreen = false;
    canvas = stage.platform.createCanvas();
  }

  context = canvas.getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D;
  assertTruthy(context, '.getContext(2d) failed');

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.textRendering = 'optimizeSpeed';

  // Separate measuring canvas and context
  measureCanvas = stage.platform.createCanvas();
  assertTruthy(measureCanvas, 'createCanvas returned null');
  measureContext = measureCanvas.getContext('2d');
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

  const letterSpacing = props.letterSpacing;

  const [
    lines,
    remainingLines,
    hasRemainingText,
    _bareLineHeight,
    _lineHeightPx,
    effectiveWidth,
    effectiveHeight,
  ] = mapTextLayout(
    CanvasFontHandler.measureText,
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
    // strippedPos tracks the absolute character position in stripped text as
    // we walk through layout lines. curSpanIdx advances monotonically with
    // strippedPos (spans are sorted by start, no backward scan is needed).
    //
    // Note: layout (mapTextLayout) used the base font metrics, so bold text
    // may render slightly wider than its measured width — acceptable for MVP.
    // -------------------------------------------------------------------------
    const spanCount = _richTextResult.spanCount;
    const spans = _richTextResult.spans;

    // CSS color string for uncolored spans — inherits the node's text color.
    // normalizeCanvasColor caches the string, so no allocation in hot path.
    const nodeColor = normalizeCanvasColor(color, true);

    let strippedPos = 0;
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
          const spanStyle = span.italic === true ? 'italic' : fontStyle;
          const spanFont =
            span.bold === true
              ? `${spanStyle} bold ${fontSize}px Unknown, ${fontFamily}`
              : `${spanStyle} ${fontSize}px Unknown, ${fontFamily}`;

          if (spanFont !== activeFont) {
            context.font = spanFont;
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

      // Advance strippedPos past this line's characters plus the line-break
      // character (space consumed by wrapText, or \n for explicit newlines)
      // that separates layout lines. The final line has no trailing break.
      strippedPos += lineLen + (i < lineAmount - 1 ? 1 : 0);
    }
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
