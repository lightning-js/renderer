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

import { isBoundPositive, type Bound } from '../../../../lib/utils.js';
import type { TrProps } from '../../TextRenderer.js';
import { roundDownToMultiple, roundUpToMultiple } from './util.js';

export interface SdfRenderWindow {
  screen: Bound;
  sdf: Bound;
  firstLineIdx: number;
  numLines: number;
  valid: boolean;
}

/**
 * Create a render window from the given parameters.
 *
 * @remarks
 * The render window is a rectangle that defines the area of the text that
 * should be rendered. It is used to skip rendering parts of the text that
 * are outside of the render window. The render window is relative to the
 * text's top left corner of the overrall text.
 *
 * @param x The x coordinate of the text element's top left corner relative to the screen.
 * @param y The y coordinate of the text element's top left corner relative to the screen.
 * @param scrollY The amount of pixels to scroll the text vertically.
 * @param lineHeight The number of extra lines to render above and below the visible window.
 * @param visibleWindow The visible window of the text element relative to the screen
 * @returns
 */
export function setRenderWindow(
  outRenderWindow: SdfRenderWindow,
  x: TrProps['x'],
  y: TrProps['y'],
  scrollY: TrProps['scrollY'],
  lineHeight: number,
  bufferMargin: number,
  visibleWindow: Bound,
  fontSizeRatio: number,
): void {
  const { screen, sdf } = outRenderWindow;
  if (!isBoundPositive(visibleWindow)) {
    screen.x1 = 0;
    screen.y1 = 0;
    screen.x2 = 0;
    screen.y2 = 0;
    sdf.x1 = 0;
    sdf.y1 = 0;
    sdf.x2 = 0;
    sdf.y2 = 0;
    outRenderWindow.numLines = 0;
    outRenderWindow.firstLineIdx = 0;
  } else {
    const x1 = visibleWindow.x1 - x;
    const x2 = x1 + (visibleWindow.x2 - visibleWindow.x1);
    const y1Base = visibleWindow.y1 - y + scrollY;
    const y1 = roundDownToMultiple(y1Base - bufferMargin, lineHeight || 1);
    const y2 = roundUpToMultiple(
      y1Base + (visibleWindow.y2 - visibleWindow.y1) + bufferMargin,
      lineHeight || 1,
    );

    screen.x1 = x1;
    screen.y1 = y1;
    screen.x2 = x2;
    screen.y2 = y2;
    sdf.x1 = x1 / fontSizeRatio;
    sdf.y1 = y1 / fontSizeRatio;
    sdf.x2 = x2 / fontSizeRatio;
    sdf.y2 = y2 / fontSizeRatio;

    outRenderWindow.numLines = Math.ceil((y2 - y1) / lineHeight);
    outRenderWindow.firstLineIdx = Math.floor(y1 / lineHeight);
  }
  outRenderWindow.valid = true;
}
