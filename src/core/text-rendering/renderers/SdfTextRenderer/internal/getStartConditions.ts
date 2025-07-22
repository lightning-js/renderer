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
 * @param sdfFontSize The font size in SDF units
 * @param sdfLineHeight The line height in SDF units
 * @param fontFace The SDF font face
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

  // Handle textBaseline - determines where the baseline sits relative to the Y coordinate
  let sdfTextBaselineYOffset = 0;
  if (textBaseline === 'top') {
    sdfTextBaselineYOffset = metrics.ascender * sdfFontSize;
  } else if (textBaseline === 'middle') {
    sdfTextBaselineYOffset =
      ((metrics.ascender + metrics.descender) * sdfFontSize) / 2;
  } else if (textBaseline === 'bottom') {
    sdfTextBaselineYOffset = metrics.descender * sdfFontSize;
  } else if (textBaseline === 'hanging') {
    sdfTextBaselineYOffset = metrics.ascender * sdfFontSize * 0.96;
  } else if (textBaseline === 'ideographic') {
    // For 'ideographic', similar to 'bottom'
    sdfTextBaselineYOffset = metrics.descender * sdfFontSize;
  }
  // 'alphabetic' is the default (0 offset) - baseline is at the Y coordinate

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
