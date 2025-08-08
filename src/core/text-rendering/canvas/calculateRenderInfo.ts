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

import { calculateFontMetrics } from '../Utils.js';
import { wrapText, wrapWord, measureText, calcHeight } from './Utils.js';
import { getFontMetrics, setFontMetrics } from '../CanvasFontHandler.js';
import type {
  NormalizedFontMetrics,
  TextBaseline,
  TextVerticalAlign,
} from '../TextRenderer.js';
import type { TextAlign, TextOverflow } from './Settings.js';

export interface RenderInfo {
  lines: string[];
  precision: number;
  remainingText: string;
  moreTextLines: boolean;
  width: number;
  innerWidth: number;
  height: number;
  fontSize: number;
  cutSx: number;
  cutSy: number;
  cutEx: number;
  cutEy: number;
  lineHeight: number | null;
  defLineHeight: number;
  lineWidths: number[];
  offsetY: number;
  paddingLeft: number;
  paddingRight: number;
  letterSpacing: number;
  textIndent: number;
  metrics: NormalizedFontMetrics;
  text: string;
  fontStyle: string;
  fontBaselineRatio: number;
  fontFamily: string | null;
  wordWrap: boolean;
  wordWrapWidth: number;
  wordBreak: 'normal' | 'break-all' | 'break-word';
  textOverflow: TextOverflow | null;
  textBaseline: TextBaseline;
  textAlign: TextAlign;
  verticalAlign: TextVerticalAlign;
  maxLines: number;
  maxHeight: number | null;
  overflowSuffix: string;
  textColor: number;
  shadow: boolean;
  shadowColor: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
  highlight: boolean;
  highlightHeight: number;
  highlightColor: number;
  highlightOffset: number;
  highlightPaddingLeft: number;
  highlightPaddingRight: number;
  advancedRenderer: boolean;

  // Normally stage options
  textRenderIssueMargin: number;
}

export interface LineType {
  text: string;
  x: number;
  y: number;
  w: number;
}

export function calculateRenderInfo(
  context: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  renderInfo: RenderInfo,
) {
  const precision = renderInfo.precision;
  const paddingLeft = renderInfo.paddingLeft * precision;
  const paddingRight = renderInfo.paddingRight * precision;
  const fontSize = renderInfo.fontSize * precision;
  let offsetY =
    renderInfo.offsetY === null ? null : renderInfo.offsetY * precision;
  const w = renderInfo.width * precision;
  const h = renderInfo.height * precision;
  let wordWrapWidth = renderInfo.wordWrapWidth * precision;
  const cutSx = renderInfo.cutSx * precision;
  const cutEx = renderInfo.cutEx * precision;
  const cutSy = renderInfo.cutSy * precision;
  const cutEy = renderInfo.cutEy * precision;
  const letterSpacing = (renderInfo.letterSpacing || 0) * precision;
  const textIndent = renderInfo.textIndent * precision;

  const fontFamily = renderInfo.fontFamily!;

  // Set font properties
  context.font = `${renderInfo.fontStyle} ${fontSize}px ${fontFamily}`;
  context.textBaseline = renderInfo.textBaseline;

  let metrics = getFontMetrics(fontFamily, fontSize);

  if (metrics === null) {
    metrics = calculateFontMetrics(context, fontFamily, fontSize);
    setFontMetrics(fontFamily, metrics);
  }

  const defLineHeight =
    fontSize *
    (metrics.ascender - metrics.descender + metrics.lineGap) *
    precision;
  const lineHeight =
    renderInfo.lineHeight !== null
      ? renderInfo.lineHeight * precision
      : defLineHeight;

  const maxHeight = renderInfo.maxHeight;
  const containedMaxLines =
    maxHeight !== null && lineHeight > 0
      ? Math.floor(maxHeight / lineHeight)
      : 0;
  const setMaxLines = renderInfo.maxLines;
  const calcMaxLines =
    containedMaxLines > 0 && setMaxLines > 0
      ? Math.min(containedMaxLines, setMaxLines)
      : Math.max(containedMaxLines, setMaxLines);

  const textOverflow = renderInfo.textOverflow;
  const wordWrap = renderInfo.wordWrap;

  // Total width
  let width = w || 2048 / precision;
  // Inner width
  let innerWidth = width - paddingLeft;
  if (innerWidth < 10) {
    width += 10 - innerWidth;
    innerWidth = 10;
  }
  if (wordWrapWidth === 0) {
    wordWrapWidth = innerWidth;
  }

  // Text overflow
  let text: string = renderInfo.text;
  if (textOverflow !== null && wordWrap === false) {
    let suffix: string;
    switch (textOverflow) {
      case 'clip':
        suffix = '';
        break;
      case 'ellipsis':
        suffix = renderInfo.overflowSuffix;
        break;
      default:
        suffix = String(textOverflow);
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
  if (wordWrap) {
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
  if (calcMaxLines > 0 && lines.length > calcMaxLines) {
    const usedLines = lines.slice(0, calcMaxLines);
    let otherLines: string[] = [];
    const overflowSuffix = renderInfo.overflowSuffix;

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
    for (i = calcMaxLines; i < n; i++) {
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
    w > maxLineWidth &&
    renderInfo.textAlign === 'left' &&
    lines.length === 1
  ) {
    width = maxLineWidth + paddingLeft + paddingRight;
  }

  let height: number;
  if (h > 0) {
    height = h;
  } else {
    height = calcHeight(
      renderInfo.textBaseline,
      fontSize,
      lineHeight,
      lines.length,
      offsetY as number,
    );
  }
  if (offsetY === null) {
    offsetY = fontSize;
  }

  renderInfo.width = width;
  renderInfo.height = height;
  renderInfo.lines = lines;
  renderInfo.precision = precision;
  renderInfo.remainingText = remainingText;
  renderInfo.moreTextLines = moreTextLines;
  renderInfo.innerWidth = innerWidth;
  renderInfo.fontSize = fontSize;
  renderInfo.cutSx = cutSx;
  renderInfo.cutSy = cutSy;
  renderInfo.cutEx = cutEx;
  renderInfo.cutEy = cutEy;
  renderInfo.lineHeight = lineHeight;
  renderInfo.defLineHeight = defLineHeight;
  renderInfo.lineWidths = lineWidths;
  renderInfo.offsetY = offsetY;
  renderInfo.paddingLeft = paddingLeft;
  renderInfo.paddingRight = paddingRight;
  renderInfo.letterSpacing = letterSpacing;
  renderInfo.textIndent = textIndent;
  renderInfo.metrics = metrics;
}
