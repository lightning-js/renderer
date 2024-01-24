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

import type { Bound } from '../../../../lib/utils.js';
import type { TrProps, TextRendererState } from '../../TextRenderer.js';
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
  lineHeight: number,
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

  // TODO: (fontSize / 6.4286 / fontSizeRatio) Adding this to the startY helps the text line up better with Canvas rendered text
  const sdfStartX = 0;
  let sdfVerticalAlignYOffset = 0;
  if (verticalAlign === 'middle') {
    sdfVerticalAlignYOffset = (sdfLineHeight - sdfFontSize) / 2;
  } else if (verticalAlign === 'bottom') {
    sdfVerticalAlignYOffset = sdfLineHeight - sdfFontSize;
  }
  const sdfOffsetY = offsetY / fontSizeRatio;
  const sdfStartY =
    sdfOffsetY + startLineIndex * sdfLineHeight + sdfVerticalAlignYOffset; // TODO: Figure out what determines the initial y offset of text.

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
