// Hoe leveren we MDSF aan meerdere talen
// volgorde bij wordbreak ed

// Correct Behavior for RTL Text
// Horizontal Flow:

// Words and characters flow from right to left within a line.
// The starting position of the line is on the right edge, and text flows leftward.
// Vertical Flow:

// Lines are added top to bottom, just like in LTR text.
// When a word does not fit within the current line, it is moved to the next line below.
// Word Wrapping:

// For RTL, the logic for breaking a line should account for the fact that the text flows from right to left. This means:
// The line starts at the right edge (curX initialized to startX + vertexW).
// curX is decremented as glyphs are added.
// When a word does not fit, the line is broken, and the word is moved to the next line below.

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

export function isRtlCodePoint(codePoint: number): boolean {
  return (
    (codePoint >= 0x0590 && codePoint <= 0x05ff) || // Hebrew
    (codePoint >= 0x0600 && codePoint <= 0x06ff) || // Arabic
    (codePoint >= 0x0750 && codePoint <= 0x077f) || // Arabic Supplement
    (codePoint >= 0x08a0 && codePoint <= 0x08ff) || // Arabic Extended-A
    (codePoint >= 0x0700 && codePoint <= 0x074f) || // Syriac
    (codePoint >= 0x0780 && codePoint <= 0x07bf) || // Thaana
    (codePoint >= 0x07c0 && codePoint <= 0x07ff) || // N'Ko
    (codePoint >= 0xfb50 && codePoint <= 0xfdff) || // Arabic Presentation Forms-A
    (codePoint >= 0xfe70 && codePoint <= 0xfeff) // Arabic Presentation Forms-B
  );
}

export function getOrderedText(
  rtl: boolean, // true if the text is right-to-left
  bidi: boolean, // true if the text is bidirectional
  text: string,
): string {
  if (!bidi && rtl === true) {
    return text.split('').reverse().join('');
  } else if (bidi === true) {
    const reorderedText: Array<string> = [];
    let currentGroup: Array<string> = []; // Group of characters with the same direction
    let currentDirection: boolean | null = null; // `true` for RTL, `false` for LTR, `null` for uninitialized

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const codepoint = char?.codePointAt(0);
      const isCharRTL =
        codepoint !== undefined ? isRtlCodePoint(codepoint) : false;

      if (
        currentDirection === null ||
        currentDirection === isCharRTL ||
        codepoint === 32
      ) {
        // When space is encountered, we don't change the direction or flush the group
        if (codepoint !== 32) {
          currentDirection = isCharRTL;
        }
      } else {
        // Flush the current group
        if (currentDirection && rtl) {
          currentGroup.reverse();
        }
        reorderedText.push(...currentGroup);
        currentGroup = [];
        currentDirection = isCharRTL;
      }
      if (char !== undefined) {
        currentGroup.push(char);
      }
    }
    // Flush the last group
    if (currentDirection && rtl) {
      currentGroup.reverse();
    }
    reorderedText.push(...currentGroup);

    return reorderedText.join('');
  } else {
    // No reordering needed (LTR)
    return text;
  }
}
