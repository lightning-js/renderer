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
import type { SdfTrFontFace } from '../../../font-face-types/SdfTrFontFace/SdfTrFontFace.js';
import type { TrProps, TextRendererState } from '../../TextRenderer.js';
import type { SdfTextRendererState } from '../SdfTextRenderer.js';
import type { SdfRenderWindow } from './setRenderWindow.js';

/**
 * Gets the start conditions for the layout loop.
 *
 * @remarks
 * Returns `undefined` if the layout loop should not be run.
 *
 * This function handles both textBaseline and verticalAlign, though they serve different purposes:
 *
 * - **textBaseline**: Determines where the baseline of the text is positioned relative to the y-coordinate.
 *   This is analogous to the CSS/Canvas textBaseline property and affects how individual lines of text
 *   are positioned relative to their coordinate.
 *
 * - **verticalAlign**: Should determine how the entire text block is positioned within its container.
 *   Currently this is incorrectly implemented as it only adjusts baseline position within line height gaps.
 *   Proper implementation would require knowledge of the container height and total text height.
 *
 * @param sdfFontSize The font size in SDF units
 * @param sdfLineHeight The line height in SDF units
 * @param fontFace The SDF font face
 * @param verticalAlign How the text block should align within its container
 * @param textBaseline Where the baseline should be positioned
 * @param offsetY Additional Y offset
 * @param fontSizeRatio Ratio between screen space and SDF space
 * @param renderWindow The current render window
 * @param lineCache Cache of line information
 * @param textH Total text height (if known)
 * @returns Start conditions or undefined if layout should not run
 */
export function getStartConditions(
  sdfFontSize: number,
  sdfLineHeight: number,
  fontFace: SdfTrFontFace,
  verticalAlign: TrProps['verticalAlign'],
  textBaseline: TrProps['textBaseline'],
  offsetY: TrProps['offsetY'],
  fontSizeRatio: number,
  renderWindow: SdfRenderWindow,
  lineCache: SdfTextRendererState['lineCache'],
  textH: TextRendererState['textH'],
):
  | {
      sdfX: number;
      sdfY: number;
      lineIndex: number;
    }
  | undefined {
  // State variables
  const startLineIndex = Math.min(
    Math.max(renderWindow.firstLineIdx, 0),
    lineCache.length,
  );

  const sdfStartX = 0;
  const { metrics } = fontFace;
  assertTruthy(metrics, 'Font metrics not loaded');
  assertTruthy(fontFace.data, 'Font data not loaded');

  /**
   * Bare line height is the distance between the ascender and descender of the font.
   * without the line gap metric.
   */
  const sdfBareLineHeight =
    (metrics.ascender - metrics.descender) * sdfFontSize;

  // Handle textBaseline - determines where the baseline sits relative to the Y coordinate
  let sdfTextBaselineYOffset = 0;
  if (textBaseline === 'top') {
    // For 'top', the top of the font (ascender) should align with the Y coordinate
    // We need to move UP by the ascender amount (positive offset moves up in SDF space)
    sdfTextBaselineYOffset = metrics.ascender * sdfFontSize;
  } else if (textBaseline === 'middle') {
    // For 'middle', the middle between ascender and descender should align with the Y coordinate
    // This is ascender - (ascender - descender)/2 = (ascender + descender)/2
    sdfTextBaselineYOffset =
      ((metrics.ascender + metrics.descender) * sdfFontSize) / 2;
  } else if (textBaseline === 'bottom') {
    // For 'bottom', the bottom of the font (descender) should align with the Y coordinate
    // Move down by the descender amount (negative offset moves down)
    sdfTextBaselineYOffset = metrics.descender * sdfFontSize;
  } else if (textBaseline === 'hanging') {
    // For 'hanging', similar to 'top' but typically slightly below
    // Move up by most of the ascender but not quite to the top
    sdfTextBaselineYOffset = metrics.ascender * sdfFontSize * 0.96;
  } else if (textBaseline === 'ideographic') {
    // For 'ideographic', similar to 'bottom'
    sdfTextBaselineYOffset = metrics.descender * sdfFontSize;
  }
  // 'alphabetic' is the default (0 offset) - baseline is at the Y coordinate

  // Handle verticalAlign - determines how the text block sits within its container
  // TODO: This should be handled at a higher level when we know the container height
  // For now, we'll keep this commented out as it's incorrectly implemented
  // let sdfVerticalAlignYOffset = 0;
  // if (verticalAlign === 'middle') {
  //   sdfVerticalAlignYOffset = (sdfLineHeight - sdfBareLineHeight) / 2;
  // } else if (verticalAlign === 'bottom') {
  //   sdfVerticalAlignYOffset = sdfLineHeight - sdfBareLineHeight;
  // }

  const sdfOffsetY = offsetY / fontSizeRatio;

  /**
   * This is the position from the top of the text drawing line to where the
   * baseline of the text will be according to the encoded positioning data for
   * each glyph in the SDF data. This also happens to be the ascender value
   * that is encoded into the font data.
   */
  const sdfEncodedAscender = fontFace.data.common.base;
  /**
   * This is the ascender that is configured and overridable in the font face.
   */
  const sdfConfiguredAscender = metrics.ascender * sdfFontSize;
  /**
   * If the configured ascender is different from the SDF data's encoded
   * ascender, the offset of the text will be adjusted by the difference.
   */
  const sdfAscenderAdjOffset = sdfConfiguredAscender - sdfEncodedAscender;

  const sdfStartY =
    sdfOffsetY +
    sdfAscenderAdjOffset +
    sdfTextBaselineYOffset +
    startLineIndex * sdfLineHeight;

  // Don't attempt to render anything if we know we're starting past the established end of the text
  if (textH && sdfStartY >= textH / fontSizeRatio) {
    return;
  }

  return {
    sdfX: sdfStartX,
    sdfY: sdfStartY,
    lineIndex: startLineIndex,
  };
}
