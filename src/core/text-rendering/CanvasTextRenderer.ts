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
  TextLayout,
  NormalizedFontMetrics,
  TextBaseline,
} from './TextRenderer.js';
import * as CanvasFontHandler from './CanvasFontHandler.js';
import { type LineType } from './canvas/calculateRenderInfo.js';
import { calcHeight, measureText, wrapText, wrapWord } from './canvas/Utils.js';
import { normalizeCanvasColor } from '../lib/colorCache.js';
import type { CoreTextNodeProps } from '../CoreTextNode.js';

const MAX_TEXTURE_DIMENSION = 4096;

const type = 'canvas' as const;

let canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
let context:
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D
  | null = null;

// Separate canvas and context for text measurements
let measureCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;
let measureContext:
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D
  | null = null;

// Cache for text layout calculations
const layoutCache = new Map<
  string,
  {
    lines: string[];
    lineWidths: number[];
    maxLineWidth: number;
    remainingText: string;
    moreTextLines: boolean;
  }
>();

// Initialize the Text Renderer
const init = (stage: Stage): void => {
  // Drawing canvas and context
  canvas = stage.platform.createCanvas() as HTMLCanvasElement | OffscreenCanvas;
  context = canvas.getContext('2d', { willReadFrequently: true }) as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D;

  // Separate measuring canvas and context
  measureCanvas = stage.platform.createCanvas() as
    | HTMLCanvasElement
    | OffscreenCanvas;
  measureContext = measureCanvas.getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D;

  // Set up a minimal size for the measuring canvas since we only use it for measurements
  measureCanvas.width = 1;
  measureCanvas.height = 1;

  CanvasFontHandler.init(context);
};

/**
 * Canvas text renderer
 *
 * @param stage - Stage instance for font resolution
 * @param props - Text rendering properties
 * @returns Object containing ImageData and dimensions
 */
const renderText = (
  stage: Stage,
  props: CoreTextNodeProps,
): {
  imageData: ImageData | null;
  width: number;
  height: number;
  layout?: TextLayout;
} => {
  assertTruthy(canvas, 'Canvas is not initialized');
  assertTruthy(context, 'Canvas context is not available');

  // Extract already normalized properties
  const {
    text,
    fontFamily,
    fontStyle,
    fontSize,
    textAlign,
    lineHeight: propLineHeight,
    maxLines,
    textBaseline,
    verticalAlign,
    overflowSuffix,
    maxWidth,
    maxHeight,
    offsetY,
    letterSpacing,
  } = props;

  // Performance optimization constants
  const precision = 1;
  const paddingLeft = 0;
  const paddingRight = 0;
  const textIndent = 0;
  const textRenderIssueMargin = 0;
  const textColor = 0xffffffff;

  // Determine word wrap behavior
  const wordWrap = maxWidth > 0;
  const textOverflow = overflowSuffix ? 'ellipsis' : null;

  // Calculate scaled values
  const scaledFontSize = fontSize * precision;
  const scaledOffsetY = offsetY * precision;
  const scaledLetterSpacing = letterSpacing * precision;
  // Get font metrics and calculate line height
  context.font = `${fontStyle} ${scaledFontSize}px ${fontFamily}`;
  context.textBaseline = textBaseline;

  const metrics = CanvasFontHandler.getFontMetrics(fontFamily, scaledFontSize);
  const lineHeight =
    propLineHeight === 0
      ? scaledFontSize *
        (metrics.ascender - metrics.descender + metrics.lineGap) *
        precision
      : propLineHeight;

  // Calculate max lines constraint
  const containedMaxLines =
    maxHeight !== null ? Math.floor(maxHeight / lineHeight) : 0;
  const computedMaxLines = calculateMaxLines(containedMaxLines, maxLines);

  // Calculate initial width and inner width
  let width = maxWidth || 2048 / precision;
  let innerWidth = width - paddingLeft;
  if (innerWidth < 10) {
    width += 10 - innerWidth;
    innerWidth = 10;
  }
  const finalWordWrapWidth = maxWidth === 0 ? innerWidth : maxWidth;

  // Calculate text layout using cached helper function
  const layout = calculateTextLayout(
    text,
    fontFamily,
    scaledFontSize,
    fontStyle,
    wordWrap,
    finalWordWrapWidth,
    scaledLetterSpacing,
    textIndent,
    computedMaxLines,
    overflowSuffix,
    textOverflow,
  );

  // Calculate final dimensions
  const dimensions = calculateTextDimensions(
    layout,
    paddingLeft,
    paddingRight,
    textBaseline,
    scaledFontSize,
    lineHeight,
    scaledOffsetY,
    maxWidth,
    maxHeight,
    wordWrap,
    textAlign,
  );

  // Set up canvas dimensions
  canvas.width = Math.min(
    Math.ceil(dimensions.width + textRenderIssueMargin),
    MAX_TEXTURE_DIMENSION,
  );
  canvas.height = Math.min(Math.ceil(dimensions.height), MAX_TEXTURE_DIMENSION);

  // Reset font context after canvas resize
  context.font = `${fontStyle} ${scaledFontSize}px ${fontFamily}`;
  context.textBaseline = textBaseline;

  // Performance optimization for large fonts
  if (scaledFontSize >= 128) {
    context.globalAlpha = 0.01;
    context.fillRect(0, 0, 0.01, 0.01);
    context.globalAlpha = 1.0;
  }

  // Calculate drawing positions
  const drawLines = calculateDrawPositions(
    layout.lines,
    layout.lineWidths,
    textAlign,
    verticalAlign,
    innerWidth,
    paddingLeft,
    textIndent,
    lineHeight,
    metrics,
    scaledFontSize,
  );

  // Render text to canvas
  renderTextToCanvas(
    context,
    drawLines,
    scaledLetterSpacing,
    textColor,
    fontStyle,
    scaledFontSize,
    fontFamily,
  );

  width = dimensions.width;
  const height = lineHeight * layout.lines.length;
  // Extract image data
  let imageData: ImageData | null = null;
  if (canvas.width > 0 && canvas.height > 0) {
    imageData = context.getImageData(0, 0, width, height);
  }

  return {
    imageData,
    width,
    height,
  };
};

/**
 * Calculate the effective max lines constraint
 */
function calculateMaxLines(
  containedMaxLines: number,
  maxLines: number,
): number {
  if (containedMaxLines > 0 && maxLines > 0) {
    return containedMaxLines < maxLines ? containedMaxLines : maxLines;
  } else {
    return containedMaxLines > maxLines ? containedMaxLines : maxLines;
  }
}

/**
 * Generate a cache key for text layout calculations
 */
function generateLayoutCacheKey(
  text: string,
  fontFamily: string,
  fontSize: number,
  fontStyle: string,
  wordWrap: boolean,
  wordWrapWidth: number,
  letterSpacing: number,
  maxLines: number,
  overflowSuffix: string,
): string {
  return `${text}-${fontFamily}-${fontSize}-${fontStyle}-${wordWrap}-${wordWrapWidth}-${letterSpacing}-${maxLines}-${overflowSuffix}`;
}

/**
 * Calculate text dimensions and wrapping
 */
function calculateTextLayout(
  text: string,
  fontFamily: string,
  fontSize: number,
  fontStyle: string,
  wordWrap: boolean,
  wordWrapWidth: number,
  letterSpacing: number,
  textIndent: number,
  maxLines: number,
  overflowSuffix: string,
  textOverflow: string | null,
): {
  lines: string[];
  lineWidths: number[];
  maxLineWidth: number;
  remainingText: string;
  moreTextLines: boolean;
} {
  assertTruthy(measureContext, 'Measure context is not available');

  // Check cache first
  const cacheKey = generateLayoutCacheKey(
    text,
    fontFamily,
    fontSize,
    fontStyle,
    wordWrap,
    wordWrapWidth,
    letterSpacing,
    maxLines,
    overflowSuffix,
  );

  const cached = layoutCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Set font context for measurements on the dedicated measuring context
  measureContext.font = `${fontStyle} ${fontSize}px ${fontFamily}`;

  // Handle text overflow for non-wrapped text
  let processedText = text;
  if (textOverflow !== null && wordWrap === false) {
    let suffix: string;
    if (textOverflow === 'clip') {
      suffix = '';
    } else if (textOverflow === 'ellipsis') {
      suffix = overflowSuffix;
    } else {
      suffix = textOverflow;
    }
    processedText = wrapWord(
      measureContext,
      text,
      wordWrapWidth - textIndent,
      suffix,
      letterSpacing,
    );
  }

  // Word wrap
  let linesInfo: { n: number[]; l: string[] };
  if (wordWrap === true) {
    linesInfo = wrapText(
      measureContext,
      processedText,
      wordWrapWidth,
      letterSpacing,
      textIndent,
    );
  } else {
    linesInfo = { l: processedText.split(/(?:\r\n|\r|\n)/), n: [] };
    const n = linesInfo.l.length;
    for (let i = 0; i < n - 1; i++) {
      linesInfo.n.push(i);
    }
  }
  let lines: string[] = linesInfo.l;

  let remainingText = '';
  let moreTextLines = false;

  // Handle max lines constraint
  if (maxLines > 0 && lines.length > maxLines) {
    const usedLines = lines.slice(0, maxLines);
    let otherLines: string[] = [];
    if (overflowSuffix.length > 0) {
      const w = measureText(measureContext, overflowSuffix, letterSpacing);
      const al = wrapText(
        measureContext,
        usedLines[usedLines.length - 1] || '',
        wordWrapWidth - w,
        letterSpacing,
        textIndent,
      );
      usedLines[usedLines.length - 1] = `${al.l[0] || ''}${overflowSuffix}`;
      otherLines = [al.l.length > 1 ? al.l[1] || '' : ''];
    } else {
      otherLines = [''];
    }

    // Re-assemble the remaining text
    let i: number;
    const n = lines.length;
    let j = 0;
    const m = linesInfo.n.length;
    for (i = maxLines; i < n; i++) {
      otherLines[j] += `${otherLines[j] ? ' ' : ''}${lines[i] ?? ''}`;
      if (i + 1 < m && linesInfo.n[i + 1] !== undefined) {
        j++;
      }
    }
    remainingText = otherLines.join('\n');
    moreTextLines = true;
    lines = usedLines;
  }

  // Calculate line widths using the dedicated measuring context
  let maxLineWidth = 0;
  const lineWidths: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const lineWidth =
      measureText(measureContext, lines[i] || '', letterSpacing) +
      (i === 0 ? textIndent : 0);
    lineWidths.push(lineWidth);
    maxLineWidth = Math.max(maxLineWidth, lineWidth);
  }

  const result = {
    lines,
    lineWidths,
    maxLineWidth,
    remainingText,
    moreTextLines,
  };

  // Cache the result
  layoutCache.set(cacheKey, result);

  return result;
}

/**
 * Calculate text dimensions based on layout
 */
function calculateTextDimensions(
  layout: {
    lines: string[];
    lineWidths: number[];
    maxLineWidth: number;
  },
  paddingLeft: number,
  paddingRight: number,
  textBaseline: TextBaseline,
  fontSize: number,
  lineHeight: number,
  offsetY: number,
  initialWidth: number,
  initialHeight: number,
  wordWrap: boolean,
  textAlign: string,
): { width: number; height: number } {
  let width = initialWidth;
  let height = initialHeight;

  // Calculate width
  if (initialWidth === 0) {
    width = layout.maxLineWidth + paddingLeft + paddingRight;
  }

  // Adjust width for single-line left-aligned wrapped text
  if (
    wordWrap === true &&
    width > layout.maxLineWidth &&
    textAlign === 'left' &&
    layout.lines.length === 1
  ) {
    width = layout.maxLineWidth + paddingLeft + paddingRight;
  }

  // Calculate height if not provided
  if (height === 0) {
    height = calcHeight(
      textBaseline,
      fontSize,
      lineHeight,
      layout.lines.length,
      offsetY,
    );
  }

  return { width, height };
}

/**
 * Calculate drawing positions for text lines
 */
function calculateDrawPositions(
  lines: string[],
  lineWidths: number[],
  textAlign: string,
  verticalAlign: string,
  innerWidth: number,
  paddingLeft: number,
  textIndent: number,
  lineHeight: number,
  metrics: NormalizedFontMetrics,
  fontSize: number,
): LineType[] {
  const drawLines: LineType[] = [];
  const ascenderPx = metrics.ascender * fontSize;
  const bareLineHeightPx = (metrics.ascender - metrics.descender) * fontSize;

  for (let i = 0, n = lines.length; i < n; i++) {
    let linePositionX = i === 0 ? textIndent : 0;
    let linePositionY = i * lineHeight + ascenderPx;

    // Vertical alignment
    if (verticalAlign == 'middle') {
      linePositionY += (lineHeight - bareLineHeightPx) / 2;
    } else if (verticalAlign == 'bottom') {
      linePositionY += lineHeight - bareLineHeightPx;
    }

    // Horizontal alignment
    const lineWidth = lineWidths[i];
    if (lineWidth !== undefined) {
      if (textAlign === 'right') {
        linePositionX += innerWidth - lineWidth;
      } else if (textAlign === 'center') {
        linePositionX += (innerWidth - lineWidth) / 2;
      }
    }

    linePositionX += paddingLeft;

    const lineText = lines[i];
    if (lineText !== undefined) {
      drawLines.push({
        text: lineText,
        x: linePositionX,
        y: linePositionY,
        w: lineWidth || 0,
      });
    }
  }

  return drawLines;
}

/**
 * Render text lines to canvas
 */
function renderTextToCanvas(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  drawLines: LineType[],
  letterSpacing: number,
  textColor: number,
  fontStyle: string,
  fontSize: number,
  fontFamily: string,
): void {
  assertTruthy(measureContext, 'Measure context is not available');

  context.fillStyle = normalizeCanvasColor(textColor);

  // Sync font settings to measure context if we need to use it for letter spacing
  if (letterSpacing > 0) {
    measureContext.font = `${fontStyle} ${fontSize}px ${fontFamily}`;
  }

  for (let i = 0, n = drawLines.length; i < n; i++) {
    const drawLine = drawLines[i];
    if (drawLine) {
      if (letterSpacing === 0) {
        context.fillText(drawLine.text, drawLine.x, drawLine.y);
      } else {
        const textSplit = drawLine.text.split('');
        let x = drawLine.x;
        for (let j = 0, k = textSplit.length; j < k; j++) {
          const char = textSplit[j];
          if (char) {
            context.fillText(char, x, drawLine.y);
            // Use the dedicated measuring context for letter spacing calculations
            x += measureText(measureContext, char, letterSpacing);
          }
        }
      }
    }
  }
}

/**
 * Clear layout cache for memory management
 */
const clearLayoutCache = (): void => {
  layoutCache.clear();
};

/**
 * Add quads for rendering (Canvas doesn't use quads)
 */
const addQuads = (): Float32Array | null => {
  // Canvas renderer doesn't use quad-based rendering
  // Return null for interface compatibility
  return null;
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
  font: CanvasFontHandler,
  renderText,
  addQuads,
  renderQuads,
  init,
  clearLayoutCache,
};

export default CanvasTextRenderer;
