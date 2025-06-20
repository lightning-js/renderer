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

import { assertTruthy } from '../../utils.js';
import type { Stage } from '../Stage.js';
import type { FontHandler, TrProps } from './TextRenderer.js';
import type { Settings } from './canvas/Settings.js';
import * as CanvasFontHandler from './CanvasFontHandler.js';
import { calculateRenderInfo } from './canvas/calculateRenderInfo.js';
import { draw } from './canvas/draw.js';

export const type = 'canvas';

// Font handling
export const init = (): void => {
  /** nothing to init at this stage for Canvas */
};

export const font: FontHandler = CanvasFontHandler;

/**
 * Canvas text renderer
 *
 * @param stage - Stage instance for font resolution
 * @param props - Text rendering properties
 * @returns Object containing ImageData and dimensions
 */
export const renderText = async (
  stage: Stage,
  props: TrProps,
): Promise<{
  imageData: ImageData | null;
  width: number;
  height: number;
}> => {
  const canvas = stage.platform.createCanvas();
  const context = canvas.getContext('2d');

  assertTruthy(context, 'Canvas context is not available');

  const settings = Object.create(null) as Settings;

  // Props to settings mapping
  settings.text = props.text;
  settings.fontFamily = props.fontFamily;
  settings.fontSize = props.fontSize;
  settings.fontStyle = props.fontStyle;
  settings.textAlign = props.textAlign || 'left';
  settings.letterSpacing =
    typeof props.letterSpacing === 'number' ? props.letterSpacing : 0;
  settings.lineHeight =
    typeof props.lineHeight === 'number' ? props.lineHeight : null;
  settings.maxLines = typeof props.maxLines === 'number' ? props.maxLines : 0;
  settings.textBaseline = props.textBaseline || 'alphabetic';
  settings.verticalAlign = props.verticalAlign || 'top';
  settings.overflowSuffix = props.overflowSuffix || '';
  settings.wordBreak = props.wordBreak || 'normal';
  settings.offsetY = props.offsetY || 0;

  // Computed properties
  settings.wordWrap = props.contain !== 'none';
  settings.wordWrapWidth = props.contain === 'none' ? 0 : props.width || 0;
  settings.w = props.contain !== 'none' ? props.width || 0 : 0;
  settings.h = props.height || 0;
  settings.maxHeight =
    props.contain === 'both'
      ? (props.height || 0) - (props.offsetY || 0)
      : null;
  settings.textOverflow = props.overflowSuffix ? 'ellipsis' : null;

  // Set defaults
  settings.precision = 1;
  settings.fontBaselineRatio = 1.0;
  settings.textColor = [1, 1, 1, 1];
  settings.paddingLeft = 0;
  settings.paddingRight = 0;
  settings.shadow = false;
  settings.shadowColor = [0, 0, 0, 1];
  settings.shadowOffsetX = 0;
  settings.shadowOffsetY = 0;
  settings.shadowBlur = 0;
  settings.highlight = false;
  settings.highlightHeight = 0;
  settings.highlightColor = [1, 1, 0, 0.5];
  settings.highlightOffset = 0;
  settings.highlightPaddingLeft = 0;
  settings.highlightPaddingRight = 0;
  settings.textIndent = 0;
  settings.cutSx = 0;
  settings.cutSy = 0;
  settings.cutEx = 0;
  settings.cutEy = 0;
  settings.advancedRenderer = false;
  settings.textRenderIssueMargin = 0;

  const renderInfo = calculateRenderInfo({ context, settings });

  draw({
    canvas,
    context,
    renderInfo,
    settings,
  });

  let imageData: ImageData | null = null;
  if (canvas.width > 0 && canvas.height > 0) {
    imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  }

  return {
    imageData,
    width: renderInfo.width,
    height: renderInfo.lineHeight * renderInfo.lines.length,
  };
};
