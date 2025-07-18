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

import { isZeroWidthSpace } from '../Utils.js';
import * as SdfFontHandler from '../SdfFontHandler.js';

/**
 * Wrap text for SDF rendering with proper width constraints
 */
export const wrapText = (
  text: string,
  fontFamily: string,
  fontData: SdfFontHandler.SdfFontData,
  fontSize: number,
  fontScale: number,
  maxWidth: number,
  letterSpacing: number,
  overflowSuffix: string,
  maxLines: number,
): string[] => {
  const lines = text.split('\n');
  const wrappedLines: string[] = [];

  const designLetterSpacing =
    (letterSpacing * (fontData.info?.size || fontData.common.lineHeight)) /
    fontSize;

  // Calculate space width for line wrapping
  const spaceWidth = measureText(
    ' ',
    fontFamily,
    fontData,
    designLetterSpacing,
  );

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) {
      wrappedLines.push('');
      continue;
    }

    // If we've hit the max lines limit, stop processing
    if (maxLines > 0 && wrappedLines.length >= maxLines) {
      break;
    }

    const lineWrapped = wrapLine(
      line,
      fontFamily,
      fontData,
      fontScale,
      maxWidth,
      designLetterSpacing,
      spaceWidth,
      overflowSuffix,
      maxLines > 0 ? maxLines - wrappedLines.length : 0,
    );

    wrappedLines.push(...lineWrapped);
  }

  return wrappedLines;
};

/**
 * Wrap a single line of text for SDF rendering
 */
export const wrapLine = (
  line: string,
  fontFamily: string,
  fontData: SdfFontHandler.SdfFontData,
  fontScale: number,
  maxWidth: number,
  designLetterSpacing: number,
  spaceWidth: number,
  overflowSuffix: string,
  remainingLines: number,
): string[] => {
  // Use the same space regex as Canvas renderer to handle ZWSP
  const spaceRegex = / |\u200B/g;
  const words = line.split(spaceRegex);
  const spaces = line.match(spaceRegex) || [];
  const wrappedLines: string[] = [];
  let currentLine = '';
  let currentLineWidth = 0;
  const maxWidthInDesignUnits = maxWidth / fontScale;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!word) continue;

    const space = spaces[i - 1] || '';
    const wordWidth = measureText(
      word,
      fontFamily,
      fontData,
      designLetterSpacing,
    );
    // For width calculation, treat ZWSP as having 0 width but regular space functionality
    const effectiveSpaceWidth = space === '\u200B' ? 0 : spaceWidth;
    const totalWidth = currentLineWidth + effectiveSpaceWidth + wordWidth;

    // Check if we need to wrap or if this is the last line and we need to truncate
    const isLastAllowedLine =
      remainingLines > 0 && wrappedLines.length >= remainingLines - 1;

    // ZWSP should always force a line break (except for the first word)
    const shouldBreakForZwsp = space === '\u200B' && currentLine.length > 0;

    if (!shouldBreakForZwsp && totalWidth <= maxWidthInDesignUnits) {
      // Word fits on current line
      if (currentLine.length > 0) {
        // Add space - for ZWSP, don't add anything to output (it's invisible)
        if (space !== '\u200B') {
          currentLine += space;
          currentLineWidth += effectiveSpaceWidth;
        }
      }
      currentLine += word;
      currentLineWidth += wordWidth;
    } else {
      // Word doesn't fit, need to wrap or truncate
      if (currentLine.length > 0) {
        // Finish current line
        if (isLastAllowedLine && overflowSuffix) {
          // Need to truncate this line to fit the overflow suffix
          currentLine = truncateLineWithSuffix(
            currentLine,
            fontFamily,
            fontData,
            fontScale,
            maxWidth,
            designLetterSpacing,
            overflowSuffix,
          );
        }
        wrappedLines.push(currentLine);
        currentLine = '';
        currentLineWidth = 0;
      }

      // Check if we've reached the line limit
      if (remainingLines > 0 && wrappedLines.length >= remainingLines) {
        break;
      }

      // Start new line with the word
      if (wordWidth <= maxWidthInDesignUnits) {
        currentLine = word;
        currentLineWidth = wordWidth;
      } else {
        // Word is too long for a single line, break it
        const brokenWord = breakLongWord(
          word,
          fontFamily,
          fontData,
          fontScale,
          maxWidth,
          designLetterSpacing,
          overflowSuffix,
          remainingLines > 0 ? remainingLines - wrappedLines.length : 0,
        );
        wrappedLines.push(...brokenWord.slice(0, -1));
        currentLine = brokenWord[brokenWord.length - 1] || '';
        currentLineWidth = measureText(
          currentLine,
          fontFamily,
          fontData,
          designLetterSpacing,
        );
      }
    }
  }

  // Add the last line if it has content
  if (currentLine.length > 0) {
    const isLastAllowedLine =
      remainingLines > 0 && wrappedLines.length >= remainingLines - 1;
    if (isLastAllowedLine && overflowSuffix) {
      currentLine = truncateLineWithSuffix(
        currentLine,
        fontFamily,
        fontData,
        fontScale,
        maxWidth,
        designLetterSpacing,
        overflowSuffix,
      );
    }
    wrappedLines.push(currentLine);
  }

  return wrappedLines;
};

/**
 * Measure the width of text in SDF design units
 */
export const measureText = (
  text: string,
  fontFamily: string,
  fontData: SdfFontHandler.SdfFontData,
  designLetterSpacing: number,
): number => {
  let width = 0;
  let prevCodepoint = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text.charAt(i);
    const codepoint = text.codePointAt(i);
    if (codepoint === undefined) continue;

    // Skip zero-width spaces in width calculations
    if (isZeroWidthSpace(char)) {
      continue;
    }

    const glyph = SdfFontHandler.getGlyph(fontFamily, codepoint);
    if (glyph === null) continue;

    let advance = glyph.xadvance;

    // Add kerning if there's a previous character
    if (prevCodepoint !== 0) {
      const kerning = SdfFontHandler.getKerning(
        fontFamily,
        prevCodepoint,
        codepoint,
      );
      advance += kerning;
    }

    width += advance + designLetterSpacing;
    prevCodepoint = codepoint;
  }

  return width;
};

/**
 * Truncate a line with overflow suffix to fit within width
 */
export const truncateLineWithSuffix = (
  line: string,
  fontFamily: string,
  fontData: SdfFontHandler.SdfFontData,
  fontScale: number,
  maxWidth: number,
  designLetterSpacing: number,
  overflowSuffix: string,
): string => {
  const maxWidthInDesignUnits = maxWidth / fontScale;
  const suffixWidth = measureText(
    overflowSuffix,
    fontFamily,
    fontData,
    designLetterSpacing,
  );

  if (suffixWidth >= maxWidthInDesignUnits) {
    return overflowSuffix.substring(0, Math.max(1, overflowSuffix.length - 1));
  }

  let truncatedLine = line;
  while (truncatedLine.length > 0) {
    const lineWidth = measureText(
      truncatedLine,
      fontFamily,
      fontData,
      designLetterSpacing,
    );
    if (lineWidth + suffixWidth <= maxWidthInDesignUnits) {
      return truncatedLine + overflowSuffix;
    }
    truncatedLine = truncatedLine.substring(0, truncatedLine.length - 1);
  }

  return overflowSuffix;
};

/**
 * Break a long word that doesn't fit on a single line
 */
export const breakLongWord = (
  word: string,
  fontFamily: string,
  fontData: SdfFontHandler.SdfFontData,
  fontScale: number,
  maxWidth: number,
  designLetterSpacing: number,
  overflowSuffix: string,
  remainingLines: number,
): string[] => {
  const maxWidthInDesignUnits = maxWidth / fontScale;
  const lines: string[] = [];
  let currentPart = '';
  let currentWidth = 0;

  for (let i = 0; i < word.length; i++) {
    const char = word.charAt(i);
    const codepoint = char.codePointAt(0);
    if (codepoint === undefined) continue;

    const glyph = SdfFontHandler.getGlyph(fontFamily, codepoint);
    if (glyph === null) continue;

    const charWidth = glyph.xadvance + designLetterSpacing;

    if (
      currentWidth + charWidth > maxWidthInDesignUnits &&
      currentPart.length > 0
    ) {
      // Check if this is the last allowed line
      const isLastAllowedLine =
        remainingLines > 0 && lines.length >= remainingLines - 1;
      if (isLastAllowedLine && overflowSuffix) {
        // Truncate and add suffix
        currentPart = truncateLineWithSuffix(
          currentPart,
          fontFamily,
          fontData,
          fontScale,
          maxWidth,
          designLetterSpacing,
          overflowSuffix,
        );
        lines.push(currentPart);
        return lines;
      }

      lines.push(currentPart);
      currentPart = char;
      currentWidth = charWidth;
    } else {
      currentPart += char;
      currentWidth += charWidth;
    }
  }

  if (currentPart.length > 0) {
    lines.push(currentPart);
  }

  return lines;
};
