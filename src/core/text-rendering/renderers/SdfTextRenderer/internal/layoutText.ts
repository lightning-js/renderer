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

/**
 * Outer generator yields a generator for each word.
 * Inner generator yields each letter in the word.
 */

import { assertTruthy } from '../../../../../utils.js';
import type { Bound } from '../../../../lib/utils.js';
import type {
  FontShaperProps,
  MappedGlyphInfo,
  UnmappedCharacterInfo,
} from '../../../font-face-types/SdfTrFontFace/internal/FontShaper.js';
import type { TrProps, TextRendererState } from '../../TextRenderer.js';
import type { SdfTextRendererState } from '../SdfTextRenderer.js';
import { PeekableIterator } from './PeekableGenerator.js';
import { getUnicodeCodepoints } from './getUnicodeCodepoints.js';
import { measureText } from './measureText.js';
import { getOrderedText } from './getOrderedText.js';

class LayoutState {
  // public nextWordFits: boolean = true;
  public previousIsSpace: boolean = false;
  public bufferOffset: number = 0;
  public currentWord: number = 0;
  public cluster: number = 0;
  maxX: number = 0;
  maxY: number = 0;
  public curLineBufferStart: number = -1;
  private _curX: number;
  private previousX: number;
  public curY: number;
  private _curLineIndex: number;
  private _trFontFace: SdfTextRendererState['trFontFace'];
  private _rwSdf: Bound;
  public bufferLineInfos: {
    bufferStart: number;
    bufferEnd: number;
  }[] = [];
  private maxLines: number;
  private contain: string;
  private scrollable: boolean;
  private vertexLineHeight: number;
  private vertexTruncateHeight: number;

  constructor(
    curX: number,
    curY: number,
    curLineIndex: number,
    trFontFace: SdfTextRendererState['trFontFace'],
    rwSdf: Bound,
    maxLines: number,
    contain: TrProps['contain'],
    scrollable: TrProps['scrollable'],
    vertexLineHeight: number,
    vertexTruncateHeight: number,
  ) {
    this._curX = curX;
    this.previousX = curX;
    this.curY = curY;
    this._curLineIndex = curLineIndex;
    this._trFontFace = trFontFace as SdfTextRendererState['trFontFace'];
    this._rwSdf = rwSdf;
    this.maxLines = maxLines;
    this.contain = contain;
    this.scrollable = scrollable;
    this.vertexLineHeight = vertexLineHeight;
    this.vertexTruncateHeight = vertexTruncateHeight;
    if (this._trFontFace === undefined) {
      throw new Error('trFontFace is undefined');
    }
  }

  get nextLineWillFit() {
    return (
      (this.maxLines === 0 || this.curLineIndex + 1 < this.maxLines) &&
      (this.contain !== 'both' ||
        this.scrollable ||
        this.curY + this.vertexLineHeight + this._trFontFace!.maxCharHeight <=
          this.vertexTruncateHeight)
    );
  }

  get curX() {
    return this._curX;
  }

  set curX(value: number) {
    this.previousX = this._curX;
    this._curX = value;
  }

  get nextWordFits() {
    return false;
  }

  get curLineIndex() {
    return this._curLineIndex;
  }

  set curLineIndex(value: number) {
    this._curLineIndex = value;
  }

  // Getter for lineIsBelowWindowTop
  get lineIsBelowWindowTop(): boolean {
    return this.curY + this._trFontFace!.maxCharHeight >= this._rwSdf.y1;
  }

  // Getter for lineIsAboveWindowBottom
  get lineIsAboveWindowBottom(): boolean {
    return this.curY <= this._rwSdf.y2;
  }

  // Getter for lineIsWithinWindow
  get lineIsWithinWindow(): boolean {
    return this.lineIsBelowWindowTop && this.lineIsAboveWindowBottom;
  }

  moveToNextLine(
    vertexLineHeight: number,
    workingOnWord: boolean = false,
  ): void {
    this.addLineToBuffer();

    this.curX = 0;
    this.curY += vertexLineHeight;
    this.curLineIndex++;
    this.currentWord = workingOnWord ? 1 : 0;
    this.previousIsSpace = false;
  }

  addSpace(width: number = 0, hasNextWord): void {
    if (this.currentWord !== 0) {
      this.previousIsSpace = true;
      this.previousX = this.curX;
      this.curX += width;
      if (hasNextWord === false) this.maxX = Math.max(this.maxX, this.curX);
    }
  }

  addLineToBuffer(): void {
    if (this.curLineBufferStart !== -1) {
      this.bufferLineInfos.push({
        bufferStart: this.curLineBufferStart,
        bufferEnd: this.bufferOffset,
      });
      this.curLineBufferStart = -1;
    }
  }

  addSuffixToBuffer(
    words: Generator<
      {
        letters:
          | Generator<MappedGlyphInfo, void, unknown>
          | UnmappedCharacterInfo
          | null;
        width: number;
        isLineBreak?: boolean;
      },
      void,
      unknown
    >,
    vertexBuffer: NonNullable<SdfTextRendererState['vertexBuffer']>,
    revertSpace: boolean = false,
  ): void {
    let glyphResult:
      | IteratorResult<MappedGlyphInfo | UnmappedCharacterInfo, void>
      | undefined;
    const letters = words.next();
    if (!revertSpace && this.previousIsSpace) this.curX = this.previousX;

    if (letters && letters.done === false) {
      const glyphs = letters.value.letters;
      if (glyphs && 'next' in glyphs && typeof glyphs.next === 'function') {
        while ((glyphResult = glyphs.next()) && !glyphResult.done) {
          const glyph = glyphResult.value;
          if (glyph.mapped) {
            this.addGlyphToBuffer(glyph, vertexBuffer);
          }
        }
      }
    }
    this.addLineToBuffer();
  }

  addGlyphToBuffer(
    glyph: MappedGlyphInfo,
    vertexBuffer: NonNullable<SdfTextRendererState['vertexBuffer']>,
  ): void {
    const quadX = this.curX + glyph.xOffset;
    const quadY = this.curY + glyph.yOffset;

    if (
      this.lineIsWithinWindow &&
      this._trFontFace !== undefined &&
      this._trFontFace.data !== undefined
    ) {
      if (this.curLineBufferStart === -1) {
        this.curLineBufferStart = this.bufferOffset;
      }
      this.cluster = glyph.cluster;
      const atlasEntry = this._trFontFace.getAtlasEntry(glyph.glyphId);

      const u = atlasEntry.x / this._trFontFace.data.common.scaleW;
      const v = atlasEntry.y / this._trFontFace.data.common.scaleH;
      const uvWidth = atlasEntry.width / this._trFontFace.data.common.scaleW;
      const uvHeight = atlasEntry.height / this._trFontFace.data.common.scaleH;

      // Top-left
      vertexBuffer[this.bufferOffset++] = quadX;
      vertexBuffer[this.bufferOffset++] = quadY;
      vertexBuffer[this.bufferOffset++] = u;
      vertexBuffer[this.bufferOffset++] = v;

      // Top-right
      vertexBuffer[this.bufferOffset++] = quadX + glyph.width;
      vertexBuffer[this.bufferOffset++] = quadY;
      vertexBuffer[this.bufferOffset++] = u + uvWidth;
      vertexBuffer[this.bufferOffset++] = v;

      // Bottom-left
      vertexBuffer[this.bufferOffset++] = quadX;
      vertexBuffer[this.bufferOffset++] = quadY + glyph.height;
      vertexBuffer[this.bufferOffset++] = u;
      vertexBuffer[this.bufferOffset++] = v + uvHeight;

      // Bottom-right
      vertexBuffer[this.bufferOffset++] = quadX + glyph.width;
      vertexBuffer[this.bufferOffset++] = quadY + glyph.height;
      vertexBuffer[this.bufferOffset++] = u + uvWidth;
      vertexBuffer[this.bufferOffset++] = v + uvHeight;
    }

    this.maxY = Math.max(this.maxY, quadY + glyph.height);
    this.maxX = Math.max(this.maxX, quadX + glyph.width);
    this.curX += glyph.xAdvance;
  }
}

export function layoutText(
  curLineIndex: number,
  startX: number,
  startY: number,
  text: TrProps['text'],
  textAlign: TrProps['textAlign'],
  width: TrProps['width'],
  height: TrProps['height'],
  fontSize: TrProps['fontSize'],
  lineHeight: number,
  letterSpacing: TrProps['letterSpacing'],
  /**
   * Mutated
   */
  vertexBuffer: NonNullable<SdfTextRendererState['vertexBuffer']>,
  contain: TrProps['contain'],
  /**
   * Mutated
   */
  lineCache: SdfTextRendererState['lineCache'],
  rwSdf: Bound,
  trFontFace: SdfTextRendererState['trFontFace'],
  forceFullLayoutCalc: TextRendererState['forceFullLayoutCalc'],
  scrollable: TrProps['scrollable'],
  overflowSuffix: TrProps['overflowSuffix'],
  wordBreak: TrProps['wordBreak'],
  maxLines: TrProps['maxLines'],
  isRTL: TrProps['rtl'],
): {
  bufferNumFloats: number;
  bufferNumQuads: number;
  layoutNumCharacters: number;
  fullyProcessed: boolean;
  maxX: number;
  maxY: number;
  numLines: number;
} {
  assertTruthy(trFontFace, 'Font face must be loaded');
  assertTruthy(trFontFace.loaded, 'Font face must be loaded');
  assertTruthy(trFontFace.data, 'Font face must be loaded');
  assertTruthy(trFontFace.shaper, 'Font face must be loaded');

  // Regardless of fontSize (or other scaling properties), we layout the vertices of each glyph
  // using the fixed coordinate space determined by font size used to produce the atlas.
  // Scaling for display is handled by shader uniforms inexpensively.
  // So we have:
  //  - vertex space: the space in which the vertices of each glyph are laid out
  //  - screen space: the screen pixel space
  // Input properties such as x, y, w, fontSize, letterSpacing, etc. are all expressed in screen space.
  // We convert these to the vertex space by dividing them the `fontSizeRatio` factor.

  /**
   * See above
   */
  const fontSizeRatio = fontSize / trFontFace.data.info.size;

  /**
   * `lineHeight` in vertex coordinates
   */
  const vertexLineHeight = lineHeight / fontSizeRatio;
  const vertexTruncateHeight = height / fontSizeRatio;

  /**
   * `w` in vertex coordinates
   */
  const vertexW = width / fontSizeRatio;

  /**
   * `letterSpacing` in vertex coordinates
   */
  const vertexLSpacing = letterSpacing / fontSizeRatio;

  const startingLineCacheEntry = lineCache[curLineIndex];
  const startingCodepointIndex = startingLineCacheEntry?.codepointIndex || 0;
  const shaper = trFontFace.shaper;
  const shaperProps: FontShaperProps = {
    letterSpacing: vertexLSpacing,
  };

  // text = getOrderedText(isRTL, true, text);

  // if (isRTL === true) {
  // textAlign = 'right';
  // }

  let doneProcessing = false;

  const overflowSuffVertexWidth = measureText(
    overflowSuffix,
    shaperProps,
    shaper,
  );

  const layoutState = new LayoutState(
    startX,
    startY,
    curLineIndex,
    trFontFace,
    rwSdf,
    maxLines,
    contain,
    scrollable,
    vertexLineHeight,
    vertexTruncateHeight,
  );

  const suffix = shaper.shapeTextWithWords(shaperProps, overflowSuffix);
  const words = shaper.shapeTextWithWords(shaperProps, text);

  for (const { letters, width, isLineBreak, hasNextWord } of words) {
    const wordEndX: number = layoutState.curX + width;

    // Word wrap when current word reaches outside the contained width
    if (
      contain !== 'none' &&
      wordEndX >= vertexW &&
      wordBreak !== 'break-all'
    ) {
      if (layoutState.nextLineWillFit === true) {
        layoutState.moveToNextLine(vertexLineHeight);
      } else {
        layoutState.addSuffixToBuffer(suffix, vertexBuffer);
        doneProcessing = true;
        break;
      }
    } else if (
      contain !== 'none' &&
      wordEndX + overflowSuffVertexWidth >= vertexW &&
      wordBreak !== 'break-all' &&
      layoutState.nextLineWillFit === false &&
      hasNextWord === true
    ) {
      layoutState.addSuffixToBuffer(suffix, vertexBuffer);
      doneProcessing = true;
      break;
    }

    if (isLineBreak) {
      if (layoutState.nextLineWillFit) {
        layoutState.moveToNextLine(vertexLineHeight);
        continue;
      } else {
        layoutState.addSuffixToBuffer(suffix, vertexBuffer, true);
        doneProcessing = true;
        break;
      }
    } else if (letters === null) {
      // Handle space
      layoutState.addSpace(width, hasNextWord);
      if (hasNextWord === false) doneProcessing = true;
      continue;
    }

    if (letters) {
      for (const glyph of letters) {
        let addGlyphToBuffer = true;

        if (layoutState.curLineIndex === lineCache.length) {
          lineCache.push({
            codepointIndex: glyph.cluster,
            maxY: layoutState.maxY,
            maxX: layoutState.maxX,
          });
        } else if (curLineIndex > lineCache.length) {
          throw new Error('Unexpected lineCache length');
        }

        if (glyph.mapped) {
          // Mapped glyph
          const charEndX = layoutState.curX + glyph.xOffset + glyph.width;

          if (
            wordBreak === 'break-all' &&
            charEndX >= vertexW &&
            layoutState.nextLineWillFit
          ) {
            layoutState.moveToNextLine(vertexLineHeight, true);
          } else if (
            contain !== 'none' &&
            wordBreak === 'break-all' &&
            charEndX + overflowSuffVertexWidth >= vertexW &&
            layoutState.nextLineWillFit === false
          ) {
            layoutState.addSuffixToBuffer(suffix, vertexBuffer, true);
            doneProcessing = true;
            break;
          } else if (
            // Word wrap check
            // We are containing the text
            contain !== 'none' &&
            // The current glyph reaches outside the contained width
            charEndX >= vertexW &&
            layoutState.currentWord !== 0 &&
            layoutState.nextLineWillFit === true
          ) {
            layoutState.moveToNextLine(vertexLineHeight, true);
          } else if (
            wordBreak === 'break-word' &&
            charEndX >= vertexW &&
            layoutState.currentWord === 0 &&
            layoutState.nextLineWillFit
          ) {
            // The current word which starts the line is wider than the line width proceed to next line
            layoutState.moveToNextLine(vertexLineHeight);
          } else if (
            contain !== 'none' &&
            wordBreak === 'break-word' &&
            charEndX + overflowSuffVertexWidth >= vertexW &&
            layoutState.nextLineWillFit === false
          ) {
            // wordBreak: break-word - the current letter is about to go of the edge
            // and the next line will not fit, so we add the overflow suffix
            layoutState.addSuffixToBuffer(suffix, vertexBuffer);
            doneProcessing = true;
            break;
          }

          // Add the current glyph to the buffer
          if (addGlyphToBuffer) {
            layoutState.addGlyphToBuffer(glyph, vertexBuffer);
          }
        } else {
          // Unmapped character
          console.log('Unmapped character', glyph.codepoint);
        }
      }
      if (letters !== null) layoutState.currentWord++;
    }

    if (hasNextWord === false) doneProcessing = true;
  }

  // Adds the last line to Buffer
  layoutState.addLineToBuffer();

  if (textAlign === 'center' || textAlign === 'right') {
    const vertexTextW = contain === 'none' ? layoutState.maxX : vertexW;
    for (const line of layoutState.bufferLineInfos) {
      if (!line) continue;

      const lineWidth =
        line.bufferEnd === line.bufferStart
          ? 0
          : (vertexBuffer[line.bufferEnd - 4] ?? 0) -
            (vertexBuffer[line.bufferStart] ?? 0);

      const xOffset =
        textAlign === 'center'
          ? (vertexTextW - lineWidth) / 2
          : vertexTextW - lineWidth;

      for (let j = line.bufferStart; j < line.bufferEnd; j += 4) {
        if (vertexBuffer[j] !== undefined) {
          vertexBuffer[j] = (vertexBuffer[j] ?? 0) + xOffset;
        }
      }
    }
  }

  return {
    bufferNumFloats: layoutState.bufferOffset,
    bufferNumQuads: layoutState.bufferOffset / 16,
    layoutNumCharacters: doneProcessing
      ? text.length - startingCodepointIndex
      : layoutState.cluster - startingCodepointIndex + 1,
    fullyProcessed: doneProcessing,
    maxX: layoutState.maxX,
    maxY: layoutState.maxY,
    numLines: lineCache.length,
  };
}
