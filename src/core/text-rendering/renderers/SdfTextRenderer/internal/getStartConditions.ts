/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2023 Comcast
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

import type { TrProps, TextRendererState } from '../../TextRenderer.js';
import type { SdfTextRendererState } from '../SdfTextRenderer.js';

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
  fontSize: TrProps['fontSize'],
  offsetY: TrProps['offsetY'],
  fontSizeRatio: number,
  sdfLineHeight: number,
  renderWindow: SdfTextRendererState['renderWindow'],
  lineCache: SdfTextRendererState['lineCache'],
  textH: TextRendererState['textH'],
):
  | {
      x: number;
      y: number;
      lineIndex: number;
    }
  | undefined {
  // State variables
  let startLineIndex = 0;
  if (renderWindow) {
    startLineIndex = Math.min(
      Math.max(Math.floor(renderWindow.y1 / fontSize), 0),
      lineCache.length,
    );
  }

  // TODO: Possibly break out startX / startY into a separate function
  // TODO: (fontSize / 6.4286 / fontSizeRatio) Adding this to the startY helps the text line up better with Canvas rendered text
  const startX = 0;
  const startY = offsetY / fontSizeRatio + startLineIndex * sdfLineHeight; // TODO: Figure out what determines the initial y offset of text.

  // Don't attempt to render anything if we know we're starting past the established end of the text
  if (textH && startY >= textH / fontSizeRatio) {
    return;
  }

  return {
    x: startX,
    y: startY,
    lineIndex: startLineIndex,
  };
}
