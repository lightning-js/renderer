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

import type { NormalizedFontMetrics } from './TextRenderer.js';

const invisibleChars = /[\u200B\u200C\u200D\uFEFF\u00AD\u2060]/g;

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
export function hasZeroWidthSpace(space: string): boolean {
  return invisibleChars.test(space) === true;
}

/**
 * Returns true if the given character is a zero-width space or a regular space.
 *
 * @param space
 */
export function isSpace(space: string): boolean {
  return hasZeroWidthSpace(space) || space === ' ';
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
