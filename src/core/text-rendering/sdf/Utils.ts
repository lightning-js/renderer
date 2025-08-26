// /*
//  * If not stated otherwise in this file or this component's LICENSE file the
//  * following copyright and licenses apply:
//  *
//  * Copyright 2025 Comcast Cable Communications Management, LLC.
//  *
//  * Licensed under the Apache License, Version 2.0 (the License);
//  * you may not use this file except in compliance with the License.
//  * You may obtain a copy of the License at
//  *
//  * http://www.apache.org/licenses/LICENSE-2.0
//  *
//  * Unless required by applicable law or agreed to in writing, software
//  * distributed under the License is distributed on an "AS IS" BASIS,
//  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  * See the License for the specific language governing permissions and
//  * limitations under the License.
//  */

// import { hasZeroWidthSpace } from '../Utils.js';
// import * as SdfFontHandler from '../SdfFontHandler.js';
// import type { TextLineStruct, WrappedLinesStruct } from '../TextRenderer.js';

// export const measureLines = (
//   lines: string[],
//   fontFamily: string,
//   letterSpacing: number,
//   fontScale: number,
//   maxLines: number,
//   hasMaxLines: boolean,
// ): WrappedLinesStruct => {
//   const measuredLines: TextLineStruct[] = [];
//   const designLetterSpacing = letterSpacing * fontScale;
//   let remainingLines = hasMaxLines === true ? maxLines : lines.length;
//   let i = 0;

//   while (remainingLines > 0) {
//     const line = lines[i];
//     if (line === undefined) {
//       continue;
//     }
//     const width = measureText(line, fontFamily, designLetterSpacing);
//     measuredLines.push([line, width]);
//     i++;
//     remainingLines--;
//   }

//   return [
//     measuredLines,
//     remainingLines,
//     hasMaxLines === true ? lines.length - measuredLines.length > 0 : false,
//   ];
// };
// /**
//  * Wrap text for SDF rendering with proper width constraints
//  */
// export const wrapText = (
//   text: string,
//   fontFamily: string,
//   fontScale: number,
//   maxWidth: number,
//   letterSpacing: number,
//   overflowSuffix: string,
//   wordBreak: string,
//   maxLines: number,
//   hasMaxLines: boolean,
// ): WrappedLinesStruct => {
//   const lines = text.split('\n');
//   const wrappedLines: TextLineStruct[] = [];
//   const maxWidthInDesignUnits = maxWidth / fontScale;
//   const designLetterSpacing = letterSpacing * fontScale;

//   // Calculate space width for line wrapping
//   const spaceWidth = measureText(' ', fontFamily, designLetterSpacing);

//   let wrappedLine: TextLineStruct[] = [];
//   let remainingLines = maxLines;
//   let hasRemainingText = true;

//   for (let i = 0; i < lines.length; i++) {
//     const line = lines[i]!;

//     [wrappedLine, remainingLines, hasRemainingText] = wrapLine(
//       line,
//       fontFamily,
//       maxWidthInDesignUnits,
//       designLetterSpacing,
//       spaceWidth,
//       overflowSuffix,
//       wordBreak,
//       remainingLines,
//       hasMaxLines,
//     );

//     wrappedLines.push(...wrappedLine);
//   }

//   return [wrappedLines, remainingLines, hasRemainingText];
// };

// /**
//  * Wrap a single line of text for SDF rendering
//  */
// export const wrapLine = (
//   line: string,
//   fontFamily: string,
//   maxWidth: number,
//   designLetterSpacing: number,
//   spaceWidth: number,
//   overflowSuffix: string,
//   wordBreak: string,
//   remainingLines: number,
//   hasMaxLines: boolean,
// ): WrappedLinesStruct => {
//   // Use the same space regex as Canvas renderer to handle ZWSP
//   const spaceRegex = / |\u200B/g;
//   const words = line.split(spaceRegex);
//   const spaces = line.match(spaceRegex) || [];
//   const wrappedLines: TextLineStruct[] = [];
//   let currentLine = '';
//   let currentLineWidth = 0;
//   let hasRemainingText = true;

//   let i = 0;

//   for (; i < words.length; i++) {
//     const word = words[i];
//     if (word === undefined) {
//       continue;
//     }
//     const space = spaces[i - 1] || '';
//     const wordWidth = measureText(word, fontFamily, designLetterSpacing);
//     // For width calculation, treat ZWSP as having 0 width but regular space functionality
//     const effectiveSpaceWidth = space === '\u200B' ? 0 : spaceWidth;
//     const totalWidth = currentLineWidth + effectiveSpaceWidth + wordWidth;

//     if (
//       (i === 0 && wordWidth <= maxWidth) ||
//       (i > 0 && totalWidth <= maxWidth)
//     ) {
//       // Word fits on current line
//       if (currentLine.length > 0) {
//         // Add space - for ZWSP, don't add anything to output (it's invisible)
//         if (space !== '\u200B') {
//           currentLine += space;
//           currentLineWidth += effectiveSpaceWidth;
//         }
//       }
//       currentLine += word;
//       currentLineWidth += wordWidth;
//     } else {
//       if (remainingLines === 1) {
//         if (currentLine.length > 0) {
//           // Add space - for ZWSP, don't add anything to output (it's invisible)
//           if (space !== '\u200B') {
//             currentLine += space;
//             currentLineWidth += effectiveSpaceWidth;
//           }
//         }
//         currentLine += word;
//         currentLineWidth += wordWidth;
//         remainingLines = 0;
//         hasRemainingText = i < words.length;
//         break;
//       }

//       if (wordBreak !== 'break-all' && currentLine.length > 0) {
//         wrappedLines.push([currentLine, currentLineWidth]);
//         currentLine = '';
//         currentLineWidth = 0;
//         remainingLines--;
//       }

//       if (wordBreak !== 'break-all') {
//         currentLine = word;
//         currentLineWidth = wordWidth;
//       }

//       if (wordBreak === 'break-word') {
//         const [lines, rl, rt] = breakWord(
//           word,
//           fontFamily,
//           maxWidth,
//           designLetterSpacing,
//           remainingLines,
//           hasMaxLines,
//         );
//         remainingLines = rl;
//         hasRemainingText = rt;
//         if (lines.length === 1) {
//           [currentLine, currentLineWidth] = lines[lines.length - 1]!;
//         } else {
//           for (let j = 0; j < lines.length; j++) {
//             [currentLine, currentLineWidth] = lines[j]!;
//             if (j < lines.length - 1) {
//               wrappedLines.push(lines[j]!);
//             }
//           }
//         }
//       } else if (wordBreak === 'break-all') {
//         const codepoint = word.codePointAt(0)!;
//         const glyph = SdfFontHandler.getGlyph(fontFamily, codepoint);
//         const firstLetterWidth =
//           glyph !== null ? glyph.xadvance + designLetterSpacing : 0;
//         let linebreak = false;
//         if (
//           currentLineWidth + firstLetterWidth + effectiveSpaceWidth >
//           maxWidth
//         ) {
//           wrappedLines.push([currentLine, currentLineWidth]);
//           remainingLines -= 1;
//           currentLine = '';
//           currentLineWidth = 0;
//           linebreak = true;
//         }
//         const initial = maxWidth - currentLineWidth;
//         const [lines, rl, rt] = breakAll(
//           word,
//           fontFamily,
//           initial,
//           maxWidth,
//           designLetterSpacing,
//           remainingLines,
//           hasMaxLines,
//         );
//         remainingLines = rl;
//         hasRemainingText = rt;
//         if (linebreak === false) {
//           const [text, width] = lines[0]!;
//           currentLine += ' ' + text;
//           currentLineWidth = width;
//           wrappedLines.push([currentLine, currentLineWidth]);
//         }

//         for (let j = 1; j < lines.length; j++) {
//           [currentLine, currentLineWidth] = lines[j]!;
//           if (j < lines.length - 1) {
//             wrappedLines.push([currentLine, currentLineWidth]);
//           }
//         }
//       }
//     }
//   }

//   // Add the last line if it has content
//   if (currentLine.length > 0 && remainingLines === 0) {
//     currentLine = truncateLineWithSuffix(
//       currentLine,
//       fontFamily,
//       maxWidth,
//       designLetterSpacing,
//       overflowSuffix,
//     );
//   }

//   if (currentLine.length > 0) {
//     wrappedLines.push([currentLine, currentLineWidth]);
//   } else {
//     wrappedLines.push(['', 0]);
//   }
//   return [wrappedLines, remainingLines, hasRemainingText];
// };

// /**
//  * Measure the width of text in SDF design units
//  */
// export const measureText = (
//   text: string,
//   fontFamily: string,
//   designLetterSpacing: number,
// ): number => {
//   let width = 0;
//   let prevCodepoint = 0;
//   for (let i = 0; i < text.length; i++) {
//     const char = text.charAt(i);
//     const codepoint = text.codePointAt(i);
//     if (codepoint === undefined) continue;

//     // Skip zero-width spaces in width calculations
//     if (hasZeroWidthSpace(char)) {
//       continue;
//     }

//     const glyph = SdfFontHandler.getGlyph(fontFamily, codepoint);
//     if (glyph === null) continue;

//     let advance = glyph.xadvance;

//     // Add kerning if there's a previous character
//     if (prevCodepoint !== 0) {
//       const kerning = SdfFontHandler.getKerning(
//         fontFamily,
//         prevCodepoint,
//         codepoint,
//       );
//       advance += kerning;
//     }

//     width += advance + designLetterSpacing;
//     prevCodepoint = codepoint;
//   }

//   return width;
// };

// /**
//  * Truncate a line with overflow suffix to fit within width
//  */
// export const truncateLineWithSuffix = (
//   line: string,
//   fontFamily: string,
//   maxWidth: number,
//   designLetterSpacing: number,
//   overflowSuffix: string,
// ): string => {
//   const suffixWidth = measureText(
//     overflowSuffix,
//     fontFamily,
//     designLetterSpacing,
//   );

//   if (suffixWidth >= maxWidth) {
//     return overflowSuffix.substring(0, Math.max(1, overflowSuffix.length - 1));
//   }

//   let truncatedLine = line;
//   while (truncatedLine.length > 0) {
//     const lineWidth = measureText(
//       truncatedLine,
//       fontFamily,
//       designLetterSpacing,
//     );
//     if (lineWidth + suffixWidth <= maxWidth) {
//       return truncatedLine + overflowSuffix;
//     }
//     truncatedLine = truncatedLine.substring(0, truncatedLine.length - 1);
//   }

//   return overflowSuffix;
// };

// /**
//  * wordbreak function: https://developer.mozilla.org/en-US/docs/Web/CSS/word-break#break-word
//  */
// export const breakWord = (
//   word: string,
//   fontFamily: string,
//   maxWidth: number,
//   designLetterSpacing: number,
//   remainingLines: number,
//   hasMaxLines: boolean,
// ): WrappedLinesStruct => {
//   const lines: TextLineStruct[] = [];
//   let currentPart = '';
//   let currentWidth = 0;
//   let i = 0;

//   for (let i = 0; i < word.length; i++) {
//     const char = word.charAt(i);
//     const codepoint = char.codePointAt(0);
//     if (codepoint === undefined) continue;

//     const glyph = SdfFontHandler.getGlyph(fontFamily, codepoint);
//     if (glyph === null) continue;

//     const charWidth = glyph.xadvance + designLetterSpacing;

//     if (currentWidth + charWidth > maxWidth && currentPart.length > 0) {
//       remainingLines--;
//       if (remainingLines === 0) {
//         break;
//       }
//       lines.push([currentPart, currentWidth]);
//       currentPart = char;
//       currentWidth = charWidth;
//     } else {
//       currentPart += char;
//       currentWidth += charWidth;
//     }
//   }

//   if (currentPart.length > 0) {
//     lines.push([currentPart, currentWidth]);
//   }

//   return [lines, remainingLines, i < word.length - 1];
// };

// /**
//  * wordbreak function: https://developer.mozilla.org/en-US/docs/Web/CSS/word-break#break-word
//  */
// export const breakAll = (
//   word: string,
//   fontFamily: string,
//   initial: number,
//   maxWidth: number,
//   designLetterSpacing: number,
//   remainingLines: number,
//   hasMaxLines: boolean,
// ): WrappedLinesStruct => {
//   const lines: TextLineStruct[] = [];
//   let currentPart = '';
//   let currentWidth = 0;
//   let max = initial;
//   let i = 0;
//   let hasRemainingText = false;

//   for (; i < word.length; i++) {
//     if (remainingLines === 0) {
//       hasRemainingText = true;
//       break;
//     }
//     const char = word.charAt(i);
//     const codepoint = char.codePointAt(0)!;
//     const glyph = SdfFontHandler.getGlyph(fontFamily, codepoint);
//     if (glyph === null) continue;

//     const charWidth = glyph.xadvance + designLetterSpacing;
//     if (currentWidth + charWidth > max && currentPart.length > 0) {
//       lines.push([currentPart, currentWidth]);
//       currentPart = char;
//       currentWidth = charWidth;
//       max = maxWidth;
//       remainingLines--;
//     } else {
//       currentPart += char;
//       currentWidth += charWidth;
//     }
//   }

//   if (currentPart.length > 0) {
//     lines.push([currentPart, currentWidth]);
//   }

//   return [lines, remainingLines, hasRemainingText];
// };
