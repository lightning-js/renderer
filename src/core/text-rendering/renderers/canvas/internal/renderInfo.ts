import {
  type Settings,
  type TextBaseline
} from "./types";
import { type CoreTextNodeProps } from "../../../../CoreTextNodeCanvas";
import { assertTruthy } from "../../../../../utils";
import { mergeDefaults } from "./mergeDefaults";
import { calcDefaultLineHeight } from '../../../TextRenderingUtils.js';
import {
  getWebFontMetrics,
  wrapText,
  wrapWord,
  measureText,
  calcHeight
} from './utils.js';
import type { NormalizedFontMetrics } from '../../../font-face-types/TrFontFace.js';

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
  textBaseline: TextBaseline;
}

export const parseRenderInfo = (props: CoreTextNodeProps, precision: number, context: CanvasRenderingContext2D): { renderInfo: RenderInfo, settings: Settings } => {
  const renderInfo: Partial<RenderInfo> = {};
  const settings = mergeDefaults(props);

  const paddingLeft = settings.paddingLeft * precision;
  const paddingRight = settings.paddingRight * precision;
  const fontSize = settings.fontSize * precision;
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

  // Set font properties.
  const ff = [settings.fontFamily];

  const ffs = [];
  for (let i = 0, n = ff.length; i < n; i++) {
    if (ff[i] === 'serif' || ff[i] === 'sans-serif') {
      ffs.push(ff[i]);
    } else {
      ffs.push(`"${ff[i]!}"`);
    }
  }

  const fontSetting = `${settings.fontStyle} ${settings.fontSize * precision}px ${ffs.join(',')}`;
  context.font = fontSetting
  context.textBaseline = settings.textBaseline;

  assertTruthy(trFontFace);

  const metrics = getWebFontMetrics(context, trFontFace, fontSize);
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

  // Total width.
  let width = w || 2048 / precision;

  // Inner width.
  let innerWidth = width - paddingLeft;
  if (innerWidth < 10) {
    width += 10 - innerWidth;
    innerWidth = 10;
  }

  if (!wordWrapWidth) {
    wordWrapWidth = innerWidth;
  }

  // Text overflow
  if (settings.textOverflow && settings.wordWrap === false) {
    let suffix;
    switch (settings.textOverflow) {
      case 'clip':
        suffix = '';
        break;
      case 'ellipsis':
        suffix = settings.overflowSuffix;
        break;
      default:
        suffix = settings.textOverflow;
    }

    settings.text = wrapWord(
      settings.text,
      wordWrapWidth - textIndent,
      suffix,
      context,
    );
  }

  // word wrap
  // preserve original text
  let linesInfo: { n: number[]; l: string[] };
  if (settings.wordWrap === true) {
    linesInfo = wrapText(
      settings.text,
      wordWrapWidth,
      letterSpacing,
      textIndent,
      context,
    );
  } else {
    linesInfo = { l: settings.text.split(/(?:\r\n|\r|\n)/), n: [] };
    const n = linesInfo.l.length;
    for (let i = 0; i < n - 1; i++) {
      linesInfo.n.push(i);
    }
  }
  let lines = linesInfo.l;

  if (calcMaxLines && lines.length > calcMaxLines) {
    const usedLines = lines.slice(0, calcMaxLines);

    let otherLines = null;
    if (settings.overflowSuffix) {
      // Wrap again with max lines suffix enabled.
      const w = settings.overflowSuffix
        ? measureText(settings.overflowSuffix, 0, context)
        : 0;
      const al = wrapText(
        usedLines[usedLines.length - 1]!,
        wordWrapWidth - w,
        letterSpacing,
        textIndent,
        context,
      );
      usedLines[usedLines.length - 1] = `${al.l[0]!}${
        settings.overflowSuffix
      }`;
      otherLines = [al.l.length > 1 ? al.l[1] : ''];
    } else {
      otherLines = [''];
    }

    // Re-assemble the remaining text.
    let i;
    const n = lines.length;
    let j = 0;
    const m = linesInfo.n.length;
    for (i = calcMaxLines; i < n; i++) {
      otherLines[j] += `${otherLines[j] ? ' ' : ''}${lines[i]!}`;
      if (i + 1 < m && linesInfo.n[i + 1]) {
        j++;
      }
    }

    renderInfo.remainingText = otherLines.join('\n');
    renderInfo.moreTextLines = true;

    lines = usedLines;
  } else {
    renderInfo.moreTextLines = false;
    renderInfo.remainingText = '';
  }

  // calculate text width
  let maxLineWidth = 0;
  const lineWidths: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const lineWidth =
      measureText(lines[i]!, letterSpacing, context) + (i === 0 ? textIndent : 0);
    lineWidths.push(lineWidth);
    maxLineWidth = Math.max(maxLineWidth, lineWidth);
  }

  renderInfo.lineWidths = lineWidths;

  if (!w) {
    // Auto-set width to max text length.
    width = maxLineWidth + paddingLeft + paddingRight;
    innerWidth = maxLineWidth;
  }

  // If word wrap is enabled the width needs to be the width of the text.
  if (
    settings.wordWrap &&
    w > maxLineWidth &&
    settings.textAlign === 'left' &&
    lines.length === 1
  ) {
    width = maxLineWidth + paddingLeft + paddingRight;
  }

  let height;
  if (h) {
    height = h;
  } else {
    height = calcHeight(
      settings.textBaseline,
      fontSize,
      lineHeight,
      lines.length
    );
  }

  renderInfo.w = width;
  renderInfo.h = height;
  renderInfo.lines = lines;
  renderInfo.precision = precision;

  if (!width) {
    // To prevent canvas errors.
    width = 1;
  }

  if (!height) {
    // To prevent canvas errors.
    height = 1;
  }

  if (cutSx || cutEx) {
    width = Math.min(width, cutEx - cutSx);
  }

  if (cutSy || cutEy) {
    height = Math.min(height, cutEy - cutSy);
  }

  renderInfo.width = width;
  renderInfo.innerWidth = innerWidth;
  renderInfo.height = height;
  renderInfo.fontSize = fontSize;
  renderInfo.cutSx = cutSx;
  renderInfo.cutSy = cutSy;
  renderInfo.cutEx = cutEx;
  renderInfo.cutEy = cutEy;
  renderInfo.lineHeight = lineHeight;
  renderInfo.defLineHeight = defLineHeight;
  renderInfo.lineWidths = lineWidths;
  renderInfo.paddingLeft = paddingLeft;
  renderInfo.paddingRight = paddingRight;
  renderInfo.letterSpacing = letterSpacing;
  renderInfo.textIndent = textIndent;
  renderInfo.metrics = metrics;

  return {
    renderInfo: (renderInfo as RenderInfo),
    settings: settings,
  };
}
