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

import type { NormalizedFontMetrics } from '../TextRenderer.js';
import { isZeroWidthSpace } from '../Utils.js';
import type { TextBaseline } from './Settings.js';

export const measureText = (
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  word: string,
  space = 0,
) => {
  if (!space) {
    return context.measureText(word).width;
  }
  return word.split('').reduce((acc, char) => {
    if (isZeroWidthSpace(char)) {
      return acc;
    }
    return acc + context.measureText(char).width + space;
  }, 0);
};

// Helper functions
export const wrapWord = (
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  word: string,
  wordWrapWidth: number,
  suffix: string,
  letterSpacing: number,
) => {
  const suffixWidth = measureText(context, suffix, letterSpacing);
  const wordLen = word.length;
  const wordWidth = measureText(context, word, letterSpacing);
  if (wordWidth <= wordWrapWidth) {
    return word;
  }
  let cutoffIndex = Math.floor((wordWrapWidth * wordLen) / wordWidth);
  let truncWordWidth =
    measureText(context, word.substring(0, cutoffIndex), letterSpacing) +
    suffixWidth;
  if (truncWordWidth > wordWrapWidth) {
    while (cutoffIndex > 0) {
      truncWordWidth =
        measureText(context, word.substring(0, cutoffIndex), letterSpacing) +
        suffixWidth;
      if (truncWordWidth > wordWrapWidth) {
        cutoffIndex -= 1;
      } else {
        break;
      }
    }
  } else {
    while (cutoffIndex < wordLen) {
      truncWordWidth =
        measureText(context, word.substring(0, cutoffIndex), letterSpacing) +
        suffixWidth;
      if (truncWordWidth < wordWrapWidth) {
        cutoffIndex += 1;
      } else {
        cutoffIndex -= 1;
        break;
      }
    }
  }
  return (
    word.substring(0, cutoffIndex) +
    (wordWrapWidth >= suffixWidth ? suffix : '')
  );
};

export const wrapText = (
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  text: string,
  wordWrapWidth: number,
  letterSpacing: number,
  indent: number,
) => {
  const spaceRegex = / |\u200B/g;
  const lines = text.split(/\r?\n/g);
  let allLines: string[] = [];
  const realNewlines: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const resultLines: string[] = [];
    let result = '';
    let spaceLeft = wordWrapWidth - indent;
    const line = lines[i] ?? '';
    const words = line.split(spaceRegex);
    const spaces = line.match(spaceRegex) || [];
    for (let j = 0; j < words.length; j++) {
      const space = spaces[j - 1] || '';
      const word = words[j] || '';
      const wordWidth = measureText(context, word, letterSpacing);
      const wordWidthWithSpace =
        wordWidth + measureText(context, space, letterSpacing);
      if (j === 0 || wordWidthWithSpace > spaceLeft) {
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
};

export const isNormalizedFontMetrics = (
  obj: unknown,
): obj is NormalizedFontMetrics => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'ascender' in obj &&
    typeof (obj as { ascender: unknown }).ascender === 'number' &&
    'descender' in obj &&
    typeof (obj as { descender: unknown }).descender === 'number' &&
    'lineGap' in obj &&
    typeof (obj as { lineGap: unknown }).lineGap === 'number'
  );
};

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
export const calcHeight = (
  textBaseline: TextBaseline,
  fontSize: number,
  lineHeight: number,
  numLines: number,
  offsetY: number | null,
) => {
  const baselineOffset = textBaseline !== 'bottom' ? 0.5 * fontSize : 0;
  return (
    lineHeight * (numLines - 1) +
    baselineOffset +
    Math.max(lineHeight, fontSize) +
    (offsetY || 0)
  );
};
