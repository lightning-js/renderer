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
import type { TextLayout, TrProps } from './TextRenderer.js';
import * as CanvasFontHandler from './CanvasFontHandler.js';
import { type LineType } from './canvas/calculateRenderInfo.js';
import { calcHeight, measureText, wrapText, wrapWord } from './canvas/Utils.js';
import { normalizeCanvasColor } from '../lib/colorCache.js';

const DEFAULT_SHADOW_VALUES = {
  color: 'black',
  offsetX: 0,
  offsetY: 0,
  blur: 0,
};

const MAX_TEXTURE_DIMENSION = 4096;

const type = 'canvas';

let canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
let context:
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D
  | null = null;

// Initialize the Text Renderer
const init = (stage: Stage): void => {
  canvas = stage.platform.createCanvas() as HTMLCanvasElement | OffscreenCanvas;
  context = canvas.getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D;

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
  props: TrProps,
): {
  imageData: ImageData | null;
  width: number;
  height: number;
  layout?: TextLayout;
} => {
  assertTruthy(canvas, 'Canvas is not initialized');
  assertTruthy(context, 'Canvas context is not available');

  let text = props.text,
    precision = 1,
    fontFamily = props.fontFamily,
    fontStyle = props.fontStyle,
    textAlign = props.textAlign,
    lineHeight = props.lineHeight || 0,
    maxLines = props.maxLines,
    textBaseline = props.textBaseline,
    verticalAlign = props.verticalAlign,
    overflowSuffix = props.overflowSuffix,
    wordBreak = props.wordBreak,
    wordWrap = props.contain !== 'none',
    wordWrapWidth = props.contain === 'none' ? 0 : props.width || 0,
    width = props.contain !== 'none' ? props.width : 0,
    w = width,
    height = props.height,
    maxHeight =
      props.contain === 'both'
        ? (props.height || 0) - (props.offsetY || 0)
        : null,
    textOverflow = overflowSuffix ? 'ellipsis' : null,
    fontSize = props.fontSize * precision,
    offsetY = props.offsetY * precision,
    letterSpacing = props.letterSpacing * precision,
    paddingLeft = 0,
    paddingRight = 0,
    textColor = 0xffffffff,
    shadow: boolean = false,
    shadowColor = 0xff000000,
    shadowOffsetX = 0,
    shadowOffsetY = 0,
    shadowBlur = 0,
    highlight: boolean = false,
    highlightHeight = 0,
    highlightColor = 0x80ffff00,
    highlightOffset = 0,
    highlightPaddingLeft = 0,
    highlightPaddingRight = 0,
    textIndent = 0,
    cutSx = 0,
    cutSy = 0,
    cutEx = 0,
    cutEy = 0,
    advancedRenderer = false,
    textRenderIssueMargin = 0;

  context.font = `${fontStyle} ${fontSize}px ${fontFamily}`;
  context.textBaseline = textBaseline;

  const metrics = CanvasFontHandler.getFontMetrics(fontFamily, fontSize);

  if (lineHeight === 0) {
    lineHeight =
      fontSize *
      (metrics.ascender - metrics.descender + metrics.lineGap) *
      precision;
  }

  const containedMaxLines =
    maxHeight !== null ? Math.floor(maxHeight / lineHeight) : 0;

  let computedMaxLines: number;
  if (containedMaxLines > 0 && maxLines > 0) {
    computedMaxLines =
      containedMaxLines < maxLines ? containedMaxLines : maxLines;
  } else {
    computedMaxLines =
      containedMaxLines > maxLines ? containedMaxLines : maxLines;
  }

  width = w || 2048 / precision;
  let innerWidth = width - paddingLeft;
  if (innerWidth < 10) {
    width += 10 - innerWidth;
    innerWidth = 10;
  }
  if (wordWrapWidth === 0) {
    wordWrapWidth = innerWidth;
  }

  if (textOverflow !== null && wordWrap === false) {
    let suffix: string;
    if (textOverflow === 'clip') {
      suffix = '';
    } else if (textOverflow === 'ellipsis') {
      suffix = overflowSuffix;
    } else {
      suffix = textOverflow;
    }
    text = wrapWord(
      context,
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
      context,
      text,
      wordWrapWidth,
      letterSpacing,
      textIndent,
    );
  } else {
    linesInfo = { l: text.split(/(?:\r\n|\r|\n)/), n: [] };
    const n = linesInfo.l.length;
    for (let i = 0; i < n - 1; i++) {
      linesInfo.n.push(i);
    }
  }
  let lines: string[] = linesInfo.l;

  let remainingText = '';
  let moreTextLines = false;
  if (computedMaxLines > 0 && lines.length > computedMaxLines) {
    const usedLines = lines.slice(0, computedMaxLines);
    let otherLines: string[] = [];
    if (overflowSuffix.length > 0) {
      const w = measureText(context, overflowSuffix, letterSpacing);
      const al = wrapText(
        context,
        usedLines[usedLines.length - 1]!,
        wordWrapWidth - w,
        letterSpacing,
        textIndent,
      );
      usedLines[usedLines.length - 1] = `${al.l[0]!}${overflowSuffix}`;
      otherLines = [al.l.length > 1 ? al.l[1]! : ''];
    } else {
      otherLines = [''];
    }
    // Re-assemble the remaining text
    let i: number;
    const n = lines.length;
    let j = 0;
    const m = linesInfo.n.length;
    for (i = computedMaxLines; i < n; i++) {
      otherLines[j] += `${otherLines[j] ? ' ' : ''}${lines[i] ?? ''}`;
      if (i + 1 < m && linesInfo.n[i + 1] !== undefined) {
        j++;
      }
    }
    remainingText = otherLines.join('\n');
    moreTextLines = true;
    lines = usedLines;
  }

  // Calculate text width
  let maxLineWidth = 0;
  const lineWidths: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const lineWidth =
      measureText(context, lines[i]!, letterSpacing) +
      (i === 0 ? textIndent : 0);
    lineWidths.push(lineWidth);
    maxLineWidth = Math.max(maxLineWidth, lineWidth);
  }

  if (w === 0) {
    width = maxLineWidth + paddingLeft + paddingRight;
    innerWidth = maxLineWidth;
  }
  if (
    wordWrap === true &&
    width > maxLineWidth &&
    textAlign === 'left' &&
    lines.length === 1
  ) {
    width = maxLineWidth + paddingLeft + paddingRight;
  }

  if (height === 0) {
    height = calcHeight(
      textBaseline,
      fontSize,
      lineHeight,
      lines.length,
      offsetY,
    );
  }

  if (offsetY === null) {
    offsetY = fontSize;
  }

  canvas.width = Math.min(
    Math.ceil(width + textRenderIssueMargin),
    MAX_TEXTURE_DIMENSION,
  );
  canvas.height = Math.min(Math.ceil(height), MAX_TEXTURE_DIMENSION);

  context.font = `${fontStyle} ${fontSize}px ${fontFamily}`;
  context.textBaseline = textBaseline;

  if (fontSize >= 128) {
    context.globalAlpha = 0.01;
    context.fillRect(0, 0, 0.01, 0.01);
    context.globalAlpha = 1.0;
  }

  //TODO never happens see notes below
  // if (cutSx || cutSy) {
  //   context.translate(-renderInfo.cutSx, -renderInfo.cutSy);
  // }

  let linePositionX: number;
  let linePositionY: number;
  const drawLines: LineType[] = [];
  const ascenderPx = metrics.ascender * fontSize;
  const bareLineHeightPx = (metrics.ascender - metrics.descender) * fontSize;

  for (let i = 0, n = lines.length; i < n; i++) {
    linePositionX = i === 0 ? textIndent : 0;
    linePositionY = i * lineHeight + ascenderPx;
    if (verticalAlign == 'middle') {
      linePositionY += (lineHeight - bareLineHeightPx) / 2;
    } else if (verticalAlign == 'bottom') {
      linePositionY += lineHeight - bareLineHeightPx;
    }
    if (textAlign === 'right') {
      linePositionX += innerWidth - lineWidths[i]!;
    } else if (textAlign === 'center') {
      linePositionX += (innerWidth - lineWidths[i]!) / 2;
    }
    linePositionX += paddingLeft;
    drawLines.push({
      text: lines[i]!,
      x: linePositionX,
      y: linePositionY,
      w: lineWidths[i]!,
    });
  }

  // if (highlight === true) {
  //   const color = highlightColor;
  //   const hlHeight = highlightHeight * precision || fontSize * 1.5;
  //   const offset = highlightOffset * precision;
  //   const hlPaddingLeft =
  //     highlightPaddingLeft !== null
  //       ? highlightPaddingLeft * precision
  //       : paddingLeft;
  //   const hlPaddingRight =
  //     highlightPaddingRight !== null
  //       ? highlightPaddingRight * precision
  //       : paddingRight;
  //   context.fillStyle = normalizeCanvasColor(color);
  //   for (let i = 0; i < drawLines.length; i++) {
  //     const drawLine = drawLines[i]!;
  //     context.fillRect(
  //       drawLine.x - hlPaddingLeft,
  //       drawLine.y - offsetY + offset,
  //       drawLine.w + hlPaddingRight + hlPaddingLeft,
  //       hlHeight,
  //     );
  //   }
  // }

  // if (shadow === true) {
  //   context.shadowColor = normalizeCanvasColor(renderInfo.shadowColor);
  //   context.shadowOffsetX = renderInfo.shadowOffsetX * precision;
  //   context.shadowOffsetY = renderInfo.shadowOffsetY * precision;
  //   context.shadowBlur = renderInfo.shadowBlur * precision;
  // }

  context.fillStyle = normalizeCanvasColor(textColor);
  for (let i = 0, n = drawLines.length; i < n; i++) {
    const drawLine = drawLines[i]!;
    if (letterSpacing === 0) {
      context.fillText(drawLine.text, drawLine.x, drawLine.y);
    } else {
      const textSplit = drawLine.text.split('');
      let x = drawLine.x;
      for (let i = 0, j = textSplit.length; i < j; i++) {
        context.fillText(textSplit[i]!, x, drawLine.y);
        x += measureText(context, textSplit[i]!, letterSpacing);
      }
    }
  }

  //never happens
  // if(shadow === true) {
  //   context.shadowColor = DEFAULT_SHADOW_VALUES.color;
  //   context.shadowOffsetX = DEFAULT_SHADOW_VALUES.offsetX;
  //   context.shadowOffsetY = DEFAULT_SHADOW_VALUES.offsetY;
  //   context.shadowBlur = DEFAULT_SHADOW_VALUES.blur;
  // }

  //never happens
  // if (renderInfo.cutSx || renderInfo.cutSy) {
  //   context.translate(renderInfo.cutSx, renderInfo.cutSy);
  // }

  /**
   * TO DO notes to check out
   * -  textOverflow
   * - maxHeight
   * - padding left / right ? always 0
   * - cutSx, Sy, Ex, Ey always 0
   * - textIndent always 0
   * - lines override ?
   * - textRenderIssueMargin always 0
   */

  let imageData: ImageData | null = null;
  if (canvas.width > 0 && canvas.height > 0) {
    imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  }

  return {
    imageData,
    width: width,
    height: lineHeight * lines.length,
  };
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
};

export default CanvasTextRenderer;
