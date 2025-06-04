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

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { assertTruthy } from '../../../utils.js';
import { getRgbaString, type RGBA } from '../../lib/utils.js';
import { calcDefaultLineHeight } from '../TextRenderingUtils.js';
import {
  getWebFontMetrics,
  isZeroWidthSpace,
} from '../TextTextureRendererUtils.js';
import type { NormalizedFontMetrics } from '../font-face-types/TrFontFace.js';
import type { WebTrFontFace } from '../font-face-types/WebTrFontFace.js';

const MAX_TEXTURE_DIMENSION = 2048;

/**
 * Text Overflow Values
 */
export type TextOverflow =
  | 'ellipsis'
  | 'clip'
  | (string & Record<never, never>);

/***
 * Text Horizontal Align Values
 */
export type TextAlign = 'left' | 'center' | 'right';

/***
 * Text Baseline Values
 */
export type TextBaseline =
  | 'alphabetic'
  | 'top'
  | 'hanging'
  | 'middle'
  | 'ideographic'
  | 'bottom';

/***
 * Text Vertical Align Values
 */
export type TextVerticalAlign = 'top' | 'middle' | 'bottom';

/**
 * Text Texture Settings
 */
export interface Settings {
  w: number;
  h: number;
  text: string;
  fontStyle: string;
  fontSize: number;
  fontBaselineRatio: number;
  fontFamily: string | null;
  trFontFace: WebTrFontFace | null;
  wordWrap: boolean;
  wordWrapWidth: number;
  wordBreak: 'normal' | 'break-all' | 'break-word';
  textOverflow: TextOverflow | null;
  lineHeight: number | null;
  textBaseline: TextBaseline;
  textAlign: TextAlign;
  verticalAlign: TextVerticalAlign;
  offsetY: number | null;
  maxLines: number;
  maxHeight: number | null;
  overflowSuffix: string;
  precision: number;
  textColor: RGBA;
  paddingLeft: number;
  paddingRight: number;
  shadow: boolean;
  shadowColor: RGBA;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
  highlight: boolean;
  highlightHeight: number;
  highlightColor: RGBA;
  highlightOffset: number;
  highlightPaddingLeft: number;
  highlightPaddingRight: number;
  letterSpacing: number;
  textIndent: number;
  cutSx: number;
  cutSy: number;
  cutEx: number;
  cutEy: number;
  advancedRenderer: boolean;

  // Normally stage options
  textRenderIssueMargin: number;
}

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

/**
 * Calculate height for the canvas
 *
 * @param textBaseline
 * @param fontSize
 * @param lineHeight
 * @param numLines
 * @param offsetY
 * @returns
 */
function calcHeight(
  textBaseline: TextBaseline,
  fontSize: number,
  lineHeight: number,
  numLines: number,
  offsetY: number | null,
) {
  const baselineOffset = textBaseline !== 'bottom' ? 0.5 * fontSize : 0;
  return (
    lineHeight * (numLines - 1) +
    baselineOffset +
    Math.max(lineHeight, fontSize) +
    (offsetY || 0)
  );
}

export class LightningTextTextureRenderer {
  private _canvas: OffscreenCanvas | HTMLCanvasElement;
  private _context:
    | OffscreenCanvasRenderingContext2D
    | CanvasRenderingContext2D;
  private _settings: Settings;

  constructor(
    canvas: OffscreenCanvas | HTMLCanvasElement,
    context: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  ) {
    this._canvas = canvas;
    this._context = context;
    this._settings = this.mergeDefaults({});
  }

  set settings(v: Partial<Settings>) {
    this._settings = this.mergeDefaults(v);
  }

  get settings(): Settings {
    return this._settings;
  }

  getPrecision() {
    return this._settings.precision;
  }

  setFontProperties() {
    this._context.font = this._getFontSetting();
    this._context.textBaseline = this._settings.textBaseline;
  }

  _getFontSetting() {
    const ff = [this._settings.fontFamily];

    const ffs: string[] = [];
    for (let i = 0, n = ff.length; i < n; i++) {
      if (ff[i] === 'serif' || ff[i] === 'sans-serif') {
        ffs.push(ff[i]!);
      } else {
        ffs.push(`"${ff[i]!}"`);
      }
    }

    return `${this._settings.fontStyle} ${
      this._settings.fontSize * this.getPrecision()
    }px ${ffs.join(',')}`;
  }

  _load() {
    if (true && document.fonts) {
      const fontSetting = this._getFontSetting();
      try {
        if (!document.fonts.check(fontSetting, this._settings.text)) {
          // Use a promise that waits for loading.
          return document.fonts
            .load(fontSetting, this._settings.text)
            .catch((err) => {
              // Just load the fallback font.
              console.warn('[Lightning] Font load error', err, fontSetting);
            })
            .then(() => {
              if (!document.fonts.check(fontSetting, this._settings.text)) {
                console.warn('[Lightning] Font not found', fontSetting);
              }
            });
        }
      } catch (e) {
        console.warn("[Lightning] Can't check font loading for " + fontSetting);
      }
    }
  }

  calculateRenderInfo(): RenderInfo {
    const renderInfo: Partial<RenderInfo> = {};

    const precision = this.getPrecision();

    const paddingLeft = this._settings.paddingLeft * precision;
    const paddingRight = this._settings.paddingRight * precision;
    const fontSize = this._settings.fontSize * precision;
    let offsetY =
      this._settings.offsetY === null
        ? null
        : this._settings.offsetY * precision;
    const w = this._settings.w * precision;
    const h = this._settings.h * precision;
    let wordWrapWidth = this._settings.wordWrapWidth * precision;
    const cutSx = this._settings.cutSx * precision;
    const cutEx = this._settings.cutEx * precision;
    const cutSy = this._settings.cutSy * precision;
    const cutEy = this._settings.cutEy * precision;
    const letterSpacing = (this._settings.letterSpacing || 0) * precision;
    const textIndent = this._settings.textIndent * precision;
    const trFontFace = this._settings.trFontFace;

    // Set font properties.
    this.setFontProperties();

    assertTruthy(trFontFace);
    const metrics = getWebFontMetrics(this._context, trFontFace, fontSize);
    const defLineHeight = calcDefaultLineHeight(metrics, fontSize) * precision;
    const lineHeight =
      this._settings.lineHeight !== null
        ? this._settings.lineHeight * precision
        : defLineHeight;

    const maxHeight = this._settings.maxHeight;
    const containedMaxLines =
      maxHeight !== null && lineHeight > 0
        ? Math.floor(maxHeight / lineHeight)
        : 0;

    const setMaxLines = this._settings.maxLines;
    const calcMaxLines =
      containedMaxLines > 0 && setMaxLines > 0
        ? Math.min(containedMaxLines, setMaxLines)
        : Math.max(containedMaxLines, setMaxLines);

    // Total width.
    let width = w || 2048 / this.getPrecision();

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
    // TODO Probably never used
    if (this._settings.textOverflow && !this._settings.wordWrap) {
      let suffix;
      switch (this._settings.textOverflow) {
        case 'clip':
          suffix = '';
          break;
        case 'ellipsis':
          suffix = this._settings.overflowSuffix;
          break;
        default:
          suffix = this._settings.textOverflow;
      }
      this._settings.text = this.wrapWord(
        this._settings.text,
        wordWrapWidth - textIndent,
        suffix,
      );
    }

    // word wrap
    // preserve original text
    let linesInfo: { n: number[]; l: string[] };
    if (this._settings.wordWrap) {
      linesInfo = this.wrapText(
        this._settings.text,
        wordWrapWidth,
        letterSpacing,
        textIndent,
      );
    } else {
      linesInfo = { l: this._settings.text.split(/(?:\r\n|\r|\n)/), n: [] };
      const n = linesInfo.l.length;
      for (let i = 0; i < n - 1; i++) {
        linesInfo.n.push(i);
      }
    }
    let lines = linesInfo.l;

    if (calcMaxLines && lines.length > calcMaxLines) {
      const usedLines = lines.slice(0, calcMaxLines);

      let otherLines: string[] | null = null;
      if (this._settings.overflowSuffix) {
        // Wrap again with max lines suffix enabled.
        const w = this._settings.overflowSuffix
          ? this.measureText(this._settings.overflowSuffix)
          : 0;
        const al = this.wrapText(
          usedLines[usedLines.length - 1]!,
          wordWrapWidth - w,
          letterSpacing,
          textIndent,
        );
        usedLines[usedLines.length - 1] = `${al.l[0]!}${
          this._settings.overflowSuffix
        }`;
        otherLines = [al.l.length > 1 ? al.l[1]! : ''];
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
        this.measureText(lines[i]!, letterSpacing) + (i === 0 ? textIndent : 0);
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
      this._settings.wordWrap &&
      w > maxLineWidth &&
      this._settings.textAlign === 'left' &&
      lines.length === 1
    ) {
      width = maxLineWidth + paddingLeft + paddingRight;
    }

    let height;
    if (h) {
      height = h;
    } else {
      height = calcHeight(
        this._settings.textBaseline,
        fontSize,
        lineHeight,
        lines.length,
        offsetY,
      );
    }

    if (offsetY === null) {
      offsetY = fontSize;
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
    renderInfo.offsetY = offsetY;
    renderInfo.paddingLeft = paddingLeft;
    renderInfo.paddingRight = paddingRight;
    renderInfo.letterSpacing = letterSpacing;
    renderInfo.textIndent = textIndent;
    renderInfo.metrics = metrics;

    return renderInfo as RenderInfo;
  }

  draw(
    renderInfo: RenderInfo,
    linesOverride?: { lines: string[]; lineWidths: number[] },
  ) {
    const precision = this.getPrecision();

    // Allow lines to be overriden for partial rendering.
    const lines = linesOverride?.lines || renderInfo.lines;
    const lineWidths = linesOverride?.lineWidths || renderInfo.lineWidths;
    const height = linesOverride
      ? calcHeight(
          this._settings.textBaseline,
          renderInfo.fontSize,
          renderInfo.lineHeight,
          linesOverride.lines.length,
          this._settings.offsetY === null
            ? null
            : this._settings.offsetY * precision,
        )
      : renderInfo.height;

    // Add extra margin to prevent issue with clipped text when scaling.
    this._canvas.width = Math.min(
      Math.ceil(renderInfo.width + this._settings.textRenderIssueMargin),
      MAX_TEXTURE_DIMENSION,
    );
    this._canvas.height = Math.min(Math.ceil(height), MAX_TEXTURE_DIMENSION);

    // Canvas context has been reset.
    this.setFontProperties();

    if (renderInfo.fontSize >= 128) {
      // WpeWebKit bug: must force compositing because cairo-traps-compositor will not work with text first.
      this._context.globalAlpha = 0.01;
      this._context.fillRect(0, 0, 0.01, 0.01);
      this._context.globalAlpha = 1.0;
    }

    if (renderInfo.cutSx || renderInfo.cutSy) {
      this._context.translate(-renderInfo.cutSx, -renderInfo.cutSy);
    }

    let linePositionX;
    let linePositionY;

    const drawLines: LineType[] = [];

    const { metrics } = renderInfo;

    /**
     * Ascender (in pixels)
     */
    const ascenderPx = metrics
      ? metrics.ascender * renderInfo.fontSize
      : renderInfo.fontSize;

    /**
     * Bare line height is the distance between the ascender and descender of the font.
     * without the line gap metric.
     */
    const bareLineHeightPx =
      (metrics.ascender - metrics.descender) * renderInfo.fontSize;

    // Draw lines line by line.
    for (let i = 0, n = lines.length; i < n; i++) {
      linePositionX = i === 0 ? renderInfo.textIndent : 0;

      // By default, text is aligned to top
      linePositionY = i * renderInfo.lineHeight + ascenderPx;

      if (this._settings.verticalAlign == 'middle') {
        linePositionY += (renderInfo.lineHeight - bareLineHeightPx) / 2;
      } else if (this._settings.verticalAlign == 'bottom') {
        linePositionY += renderInfo.lineHeight - bareLineHeightPx;
      }

      if (this._settings.textAlign === 'right') {
        linePositionX += renderInfo.innerWidth - lineWidths[i]!;
      } else if (this._settings.textAlign === 'center') {
        linePositionX += (renderInfo.innerWidth - lineWidths[i]!) / 2;
      }
      linePositionX += renderInfo.paddingLeft;

      drawLines.push({
        text: lines[i]!,
        x: linePositionX,
        y: linePositionY,
        w: lineWidths[i]!,
      });
    }

    // Highlight.
    if (this._settings.highlight) {
      const color = this._settings.highlightColor;

      const hlHeight =
        this._settings.highlightHeight * precision || renderInfo.fontSize * 1.5;
      const offset = this._settings.highlightOffset * precision;
      const hlPaddingLeft =
        this._settings.highlightPaddingLeft !== null
          ? this._settings.highlightPaddingLeft * precision
          : renderInfo.paddingLeft;
      const hlPaddingRight =
        this._settings.highlightPaddingRight !== null
          ? this._settings.highlightPaddingRight * precision
          : renderInfo.paddingRight;

      this._context.fillStyle = getRgbaString(color);
      for (let i = 0; i < drawLines.length; i++) {
        const drawLine = drawLines[i]!;
        this._context.fillRect(
          drawLine.x - hlPaddingLeft,
          drawLine.y - renderInfo.offsetY + offset,
          drawLine.w + hlPaddingRight + hlPaddingLeft,
          hlHeight,
        );
      }
    }

    // Text shadow.
    let prevShadowSettings: null | [string, number, number, number] = null;
    if (this._settings.shadow) {
      prevShadowSettings = [
        this._context.shadowColor,
        this._context.shadowOffsetX,
        this._context.shadowOffsetY,
        this._context.shadowBlur,
      ];

      this._context.shadowColor = getRgbaString(this._settings.shadowColor);
      this._context.shadowOffsetX = this._settings.shadowOffsetX * precision;
      this._context.shadowOffsetY = this._settings.shadowOffsetY * precision;
      this._context.shadowBlur = this._settings.shadowBlur * precision;
    }

    this._context.fillStyle = getRgbaString(this._settings.textColor);
    for (let i = 0, n = drawLines.length; i < n; i++) {
      const drawLine = drawLines[i]!;

      if (renderInfo.letterSpacing === 0) {
        this._context.fillText(drawLine.text, drawLine.x, drawLine.y);
      } else {
        const textSplit = drawLine.text.split('');
        let x = drawLine.x;
        for (let i = 0, j = textSplit.length; i < j; i++) {
          this._context.fillText(textSplit[i]!, x, drawLine.y);
          x += this.measureText(textSplit[i]!, renderInfo.letterSpacing);
        }
      }
    }

    if (prevShadowSettings) {
      this._context.shadowColor = prevShadowSettings[0];
      this._context.shadowOffsetX = prevShadowSettings[1];
      this._context.shadowOffsetY = prevShadowSettings[2];
      this._context.shadowBlur = prevShadowSettings[3];
    }

    if (renderInfo.cutSx || renderInfo.cutSy) {
      this._context.translate(renderInfo.cutSx, renderInfo.cutSy);
    }
  }

  wrapWord(word: string, wordWrapWidth: number, suffix: string) {
    const suffixWidth = this._context.measureText(suffix).width;
    const wordLen = word.length;
    const wordWidth = this._context.measureText(word).width;

    /* If word fits wrapWidth, do nothing */
    if (wordWidth <= wordWrapWidth) {
      return word;
    }

    /* Make initial guess for text cuttoff */
    let cutoffIndex = Math.floor((wordWrapWidth * wordLen) / wordWidth);
    let truncWordWidth =
      this._context.measureText(word.substring(0, cutoffIndex)).width +
      suffixWidth;

    /* In case guess was overestimated, shrink it letter by letter. */
    if (truncWordWidth > wordWrapWidth) {
      while (cutoffIndex > 0) {
        truncWordWidth =
          this._context.measureText(word.substring(0, cutoffIndex)).width +
          suffixWidth;
        if (truncWordWidth > wordWrapWidth) {
          cutoffIndex -= 1;
        } else {
          break;
        }
      }

      /* In case guess was underestimated, extend it letter by letter. */
    } else {
      while (cutoffIndex < wordLen) {
        truncWordWidth =
          this._context.measureText(word.substring(0, cutoffIndex)).width +
          suffixWidth;
        if (truncWordWidth < wordWrapWidth) {
          cutoffIndex += 1;
        } else {
          // Finally, when bound is crossed, retract last letter.
          cutoffIndex -= 1;
          break;
        }
      }
    }

    /* If wrapWidth is too short to even contain suffix alone, return empty string */
    return (
      word.substring(0, cutoffIndex) +
      (wordWrapWidth >= suffixWidth ? suffix : '')
    );
  }

  /**
   * Applies newlines to a string to have it optimally fit into the horizontal
   * bounds set by the Text object's wordWrapWidth property.
   */
  wrapText(
    text: string,
    wordWrapWidth: number,
    letterSpacing: number,
    indent = 0,
  ) {
    const spaceRegex = / |\u200B/g; // ZWSP and spaces
    const lines = text.split(/\r?\n/g);
    let allLines: string[] = [];
    const realNewlines: number[] = [];

    for (let i = 0; i < lines.length; i++) {
      const resultLines: string[] = [];
      let result = '';
      let spaceLeft = wordWrapWidth - indent;

      // Split the line into words, considering ZWSP
      const words = lines[i]!.split(spaceRegex);
      const spaces = lines[i]!.match(spaceRegex) || [];

      for (let j = 0; j < words.length; j++) {
        const space = spaces[j - 1] || '';
        const word = words[j]!;
        const wordWidth = this.measureText(word, letterSpacing);
        const wordWidthWithSpace = isZeroWidthSpace(space)
          ? wordWidth
          : wordWidth + this.measureText(space, letterSpacing);

        if (
          this._settings.wordBreak === 'break-all' &&
          wordWidthWithSpace > spaceLeft
        ) {
          const letters = word.split('');
          for (let k = 0; k < letters.length; k++) {
            const letter = letters[k]!;
            const letterWidthWithSpace =
              k > 0
                ? this.measureText(letter, letterSpacing)
                : this.measureText(space + letter, letterSpacing);

            if (letterWidthWithSpace > spaceLeft) {
              resultLines.push(result);
              result = letter;
              spaceLeft = wordWrapWidth - letterWidthWithSpace;
            } else {
              spaceLeft -= letterWidthWithSpace;
              result += k > 0 ? letter : space + letter;
            }
          }
        } else if (
          this._settings.wordBreak === 'break-word' &&
          wordWidthWithSpace > spaceLeft
        ) {
          if (wordWidth < wordWrapWidth) {
            resultLines.push(result);
            result = word;
            spaceLeft = wordWrapWidth - wordWidth - (j === 0 ? indent : 0);
          } else {
            if (result.length > 0) resultLines.push(result);
            result = '';
            spaceLeft = wordWrapWidth - indent;
            const letters = word.split('');
            for (let k = 0; k < letters.length; k++) {
              const letter = letters[k]!;
              const letterWidth = this.measureText(letter, letterSpacing);
              if (letterWidth > spaceLeft) {
                resultLines.push(result);
                result = '';
                spaceLeft = wordWrapWidth - indent;
              } else {
                result += letter;
                spaceLeft -= letterWidth;
              }
            }
          }
        } else if (j === 0 || wordWidthWithSpace > spaceLeft) {
          if (j > 0) {
            resultLines.push(result);
            result = '';
          }
          result += word;
          spaceLeft = wordWrapWidth - wordWidth - (j === 0 ? indent : 0);
        } else {
          spaceLeft -= wordWidthWithSpace;
          result += space + word;
        }
      }

      resultLines.push(result);
      result = '';
      allLines = allLines.concat(resultLines);

      if (i < lines.length - 1) {
        realNewlines.push(allLines.length);
      }
    }

    return { l: allLines, n: realNewlines };
  }

  measureText(word: string, space = 0) {
    if (!space) {
      return this._context.measureText(word).width;
    }

    // Split word into characters, but skip ZWSP in the width calculation
    return word.split('').reduce((acc, char) => {
      // Check if the character is a zero-width space and skip it
      if (isZeroWidthSpace(char)) {
        return acc;
      }
      return acc + this._context.measureText(char).width + space;
    }, 0);
  }

  mergeDefaults(settings: Partial<Settings>): Settings {
    return {
      text: '',
      w: 0,
      h: 0,
      fontStyle: 'normal',
      fontSize: 40,
      fontFamily: null,
      trFontFace: null,
      wordWrap: true,
      wordWrapWidth: 0,
      wordBreak: 'normal',
      textOverflow: '',
      lineHeight: null,
      textBaseline: 'alphabetic',
      textAlign: 'left',
      verticalAlign: 'top',
      offsetY: null,
      maxLines: 0,
      maxHeight: null,
      overflowSuffix: '...',
      textColor: [1.0, 1.0, 1.0, 1.0],
      paddingLeft: 0,
      paddingRight: 0,
      shadow: false,
      shadowColor: [0.0, 0.0, 0.0, 1.0],
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      shadowBlur: 5,
      highlight: false,
      highlightHeight: 0,
      highlightColor: [0.0, 0.0, 0.0, 1.0],
      highlightOffset: 0,
      highlightPaddingLeft: 0,
      highlightPaddingRight: 0,
      letterSpacing: 0,
      textIndent: 0,
      cutSx: 0,
      cutEx: 0,
      cutSy: 0,
      cutEy: 0,
      advancedRenderer: false,
      fontBaselineRatio: 0,
      precision: 1,
      textRenderIssueMargin: 0,
      ...settings,
    };
  }
}
