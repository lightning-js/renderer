import type {
  FontMetrics,
  MeasureTextFn,
  NormalizedFontMetrics,
  TextLayoutStruct,
  TextLineStruct,
  WrappedLinesStruct,
} from './TextRenderer.js';

export const defaultFontMetrics: FontMetrics = {
  ascender: 800,
  descender: -200,
  lineGap: 200,
  unitsPerEm: 1000,
};

export const normalizeFontMetrics = (
  metrics: FontMetrics,
  fontSize: number,
): NormalizedFontMetrics => {
  const scale = fontSize / metrics.unitsPerEm;
  return {
    ascender: metrics.ascender * scale,
    descender: metrics.descender * scale,
    lineGap: metrics.lineGap * scale,
  };
};

export const mapTextLayout = (
  measureText: MeasureTextFn,
  metrics: NormalizedFontMetrics,
  text: string,
  textAlign: string,
  verticalAlign: string,
  fontFamily: string,
  lineHeight: number,
  overflowSuffix: string,
  wordBreak: string,
  letterSpacing: number,
  maxLines: number,
  maxWidth: number,
  maxHeight: number,
): TextLayoutStruct => {
  const ascPx = metrics.ascender;
  const descPx = metrics.descender;

  const bareLineHeight = ascPx - descPx;
  const lineHeightPx =
    lineHeight <= 3 ? lineHeight * bareLineHeight : lineHeight;
  const lineHeightDelta = lineHeightPx - bareLineHeight;
  const halfDelta = lineHeightDelta * 0.5;

  let effectiveMaxLines = maxLines;
  if (maxHeight > 0) {
    const maxFromHeight = Math.floor(maxHeight / lineHeightPx);
    if (effectiveMaxLines === 0 || maxFromHeight < effectiveMaxLines) {
      effectiveMaxLines = maxFromHeight;
    }
  }

  const wrappedText = maxWidth > 0;
  //wrapText or just measureLines based on maxWidth
  const [lines, remainingLines, remainingText] =
    wrappedText === true
      ? wrapText(
          measureText,
          text,
          fontFamily,
          maxWidth,
          letterSpacing,
          overflowSuffix,
          wordBreak,
          maxLines,
        )
      : measureLines(
          measureText,
          text.split('\n'),
          fontFamily,
          letterSpacing,
          maxLines,
        );

  let effectiveLineAmount = lines.length;
  let effectiveMaxWidth = lines[0]![1];

  //check for longest line
  if (effectiveLineAmount > 1) {
    for (let i = 1; i < effectiveLineAmount; i++) {
      effectiveMaxWidth = Math.max(effectiveMaxWidth, lines[i]![1]);
    }
  }

  //update line x offsets
  if (textAlign !== 'left') {
    const maxW = wrappedText === true ? maxWidth : effectiveMaxWidth;
    for (let i = 0; i < effectiveLineAmount; i++) {
      const line = lines[i]!;
      const w = line[1];
      line[2] = textAlign === 'right' ? maxW - w : (maxW - w) / 2;
    }
  }

  const effectiveMaxHeight = effectiveLineAmount * lineHeightPx;

  let firstBaseLine = halfDelta;
  if (maxHeight > 0 && verticalAlign !== 'top') {
    if (verticalAlign === 'middle') {
      firstBaseLine += (maxHeight - effectiveMaxHeight) / 2;
    } else {
      firstBaseLine += maxHeight - effectiveMaxHeight;
    }
  }

  const startY = firstBaseLine;
  for (let i = 0; i < effectiveLineAmount; i++) {
    const line = lines[i] as TextLineStruct;
    line[3] = startY + lineHeightPx * i;
  }

  return [
    lines,
    remainingLines,
    remainingText,
    bareLineHeight,
    lineHeightPx,
    effectiveMaxWidth,
    effectiveMaxHeight,
  ];
};

export const measureLines = (
  measureText: MeasureTextFn,
  lines: string[],
  fontFamily: string,
  letterSpacing: number,
  maxLines: number,
): WrappedLinesStruct => {
  const measuredLines: TextLineStruct[] = [];
  let remainingLines = maxLines > 0 ? maxLines : lines.length;
  let i = 0;

  while (remainingLines > 0) {
    const line = lines[i];
    i++;
    remainingLines--;
    if (line === undefined) {
      continue;
    }
    const width = measureText(line, fontFamily, letterSpacing);
    measuredLines.push([line, width, 0, 0]);
  }

  return [
    measuredLines,
    remainingLines,
    maxLines > 0 ? lines.length - measuredLines.length > 0 : false,
  ];
};

export const wrapText = (
  measureText: MeasureTextFn,
  text: string,
  fontFamily: string,
  maxWidth: number,
  letterSpacing: number,
  overflowSuffix: string,
  wordBreak: string,
  maxLines: number,
): WrappedLinesStruct => {
  const lines = text.split('\n');
  const wrappedLines: TextLineStruct[] = [];

  // Calculate space width for line wrapping
  const spaceWidth = measureText(' ', fontFamily, letterSpacing);

  let wrappedLine: TextLineStruct[] = [];
  let remainingLines = maxLines;
  let hasRemainingText = true;
  let hasMaxLines = maxLines > 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    [wrappedLine, remainingLines, hasRemainingText] = wrapLine(
      measureText,
      line,
      fontFamily,
      maxWidth,
      letterSpacing,
      spaceWidth,
      overflowSuffix,
      wordBreak,
      remainingLines,
      hasMaxLines,
    );

    wrappedLines.push(...wrappedLine);
  }

  return [wrappedLines, remainingLines, hasRemainingText];
};

export const wrapLine = (
  measureText: MeasureTextFn,
  line: string,
  fontFamily: string,
  maxWidth: number,
  letterSpacing: number,
  spaceWidth: number,
  overflowSuffix: string,
  wordBreak: string,
  remainingLines: number,
  hasMaxLines: boolean,
): WrappedLinesStruct => {
  // Use the same space regex as Canvas renderer to handle ZWSP
  const spaceRegex = / |\u200B/g;
  const words = line.split(spaceRegex);
  const spaces = line.match(spaceRegex) || [];
  const wrappedLines: TextLineStruct[] = [];
  let currentLine = '';
  let currentLineWidth = 0;
  let hasRemainingText = true;

  let i = 0;

  for (; i < words.length; i++) {
    const word = words[i];
    if (word === undefined) {
      continue;
    }
    const space = spaces[i - 1] || '';
    const wordWidth = measureText(word, fontFamily, letterSpacing);
    // For width calculation, treat ZWSP as having 0 width but regular space functionality
    const effectiveSpaceWidth = space === '\u200B' ? 0 : spaceWidth;
    const totalWidth = currentLineWidth + effectiveSpaceWidth + wordWidth;

    if (
      (i === 0 && wordWidth <= maxWidth) ||
      (i > 0 && totalWidth <= maxWidth)
    ) {
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
      if (remainingLines === 1) {
        if (currentLine.length > 0) {
          // Add space - for ZWSP, don't add anything to output (it's invisible)
          if (space !== '\u200B') {
            currentLine += space;
            currentLineWidth += effectiveSpaceWidth;
          }
        }
        currentLine += word;
        currentLineWidth += wordWidth;
        remainingLines = 0;
        hasRemainingText = i < words.length;
        break;
      }

      if (wordBreak !== 'break-all' && currentLine.length > 0) {
        wrappedLines.push([currentLine, currentLineWidth, 0, 0]);
        currentLine = '';
        currentLineWidth = 0;
        remainingLines--;
      }

      if (wordBreak !== 'break-all') {
        currentLine = word;
        currentLineWidth = wordWidth;
      }

      if (wordBreak === 'break-word') {
        const [lines, rl, rt] = breakWord(
          measureText,
          word,
          fontFamily,
          maxWidth,
          letterSpacing,
          remainingLines,
        );
        remainingLines = rl;
        hasRemainingText = rt;
        if (lines.length === 1) {
          [currentLine, currentLineWidth] = lines[lines.length - 1]!;
        } else {
          for (let j = 0; j < lines.length; j++) {
            [currentLine, currentLineWidth] = lines[j]!;
            if (j < lines.length - 1) {
              wrappedLines.push(lines[j]!);
            }
          }
        }
      } else if (wordBreak === 'break-all') {
        const firstLetterWidth = measureText(
          word.charAt(0),
          fontFamily,
          letterSpacing,
        );
        let linebreak = false;
        if (
          currentLineWidth + firstLetterWidth + effectiveSpaceWidth >
          maxWidth
        ) {
          wrappedLines.push([currentLine, currentLineWidth, 0, 0]);
          remainingLines -= 1;
          currentLine = '';
          currentLineWidth = 0;
          linebreak = true;
        }
        const initial = maxWidth - currentLineWidth;
        const [lines, rl, rt] = breakAll(
          measureText,
          word,
          fontFamily,
          initial,
          maxWidth,
          letterSpacing,
          remainingLines,
        );
        remainingLines = rl;
        hasRemainingText = rt;
        if (linebreak === false) {
          const [text, width] = lines[0]!;
          currentLine += ' ' + text;
          currentLineWidth = width;
          wrappedLines.push([currentLine, currentLineWidth, 0, 0]);
        }

        for (let j = 1; j < lines.length; j++) {
          [currentLine, currentLineWidth] = lines[j]!;
          if (j < lines.length - 1) {
            wrappedLines.push([currentLine, currentLineWidth, 0, 0]);
          }
        }
      }
    }
  }

  // Add the last line if it has content
  if (currentLine.length > 0 && hasMaxLines === true && remainingLines === 0) {
    currentLine = truncateLineWithSuffix(
      measureText,
      currentLine,
      fontFamily,
      maxWidth,
      letterSpacing,
      overflowSuffix,
    );
  }

  if (currentLine.length > 0) {
    wrappedLines.push([currentLine, currentLineWidth, 0, 0]);
  } else {
    wrappedLines.push(['', 0, 0, 0]);
  }
  return [wrappedLines, remainingLines, hasRemainingText];
};

/**
 * Truncate a line with overflow suffix to fit within width
 */
export const truncateLineWithSuffix = (
  measureText: MeasureTextFn,
  line: string,
  fontFamily: string,
  maxWidth: number,
  letterSpacing: number,
  overflowSuffix: string,
): string => {
  const suffixWidth = measureText(overflowSuffix, fontFamily, letterSpacing);

  if (suffixWidth >= maxWidth) {
    return overflowSuffix.substring(0, Math.max(1, overflowSuffix.length - 1));
  }

  let truncatedLine = line;
  while (truncatedLine.length > 0) {
    const lineWidth = measureText(truncatedLine, fontFamily, letterSpacing);
    if (lineWidth + suffixWidth <= maxWidth) {
      return truncatedLine + overflowSuffix;
    }
    truncatedLine = truncatedLine.substring(0, truncatedLine.length - 1);
  }

  return overflowSuffix;
};

/**
 * wordbreak function: https://developer.mozilla.org/en-US/docs/Web/CSS/word-break#break-word
 */
export const breakWord = (
  measureText: MeasureTextFn,
  word: string,
  fontFamily: string,
  maxWidth: number,
  letterSpacing: number,
  remainingLines: number,
): WrappedLinesStruct => {
  const lines: TextLineStruct[] = [];
  let currentPart = '';
  let currentWidth = 0;
  let i = 0;

  for (let i = 0; i < word.length; i++) {
    const char = word.charAt(i);
    const codepoint = char.codePointAt(0);
    if (codepoint === undefined) continue;

    const charWidth = measureText(char, fontFamily, letterSpacing);

    if (currentWidth + charWidth > maxWidth && currentPart.length > 0) {
      remainingLines--;
      if (remainingLines === 0) {
        break;
      }
      lines.push([currentPart, currentWidth, 0, 0]);
      currentPart = char;
      currentWidth = charWidth;
    } else {
      currentPart += char;
      currentWidth += charWidth;
    }
  }

  if (currentPart.length > 0) {
    lines.push([currentPart, currentWidth, 0, 0]);
  }

  return [lines, remainingLines, i < word.length - 1];
};

/**
 * wordbreak function: https://developer.mozilla.org/en-US/docs/Web/CSS/word-break#break-word
 */
export const breakAll = (
  measureText: MeasureTextFn,
  word: string,
  fontFamily: string,
  initial: number,
  maxWidth: number,
  letterSpacing: number,
  remainingLines: number,
): WrappedLinesStruct => {
  const lines: TextLineStruct[] = [];
  let currentPart = '';
  let currentWidth = 0;
  let max = initial;
  let i = 0;
  let hasRemainingText = false;

  for (; i < word.length; i++) {
    if (remainingLines === 0) {
      hasRemainingText = true;
      break;
    }
    const char = word.charAt(i);
    const charWidth = measureText(char, fontFamily, letterSpacing);
    if (currentWidth + charWidth > max && currentPart.length > 0) {
      lines.push([currentPart, currentWidth, 0, 0]);
      currentPart = char;
      currentWidth = charWidth;
      max = maxWidth;
      remainingLines--;
    } else {
      currentPart += char;
      currentWidth += charWidth;
    }
  }

  if (currentPart.length > 0) {
    lines.push([currentPart, currentWidth, 0, 0]);
  }

  return [lines, remainingLines, hasRemainingText];
};
