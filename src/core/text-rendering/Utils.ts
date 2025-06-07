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

import type { NormalizedFontMetrics } from './font-face-types/TrFontFace.js';
import type { WebTrFontFace } from './font-face-types/WebTrFontFace.js';

/**
 * Returns CSS font setting string for use in canvas context.
 *
 * @param fontFace
 * @param fontStyle
 * @param fontSize
 * @param precision
 * @param defaultFontFace
 * @returns
 */
export function getFontSetting(
  fontFace: string | string[],
  fontStyle: string,
  fontSize: number,
  precision: number,
  defaultFontFace: string,
): string {
  let ff = fontFace;

  if (!Array.isArray(ff)) {
    ff = [ff];
  }

  const ffs: string[] = [];
  for (let i = 0, n = ff.length; i < n; i++) {
    let curFf = ff[i];
    // Replace the default font face `null` with the actual default font face set
    // on the stage.
    if (curFf === null || curFf === undefined) {
      curFf = defaultFontFace;
    }
    if (curFf === 'serif' || curFf === 'sans-serif') {
      ffs.push(curFf);
    } else {
      ffs.push(`"${curFf}"`);
    }
  }

  return `${fontStyle} ${fontSize * precision}px ${ffs.join(',')}`;
}

/**
 * Returns true if the given character is a zero-width space.
 *
 * @param space
 */
export function isZeroWidthSpace(space: string): boolean {
  return space === '' || space === '\u200B';
}

/**
 * Returns true if the given character is a zero-width space or a regular space.
 *
 * @param space
 */
export function isSpace(space: string): boolean {
  return isZeroWidthSpace(space) || space === ' ';
}

/**
 * Converts a string into an array of tokens and the words between them.
 *
 * @param tokenRegex
 * @param text
 */
export function tokenizeString(tokenRegex: RegExp, text: string): string[] {
  const delimeters = text.match(tokenRegex) || [];
  const words = text.split(tokenRegex) || [];

  const final: string[] = [];
  for (let i = 0; i < words.length; i++) {
    final.push(words[i]!, delimeters[i]!);
  }
  final.pop();
  return final.filter((word) => word != '');
}

/**
 * Measure the width of a string accounting for letter spacing.
 *
 * @param context
 * @param word
 * @param space
 */
export function measureText(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  word: string,
  space = 0,
): number {
  if (!space) {
    return context.measureText(word).width;
  }
  return word.split('').reduce((acc, char) => {
    // Zero-width spaces should not include letter spacing.
    // And since we know the width of a zero-width space is 0, we can skip
    // measuring it.
    if (isZeroWidthSpace(char)) {
      return acc;
    }
    return acc + context.measureText(char).width + space;
  }, 0);
}

/**
 * Get the font metrics for a font face.
 *
 * @remarks
 * This function will attempt to grab the explicitly defined metrics from the
 * font face first. If the font face does not have metrics defined, it will
 * attempt to calculate the metrics using the browser's measureText method.
 *
 * If the browser does not support the font metrics API, it will use some
 * default values.
 *
 * @param context
 * @param fontFace
 * @param fontSize
 * @returns
 */
export function getWebFontMetrics(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  fontFace: WebTrFontFace,
  fontSize: number,
): NormalizedFontMetrics {
  if (fontFace.metrics) {
    return fontFace.metrics;
  }
  // If the font face doesn't have metrics defined, we fallback to using the
  // browser's measureText method to calculate take a best guess at the font
  // actual font's metrics.
  // - fontBoundingBox[Ascent|Descent] is the best estimate but only supported
  //   in Chrome 87+ (2020), Firefox 116+ (2023), and Safari 11.1+ (2018).
  //   - It is an estimate as it can vary between browsers.
  // - actualBoundingBox[Ascent|Descent] is less accurate and supported in
  //   Chrome 77+ (2019), Firefox 74+ (2020), and Safari 11.1+ (2018).
  // - If neither are supported, we'll use some default values which will
  //   get text on the screen but likely not be great.
  // NOTE: It's been decided not to rely on fontBoundingBox[Ascent|Descent]
  // as it's browser support is limited and it also tends to produce higher than
  // expected values. It is instead HIGHLY RECOMMENDED that developers provide
  // explicit metrics in the font face definition.
  const browserMetrics = context.measureText(
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  );
  console.warn(
    `Font metrics not provided for Canvas Web font ${fontFace.fontFamily}. ` +
      'Using fallback values. It is HIGHLY recommended you use the latest ' +
      'version of the Lightning 3 `msdf-generator` tool to extract the default ' +
      'metrics for the font and provide them in the Canvas Web font definition.',
  );
  let metrics: NormalizedFontMetrics;
  if (
    browserMetrics.actualBoundingBoxDescent &&
    browserMetrics.actualBoundingBoxAscent
  ) {
    metrics = {
      ascender: browserMetrics.actualBoundingBoxAscent / fontSize,
      descender: -browserMetrics.actualBoundingBoxDescent / fontSize,
      lineGap: 0.2,
    };
  } else {
    // If the browser doesn't support the font metrics API, we'll use some
    // default values.
    metrics = {
      ascender: 0.8,
      descender: -0.2,
      lineGap: 0.2,
    };
  }
  // Save the calculated metrics to the font face for future use.
  (fontFace.metrics as NormalizedFontMetrics | null) = metrics;
  return metrics;
}

export interface WrapTextResult {
  l: string[];
  n: number[];
}

/**
 * Applies newlines to a string to have it optimally fit into the horizontal
 * bounds set by the Text object's wordWrapWidth property.
 *
 * @param context
 * @param text
 * @param wordWrapWidth
 * @param letterSpacing
 * @param indent
 */
export function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  wordWrapWidth: number,
  letterSpacing: number,
  indent: number,
): WrapTextResult {
  // Greedy wrapping algorithm that will wrap words as the line grows longer.
  // than its horizontal bounds.
  const spaceRegex = / |\u200B/g;
  const lines = text.split(/\r?\n/g);
  let allLines: string[] = [];
  const realNewlines: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const resultLines: string[] = [];
    let result = '';
    let spaceLeft = wordWrapWidth - indent;
    const words = lines[i]!.split(spaceRegex);
    const spaces = lines[i]!.match(spaceRegex) || [];
    for (let j = 0; j < words.length; j++) {
      const space = spaces[j - 1] || '';
      const word = words[j]!;
      const wordWidth = measureText(context, word, letterSpacing);
      const wordWidthWithSpace =
        wordWidth + measureText(context, space, letterSpacing);
      if (j === 0 || wordWidthWithSpace > spaceLeft) {
        // Skip printing the newline if it's the first word of the line that is.
        // greater than the word wrap width.
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

/**
 * Calculate the default line height given normalized font metrics
 *
 * @remarks
 * This method may be used for both the WebTrFontFace and SdfTrFontFace font types.
 *
 * @param metrics
 * @param fontSize
 * @returns
 */
export function calcDefaultLineHeight(
  metrics: NormalizedFontMetrics,
  fontSize: number,
): number {
  return fontSize * (metrics.ascender - metrics.descender + metrics.lineGap);
}
