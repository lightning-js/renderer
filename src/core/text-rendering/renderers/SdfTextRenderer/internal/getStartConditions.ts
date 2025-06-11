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
import type { TrProps, TextRendererState } from '../../../TextRenderer.js';
import type { SdfTextRendererState } from '../SdfTextRenderer.js';
import type { SdfRenderWindow } from './setRenderWindow.js';

/**
 * Gets the start conditions for the layout loop.
 *
 * @remarks
 * Returns `undefined` if the layout loop should not be run.
 *
 * @param fontSize
 * @param fontSizeRatio
 * @param sdfLineHeight
 * @param renderWindow
 * @param lineCache
 * @param textH
 * @returns
 */
export function getStartConditions(
  sdfFontSize: number,
  sdfLineHeight: number,
  fontFace: SdfTrFontFace,
  verticalAlign: TrProps['verticalAlign'],
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
  let sdfVerticalAlignYOffset = 0;
  if (verticalAlign === 'middle') {
    sdfVerticalAlignYOffset = (sdfLineHeight - sdfBareLineHeight) / 2;
  } else if (verticalAlign === 'bottom') {
    sdfVerticalAlignYOffset = sdfLineHeight - sdfBareLineHeight;
  }

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
    startLineIndex * sdfLineHeight +
    sdfVerticalAlignYOffset; // TODO: Figure out what determines the initial y offset of text.

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
