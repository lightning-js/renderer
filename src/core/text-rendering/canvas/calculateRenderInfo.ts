import { assertTruthy } from '../../../utils.js';
import { calcDefaultLineHeight, calculateFontMetrics } from '../Utils.js';
import {
  isNormalizedFontMetrics,
  wrapText,
  wrapWord,
  measureText,
  calcHeight,
} from './Utils.js';
import type { NormalizedFontMetrics } from '../TextRenderer.js';
import type { Settings } from './Settings.js';

export interface RenderInfo {
  w: number;
  h: number;
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
  lineHeight: number;
  defLineHeight: number;
  lineWidths: number[];
  offsetY: number;
  paddingLeft: number;
  paddingRight: number;
  letterSpacing: number;
  textIndent: number;
  metrics: NormalizedFontMetrics;
}

export interface LineType {
  text: string;
  x: number;
  y: number;
  w: number;
}

export function calculateRenderInfo({
  context,
  settings,
}: {
  context: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
  settings: Settings;
}): RenderInfo {
  const precision = settings.precision;
  const paddingLeft = settings.paddingLeft * precision;
  const paddingRight = settings.paddingRight * precision;
  const fontSize = settings.fontSize * precision;
  let offsetY = settings.offsetY === null ? null : settings.offsetY * precision;
  const w = settings.w * precision;
  const h = settings.h * precision;
  let wordWrapWidth = settings.wordWrapWidth * precision;
  const cutSx = settings.cutSx * precision;
  const cutEx = settings.cutEx * precision;
  const cutSy = settings.cutSy * precision;
  const cutEy = settings.cutEy * precision;
  const letterSpacing = (settings.letterSpacing || 0) * precision;
  const textIndent = settings.textIndent * precision;
  const trFontFace = settings.trFontFace;

  // Set font properties
  context.font = `${settings.fontStyle} ${fontSize}px ${settings.fontFamily}`;
  context.textBaseline = settings.textBaseline;

  assertTruthy(trFontFace);
  // Ensure trFontFace is a FontFace for metrics calculation
  let metrics: NormalizedFontMetrics = {
    ascender: 0.8,
    descender: -0.2,
    lineGap: 0.2,
  };
  if (typeof trFontFace === 'object' && trFontFace && 'family' in trFontFace) {
    const result = calculateFontMetrics(
      context,
      trFontFace as FontFace,
      fontSize,
    ) as unknown;
    if (isNormalizedFontMetrics(result)) {
      metrics = result;
    }
  }
  const defLineHeight = calcDefaultLineHeight(metrics, fontSize) * precision;
  const lineHeight =
    settings.lineHeight !== null
      ? settings.lineHeight * precision
      : defLineHeight;

  const maxHeight = settings.maxHeight;
  const containedMaxLines =
    maxHeight !== null && lineHeight > 0
      ? Math.floor(maxHeight / lineHeight)
      : 0;
  const setMaxLines = settings.maxLines;
  const calcMaxLines =
    containedMaxLines > 0 && setMaxLines > 0
      ? Math.min(containedMaxLines, setMaxLines)
      : Math.max(containedMaxLines, setMaxLines);

  // Total width
  let width = w || 2048 / precision;
  // Inner width
  let innerWidth = width - paddingLeft;
  if (innerWidth < 10) {
    width += 10 - innerWidth;
    innerWidth = 10;
  }
  if (!wordWrapWidth) {
    wordWrapWidth = innerWidth;
  }

  // Text overflow
  let text: string = settings.text;
  if (settings.textOverflow && !settings.wordWrap) {
    let suffix: string;
    switch (settings.textOverflow) {
      case 'clip':
        suffix = '';
        break;
      case 'ellipsis':
        suffix = settings.overflowSuffix;
        break;
      default:
        suffix = String(settings.textOverflow);
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
  if (settings.wordWrap) {
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
  if (calcMaxLines && lines.length > calcMaxLines) {
    const usedLines = lines.slice(0, calcMaxLines);
    let otherLines: string[] = [];
    if (settings.overflowSuffix) {
      const w = settings.overflowSuffix
        ? measureText(context, settings.overflowSuffix, letterSpacing)
        : 0;
      const al = wrapText(
        context,
        usedLines[usedLines.length - 1]!,
        wordWrapWidth - w,
        letterSpacing,
        textIndent,
      );
      usedLines[usedLines.length - 1] = `${al.l[0]!}${settings.overflowSuffix}`;
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

  if (!w) {
    width = maxLineWidth + paddingLeft + paddingRight;
    innerWidth = maxLineWidth;
  }
  if (
    settings.wordWrap &&
    w > maxLineWidth &&
    settings.textAlign === 'left' &&
    lines.length === 1
  ) {
    width = maxLineWidth + paddingLeft + paddingRight;
  }

  let height: number;
  if (h) {
    height = h;
  } else {
    height = calcHeight(
      settings.textBaseline,
      fontSize,
      lineHeight,
      lines.length,
      offsetY,
    );
  }
  if (offsetY === null) {
    offsetY = fontSize;
  }

  return {
    w: width,
    h: height,
    lines,
    precision,
    remainingText,
    moreTextLines,
    width,
    innerWidth,
    height,
    fontSize,
    cutSx,
    cutSy,
    cutEx,
    cutEy,
    lineHeight,
    defLineHeight,
    lineWidths,
    offsetY: offsetY as number,
    paddingLeft,
    paddingRight,
    letterSpacing,
    textIndent,
    metrics,
  };
}
