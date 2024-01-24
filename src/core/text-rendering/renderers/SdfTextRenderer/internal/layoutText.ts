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

export function layoutText(
  curLineIndex: number,
  startX: number,
  startY: number,
  text: TrProps['text'],
  textAlign: TrProps['textAlign'],
  width: TrProps['width'],
  height: TrProps['height'],
  fontSize: TrProps['fontSize'],
  lineHeight: TrProps['lineHeight'],
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
  maxLines: TrProps['maxLines'],
): {
  bufferNumFloats: number;
  bufferNumQuads: number;
  layoutNumCharacters: number;
  fullyProcessed: boolean;
  maxX: number;
  maxY: number;
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
  const startingMaxX = startingLineCacheEntry?.maxX || 0;
  const startingMaxY = startingLineCacheEntry?.maxY || 0;

  let maxX = startingMaxX;
  let maxY = startingMaxY;
  let curX = startX;
  let curY = startY;

  let bufferOffset = 0;
  /**
   * Buffer offset to last word boundry. This is -1 when we aren't in a word boundry.
   */
  const lastWord: {
    codepointIndex: number;
    bufferOffset: number;
    xStart: number;
  } = {
    codepointIndex: -1,
    bufferOffset: -1,
    xStart: -1,
  };

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const shaper = trFontFace.shaper;

  const shaperProps: FontShaperProps = {
    letterSpacing: vertexLSpacing,
  };

  // Get glyphs
  let glyphs = shaper.shapeText(
    shaperProps,
    new PeekableIterator(
      getUnicodeCodepoints(text, startingCodepointIndex),
      startingCodepointIndex,
    ),
  );

  let glyphResult:
    | IteratorResult<MappedGlyphInfo | UnmappedCharacterInfo, void>
    | undefined;

  let curLineBufferStart = -1;

  const bufferLineInfos: {
    bufferStart: number;
    bufferEnd: number;
  }[] = [];

  const vertexTruncateHeight = height / fontSizeRatio;
  const overflowSuffVertexWidth = measureText(
    overflowSuffix,
    shaperProps,
    shaper,
  );

  // Line-by-line layout
  let moreLines = true;
  while (moreLines) {
    const nextLineWillFit =
      (maxLines === 0 || curLineIndex + 1 < maxLines) &&
      (contain !== 'both' ||
        scrollable ||
        curY + vertexLineHeight + vertexLineHeight <= vertexTruncateHeight);
    const lineVertexW = nextLineWillFit
      ? vertexW
      : vertexW - overflowSuffVertexWidth;
    /**
     * Vertex X position to the beginning of the last word boundary. This becomes -1 when we start traversing a word.
     */
    let xStartLastWordBoundary = 0;

    const lineIsBelowWindowTop = curY + vertexLineHeight >= rwSdf.y1;
    const lineIsAboveWindowBottom = curY <= rwSdf.y2;
    const lineIsWithinWindow = lineIsBelowWindowTop && lineIsAboveWindowBottom;
    // Layout glyphs in this line
    // Any break statements in this while loop will trigger a line break
    while ((glyphResult = glyphs.next()) && !glyphResult.done) {
      const glyph = glyphResult.value;

      if (curLineIndex === lineCache.length) {
        lineCache.push({
          codepointIndex: glyph.cluster,
          maxY,
          maxX,
        });
      } else if (curLineIndex > lineCache.length) {
        throw new Error('Unexpected lineCache length');
      }

      // If we encounter a word boundary (white space or newline) we invalidate
      // the lastWord and set the xStartLastWordBoundary if we haven't already.
      if (glyph.codepoint === 32 || glyph.codepoint === 10) {
        if (lastWord.codepointIndex !== -1) {
          lastWord.codepointIndex = -1;
          xStartLastWordBoundary = curX;
        }
      } else if (lastWord.codepointIndex === -1) {
        lastWord.codepointIndex = glyph.cluster;
        lastWord.bufferOffset = bufferOffset;
        lastWord.xStart = xStartLastWordBoundary;
      }

      if (glyph.mapped) {
        // Mapped glyph
        const charEndX = curX + glyph.xOffset + glyph.width;
        // Word wrap check
        if (
          // We are containing the text
          contain !== 'none' &&
          // The current glyph reaches outside the contained width
          charEndX >= lineVertexW &&
          // There is a last word that we can break to the next line
          lastWord.codepointIndex !== -1 &&
          // We have advanced at least one character since the last word started
          lastWord.codepointIndex < glyph.cluster &&
          // Prevents infinite loop when a single word is longer than the width
          lastWord.xStart > 0
        ) {
          // The current word is about to go off the edge of the container width
          // Reinitialize the iterator starting at the last word
          // and proceeding to the next line
          if (nextLineWillFit) {
            glyphs = shaper.shapeText(
              shaperProps,
              new PeekableIterator(
                getUnicodeCodepoints(text, lastWord.codepointIndex),
                lastWord.codepointIndex,
              ),
            );
            bufferOffset = lastWord.bufferOffset;
            break;
          } else {
            glyphs = shaper.shapeText(
              shaperProps,
              new PeekableIterator(getUnicodeCodepoints(overflowSuffix, 0), 0),
            );
            curX = lastWord.xStart;
            bufferOffset = lastWord.bufferOffset;
          }
        } else {
          // This glyph fits, so we can add it to the buffer
          const quadX = curX + glyph.xOffset;
          const quadY = curY + glyph.yOffset;

          // Only add to buffer for rendering if the line is within the render window
          if (lineIsWithinWindow) {
            if (curLineBufferStart === -1) {
              curLineBufferStart = bufferOffset;
            }

            const atlasEntry = trFontFace.getAtlasEntry(glyph.glyphId);

            // Add texture coordinates
            const u = atlasEntry.x / trFontFace.data.common.scaleW;
            const v = atlasEntry.y / trFontFace.data.common.scaleH;
            const uvWidth = atlasEntry.width / trFontFace.data.common.scaleW;
            const uvHeight = atlasEntry.height / trFontFace.data.common.scaleH;

            // TODO: (Performance) We can optimize this by using ELEMENT_ARRAY_BUFFER
            // eliminating the need to duplicate vertices

            // Top-left
            vertexBuffer[bufferOffset++] = quadX;
            vertexBuffer[bufferOffset++] = quadY;
            vertexBuffer[bufferOffset++] = u;
            vertexBuffer[bufferOffset++] = v;

            // Top-right
            vertexBuffer[bufferOffset++] = quadX + glyph.width;
            vertexBuffer[bufferOffset++] = quadY;
            vertexBuffer[bufferOffset++] = u + uvWidth;
            vertexBuffer[bufferOffset++] = v;

            // Bottom-left
            vertexBuffer[bufferOffset++] = quadX;
            vertexBuffer[bufferOffset++] = quadY + glyph.height;
            vertexBuffer[bufferOffset++] = u;
            vertexBuffer[bufferOffset++] = v + uvHeight;

            // Bottom-right
            vertexBuffer[bufferOffset++] = quadX + glyph.width;
            vertexBuffer[bufferOffset++] = quadY + glyph.height;
            vertexBuffer[bufferOffset++] = u + uvWidth;
            vertexBuffer[bufferOffset++] = v + uvHeight;
          }

          maxY = Math.max(maxY, quadY + glyph.height);
          curX += glyph.xAdvance;
          maxX = Math.max(maxX, curX);
        }
      } else {
        // Unmapped character

        // Handle newlines
        if (glyph.codepoint === 10) {
          if (nextLineWillFit) {
            // The whole line fit, so we can break to the next line
            break;
          } else {
            // The whole line won't fit, so we need to add the overflow suffix
            glyphs = shaper.shapeText(
              shaperProps,
              new PeekableIterator(getUnicodeCodepoints(overflowSuffix, 0), 0),
            );
            // HACK: For the rest of the line when inserting the overflow suffix,
            // set contain = 'none' to prevent an infinite loop.
            contain = 'none';
          }
        }
      }
    }

    // Prepare for the next line...
    if (curLineBufferStart !== -1) {
      bufferLineInfos.push({
        bufferStart: curLineBufferStart,
        bufferEnd: bufferOffset,
      });
      curLineBufferStart = -1;
    }
    curX = 0;
    curY += vertexLineHeight;
    curLineIndex++;
    lastWord.codepointIndex = -1;
    xStartLastWordBoundary = 0;

    // Figure out if there are any more lines to render...
    if (!forceFullLayoutCalc && contain === 'both' && curY > rwSdf.y2) {
      // Stop layout calculation early (for performance purposes) if:
      // - We're not forcing a full layout calculation (for width/height calculation)
      // - ...and we're containing the text vertically+horizontally (contain === 'both')
      // - ...and we have a render window
      // - ...and the next line is below the bottom of the render window
      moreLines = false;
    } else if (glyphResult && glyphResult.done) {
      // If we've reached the end of the text, we know we're done
      moreLines = false;
    } else if (!nextLineWillFit) {
      // If we're contained vertically+horizontally (contain === 'both')
      // but not scrollable and the next line won't fit, we're done.
      moreLines = false;
    }
  }

  // Use textAlign to determine if we need to adjust the x position of the text
  // in the buffer line by line
  if (textAlign === 'center') {
    const vertexTextW = contain === 'none' ? maxX : vertexW;

    for (let i = 0; i < bufferLineInfos.length; i++) {
      const line = bufferLineInfos[i]!;
      // - 4 = the x position of a rightmost vertex
      const lineWidth =
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        vertexBuffer[line.bufferEnd - 4]! - vertexBuffer[line.bufferStart]!;

      const xOffset = (vertexTextW - lineWidth) / 2;
      for (let j = line.bufferStart; j < line.bufferEnd; j += 4) {
        vertexBuffer[j] += xOffset;
      }
    }
  } else if (textAlign === 'right') {
    const vertexTextW = contain === 'none' ? maxX : vertexW;

    for (let i = 0; i < bufferLineInfos.length; i++) {
      const line = bufferLineInfos[i]!;
      const lineWidth =
        line.bufferEnd === line.bufferStart
          ? 0
          : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            vertexBuffer[line.bufferEnd - 4]! - vertexBuffer[line.bufferStart]!;

      const xOffset = vertexTextW - lineWidth;
      for (let j = line.bufferStart; j < line.bufferEnd; j += 4) {
        vertexBuffer[j] += xOffset;
      }
    }
  }

  assertTruthy(glyphResult);

  return {
    bufferNumFloats: bufferOffset,
    bufferNumQuads: bufferOffset / 16,
    layoutNumCharacters: glyphResult.done
      ? text.length - startingCodepointIndex
      : glyphResult.value.cluster - startingCodepointIndex + 1,
    fullyProcessed: !!glyphResult.done,
    maxX,
    maxY,
  };
}
