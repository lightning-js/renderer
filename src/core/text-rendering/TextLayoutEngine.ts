import type {
  FontMetrics,
  MeasureTextFn,
  NormalizedFontMetrics,
  TextLayoutStruct,
  TextLineStruct,
  WrappedLinesStruct,
} from './TextRenderer.js';

// Use the same space regex as Canvas renderer to handle ZWSP
const spaceRegex = /[ \u200B]+/g;

export const defaultFontMetrics: FontMetrics = {
  ascender: 800,
  descender: -200,
  lineGap: 200,
  unitsPerEm: 1000,
};

type WrapStrategyFn = (
  measureText: MeasureTextFn,
  word: string,
  wordWidth: number,
  fontFamily: string,
  letterSpacing: number,
  wrappedLines: TextLineStruct[],
  currentLine: string,
  currentLineWidth: number,
  remainingLines: number,
  remainingWord: string,
  maxWidth: number,
  space: string,
  spaceWidth: number,
  overflowSuffix: string,
  overflowWidth: number,
) => [string, number, string];

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
  //trim start/end whitespace
  // text = text.trim();
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
          effectiveMaxLines,
        )
      : measureLines(
          measureText,
          text.split('\n'),
          fontFamily,
          letterSpacing,
          effectiveMaxLines,
        );

  let effectiveLineAmount = lines.length;
  let effectiveMaxWidth = 0;

  if (effectiveLineAmount > 0) {
    effectiveMaxWidth = lines[0]![1];
    //check for longest line
    if (effectiveLineAmount > 1) {
      for (let i = 1; i < effectiveLineAmount; i++) {
        effectiveMaxWidth = Math.max(effectiveMaxWidth, lines[i]![1]);
      }
    }
  }

  //update line x offsets
  if (textAlign !== 'left') {
    for (let i = 0; i < effectiveLineAmount; i++) {
      const line = lines[i]!;
      const w = line[1];
      line[3] =
        textAlign === 'right'
          ? effectiveMaxWidth - w
          : (effectiveMaxWidth - w) / 2;
    }
  }

  const effectiveMaxHeight = effectiveLineAmount * lineHeightPx;

  let firstBaseLine = halfDelta;

  const startY = firstBaseLine;
  for (let i = 0; i < effectiveLineAmount; i++) {
    const line = lines[i] as TextLineStruct;
    line[4] = startY + lineHeightPx * i;
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
    measuredLines.push([line, width, false, 0, 0]);
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
  const overflowWidth = measureText(overflowSuffix, fontFamily, letterSpacing);

  let wrappedLine: TextLineStruct[] = [];
  let remainingLines = maxLines > 0 ? maxLines : 1000;
  let hasRemainingText = true;
  let hasMaxLines = maxLines > 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) {
      continue;
    }

    [wrappedLine, remainingLines, hasRemainingText] =
      line.length > 0
        ? wrapLine(
            measureText,
            line,
            fontFamily,
            maxWidth,
            letterSpacing,
            spaceWidth,
            overflowSuffix,
            overflowWidth,
            wordBreak,
            remainingLines,
          )
        : [[['', 0, false, 0, 0]], remainingLines, i < lines.length - 1];

    remainingLines--;
    wrappedLines.push(...wrappedLine);

    if (hasMaxLines === true && remainingLines <= 0) {
      const lastLine = wrappedLines[wrappedLines.length - 1]!;
      if (i < lines.length - 1) {
        //check if line is truncated already
        if (lastLine[2] === false) {
          let remainingText = '';
          const [line, lineWidth] = truncateLineEnd(
            measureText,
            fontFamily,
            letterSpacing,
            lastLine[0],
            lastLine[1],
            remainingText,
            maxWidth,
            overflowSuffix,
            overflowWidth,
          );
          lastLine[0] = line;
          lastLine[1] = lineWidth;
          lastLine[2] = true;
        }
      }
      break;
    }
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
  overflowWidth: number,
  wordBreak: string,
  remainingLines: number,
): WrappedLinesStruct => {
  const words = line.split(spaceRegex);
  const spaces = line.match(spaceRegex) || [];
  const wrappedLines: TextLineStruct[] = [];
  let currentLine = '';
  let currentLineWidth = 0;
  let hasRemainingText = true;

  const wrapFn = getWrapStrategy(wordBreak);
  while (words.length > 0 && remainingLines > 0) {
    let word = words.shift()!;
    let wordWidth = measureText(word, fontFamily, letterSpacing);
    let remainingWord = '';

    //handle first word of new line separately to avoid empty line issues
    if (currentLineWidth === 0) {
      // Word doesn't fit on current line
      //if first word doesn't fit on empty line
      if (wordWidth > maxWidth) {
        remainingLines--;
        //truncate word to fit
        [word, remainingWord, wordWidth] =
          remainingLines === 0
            ? truncateWord(
                measureText,
                word,
                wordWidth,
                maxWidth,
                fontFamily,
                letterSpacing,
                overflowSuffix,
                overflowWidth,
              )
            : splitWord(
                measureText,
                word,
                wordWidth,
                maxWidth,
                fontFamily,
                letterSpacing,
              );

        if (remainingWord.length > 0) {
          words.unshift(remainingWord);
        }
        // first word doesn't fit on an empty line
        wrappedLines.push([word, wordWidth, false, 0, 0]);
      } else if (wordWidth + spaceWidth >= maxWidth) {
        remainingLines--;
        // word with space doesn't fit, but word itself fits - put on new line
        wrappedLines.push([word, wordWidth, false, 0, 0]);
      } else {
        currentLine = word;
        currentLineWidth = wordWidth;
      }
      continue;
    }
    const space = spaces.shift() || '';
    // For width calculation, treat ZWSP as having 0 width but regular space functionality
    const effectiveSpaceWidth = space === '\u200B' ? 0 : spaceWidth;
    const totalWidth = currentLineWidth + effectiveSpaceWidth + wordWidth;

    if (totalWidth < maxWidth) {
      currentLine += effectiveSpaceWidth > 0 ? space + word : word;
      currentLineWidth = totalWidth;
      continue;
    }
    // Will move to next line after loop finishes
    remainingLines--;

    if (totalWidth === maxWidth) {
      currentLine += effectiveSpaceWidth > 0 ? space + word : word;
      currentLineWidth = totalWidth;
      wrappedLines.push([currentLine, currentLineWidth, false, 0, 0]);
      currentLine = '';
      currentLineWidth = 0;
      continue;
    }

    [currentLine, currentLineWidth, remainingWord] = wrapFn(
      measureText,
      word,
      wordWidth,
      fontFamily,
      letterSpacing,
      wrappedLines,
      currentLine,
      currentLineWidth,
      remainingLines,
      remainingWord,
      maxWidth,
      space,
      spaceWidth,
      overflowSuffix,
      overflowWidth,
    );

    if (remainingWord.length > 0) {
      words.unshift(remainingWord);
    }
  }

  if (currentLineWidth > 0 && remainingLines > 0) {
    wrappedLines.push([currentLine, currentLineWidth, false, 0, 0]);
  }

  return [wrappedLines, remainingLines, hasRemainingText];
};

const getWrapStrategy = (wordBreak: string): WrapStrategyFn => {
  //** default so probably first out */
  if (wordBreak === 'break-word') {
    return breakWord;
  }
  //** second most used */
  if (wordBreak === 'break-all') {
    return breakAll;
  }
  //** most similar to html/CSS 'normal' not really used in TV apps */
  if (wordBreak === 'overflow') {
    return overflow;
  }
  //fallback
  return breakWord;
};

//break strategies

/**
 * Overflow wordBreak strategy, if a word partially fits add it to the line, start new line if necessary or add overflowSuffix.
 *
 * @remarks This strategy is similar to 'normal' in html/CSS. However
 */
export const overflow = (
  measureText: MeasureTextFn,
  word: string,
  wordWidth: number,
  fontFamily: string,
  letterSpacing: number,
  wrappedLines: TextLineStruct[],
  currentLine: string,
  currentLineWidth: number,
  remainingLines: number,
  remainingWord: string,
  maxWidth: number,
  space: string,
  spaceWidth: number,
  overflowSuffix: string,
  overflowWidth: number,
): [string, number, string] => {
  currentLine += space + word;
  currentLineWidth += spaceWidth + wordWidth;

  if (remainingLines === 0) {
    currentLine += overflowSuffix;
    currentLineWidth += overflowWidth;
  }

  wrappedLines.push([currentLine, currentLineWidth, true, 0, 0]);
  return ['', 0, ''];
};

export const breakWord = (
  measureText: MeasureTextFn,
  word: string,
  wordWidth: number,
  fontFamily: string,
  letterSpacing: number,
  wrappedLines: TextLineStruct[],
  currentLine: string,
  currentLineWidth: number,
  remainingLines: number,
  remainingWord: string,
  maxWidth: number,
  space: string,
  spaceWidth: number,
  overflowSuffix: string,
  overflowWidth: number,
): [string, number, string] => {
  remainingWord = word;
  if (remainingLines === 0) {
    if (currentLineWidth + overflowWidth > maxWidth) {
      console.log('truncating line end');
      [currentLine, currentLineWidth, remainingWord] = truncateLineEnd(
        measureText,
        fontFamily,
        letterSpacing,
        currentLine,
        currentLineWidth,
        remainingWord,
        maxWidth,
        overflowSuffix,
        overflowWidth,
      );
    }
    wrappedLines.push([currentLine, currentLineWidth, true, 0, 0]);
  } else {
    wrappedLines.push([currentLine, currentLineWidth, false, 0, 0]);
    currentLine = '';
    currentLineWidth = 0;
  }
  return [currentLine, currentLineWidth, remainingWord];
};

export const breakAll = (
  measureText: MeasureTextFn,
  word: string,
  wordWidth: number,
  fontFamily: string,
  letterSpacing: number,
  wrappedLines: TextLineStruct[],
  currentLine: string,
  currentLineWidth: number,
  remainingLines: number,
  remainingWord: string,
  maxWidth: number,
  space: string,
  spaceWidth: number,
  overflowSuffix: string,
  overflowWidth: number,
): [string, number, string] => {
  let remainingSpace = maxWidth - currentLineWidth;
  if (currentLineWidth > 0) {
    remainingSpace -= spaceWidth;
  }
  const truncate = remainingLines === 0;
  [word, remainingWord, wordWidth] = truncate
    ? truncateWord(
        measureText,
        word,
        wordWidth,
        remainingSpace,
        fontFamily,
        letterSpacing,
        overflowSuffix,
        overflowWidth,
      )
    : splitWord(
        measureText,
        word,
        wordWidth,
        remainingSpace,
        fontFamily,
        letterSpacing,
      );
  currentLine += space + word;
  currentLineWidth += spaceWidth + wordWidth;

  // first word doesn't fit on an empty line
  wrappedLines.push([currentLine, currentLineWidth, truncate, 0, 0]);

  currentLine = '';
  currentLineWidth = 0;

  return [currentLine, currentLineWidth, remainingWord];
};

export const truncateLineEnd = (
  measureText: MeasureTextFn,
  fontFamily: string,
  letterSpacing: number,
  currentLine: string,
  currentLineWidth: number,
  remainingWord: string,
  maxWidth: number,
  overflowSuffix: string,
  overflowWidth: number,
): [string, number, string] => {
  let truncated = false;
  for (let i = currentLine.length - 1; i > 0; i--) {
    const char = currentLine.charAt(i);
    const charWidth = measureText(char, fontFamily, letterSpacing);
    currentLineWidth -= charWidth;
    if (currentLineWidth + overflowWidth <= maxWidth) {
      currentLine = currentLine.substring(0, i) + overflowSuffix;
      currentLineWidth += overflowWidth;
      remainingWord = currentLine.substring(i) + ' ' + remainingWord;
      truncated = true;
      break;
    }
  }

  if (truncated === false) {
    currentLine = overflowSuffix;
    currentLineWidth = overflowWidth;
    remainingWord = currentLine;
  }
  return [currentLine, currentLineWidth, remainingWord];
};

export const truncateWord = (
  measureText: MeasureTextFn,
  word: string,
  wordWidth: number,
  maxWidth: number,
  fontFamily: string,
  letterSpacing: number,
  overflowSuffix: string,
  overflowWidth: number,
): [string, string, number] => {
  const targetWidth = maxWidth - overflowWidth;

  if (targetWidth <= 0) {
    return ['', word, 0];
  }

  const excessWidth = wordWidth - targetWidth;
  // If excess is small (< 50%), we're keeping most - start from back and remove
  // If excess is large (>= 50%), we're removing most - start from front and add
  const shouldStartFromBack = excessWidth < wordWidth / 2;

  if (shouldStartFromBack === false) {
    // Start from back - remove characters until it fits (keeping most of word)
    let currentWidth = wordWidth;
    for (let i = word.length - 1; i > 0; i--) {
      const char = word.charAt(i);
      const charWidth = measureText(char, fontFamily, letterSpacing);
      currentWidth -= charWidth;
      if (currentWidth <= targetWidth) {
        const remainingWord = word.substring(i);
        return [
          word.substring(0, i) + overflowSuffix,
          remainingWord,
          currentWidth + overflowWidth,
        ];
      }
    }
    // Even first character doesn't fit
    return [overflowSuffix, word, overflowWidth];
  }

  // Start from front - add characters until we exceed limit (removing most of word)
  let currentWidth = 0;
  for (let i = 0; i < word.length; i++) {
    const char = word.charAt(i);
    const charWidth = measureText(char, fontFamily, letterSpacing);
    if (currentWidth + charWidth > targetWidth) {
      const remainingWord = word.substring(i);
      return [
        word.substring(0, i) + overflowSuffix,
        remainingWord,
        currentWidth + overflowWidth,
      ];
    }
    currentWidth += charWidth;
  }
  // Entire word fits (shouldn't happen, but safe fallback)
  return [word + overflowSuffix, '', wordWidth + overflowWidth];
};

export const splitWord = (
  measureText: MeasureTextFn,
  word: string,
  wordWidth: number,
  maxWidth: number,
  fontFamily: string,
  letterSpacing: number,
): [string, string, number] => {
  if (maxWidth <= 0) {
    return ['', word, 0];
  }

  const excessWidth = wordWidth - maxWidth;
  // If excess is small (< 50%), we're keeping most - start from back and remove
  // If excess is large (>= 50%), we're removing most - start from front and add
  const shouldStartFromBack = excessWidth < wordWidth / 2;

  if (shouldStartFromBack === false) {
    // Start from back - remove characters until it fits (keeping most of word)
    let currentWidth = wordWidth;
    for (let i = word.length - 1; i > 0; i--) {
      const char = word.charAt(i);
      const charWidth = measureText(char, fontFamily, letterSpacing);
      currentWidth -= charWidth;
      if (currentWidth <= maxWidth) {
        const remainingWord = word.substring(i);
        return [word.substring(0, i), remainingWord, currentWidth];
      }
    }
    // Even first character doesn't fit
    return ['', word, 0];
  }

  // Start from front - add characters until we exceed limit (removing most of word)
  let currentWidth = 0;
  for (let i = 0; i < word.length; i++) {
    const char = word.charAt(i);
    const charWidth = measureText(char, fontFamily, letterSpacing);
    if (currentWidth + charWidth > maxWidth) {
      const remainingWord = word.substring(i);
      return [word.substring(0, i), remainingWord, currentWidth];
    }
    currentWidth += charWidth;
  }
  // Entire word fits (shouldn't happen, but safe fallback)
  return [word, '', wordWidth];
};
