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
import type { FontHandler, TextLayout, TrProps } from './TextRenderer.js';
import * as CanvasFontHandler from './CanvasFontHandler.js';
import {
  calculateRenderInfo,
  type RenderInfo,
} from './canvas/calculateRenderInfo.js';
import { draw } from './canvas/draw.js';

const type = 'canvas';
const font: FontHandler = CanvasFontHandler;

let canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
let context:
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D
  | null = null;

// Initialize the Text Renderer
const init = (stage: Stage): void => {
  canvas = stage.platform.createCanvas() as HTMLCanvasElement | OffscreenCanvas;
  context = canvas.getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D;

  font.init();
};

/**
 * Canvas text renderer
 *
 * @param stage - Stage instance for font resolution
 * @param props - Text rendering properties
 * @returns Object containing ImageData and dimensions
 */
const renderText = (
  stage: Stage,
  props: TrProps,
): {
  imageData: ImageData | null;
  width: number;
  height: number;
  layout?: TextLayout;
} => {
  assertTruthy(canvas, 'Canvas is not initialized');
  assertTruthy(context, 'Canvas context is not available');

  const renderInfo = Object.create(null) as RenderInfo;

  // Props to settings mapping
  renderInfo.text = props.text;
  renderInfo.fontFamily = props.fontFamily;
  renderInfo.fontSize = props.fontSize;
  renderInfo.fontStyle = props.fontStyle;
  renderInfo.textAlign = props.textAlign || 'left';
  renderInfo.letterSpacing =
    typeof props.letterSpacing === 'number' ? props.letterSpacing : 0;
  renderInfo.lineHeight =
    typeof props.lineHeight === 'number' ? props.lineHeight : null;
  renderInfo.maxLines = typeof props.maxLines === 'number' ? props.maxLines : 0;
  renderInfo.textBaseline = props.textBaseline || 'alphabetic';
  renderInfo.verticalAlign = props.verticalAlign || 'top';
  renderInfo.overflowSuffix = props.overflowSuffix || '';
  renderInfo.wordBreak = props.wordBreak || 'normal';
  renderInfo.offsetY = props.offsetY || 0;

  // Computed properties
  renderInfo.wordWrap = props.contain !== 'none';
  renderInfo.wordWrapWidth = props.contain === 'none' ? 0 : props.width || 0;
  renderInfo.width = props.contain !== 'none' ? props.width || 0 : 0;
  renderInfo.height = props.height || 0;
  renderInfo.maxHeight =
    props.contain === 'both'
      ? (props.height || 0) - (props.offsetY || 0)
      : null;
  renderInfo.textOverflow = props.overflowSuffix ? 'ellipsis' : null;

  // Set defaults
  renderInfo.precision = 1;
  renderInfo.fontBaselineRatio = 1.0;
  renderInfo.textColor = 0xffffffff;
  renderInfo.paddingLeft = 0;
  renderInfo.paddingRight = 0;
  renderInfo.shadow = false;
  renderInfo.shadowColor = 0xff000000;
  renderInfo.shadowOffsetX = 0;
  renderInfo.shadowOffsetY = 0;
  renderInfo.shadowBlur = 0;
  renderInfo.highlight = false;
  renderInfo.highlightHeight = 0;
  renderInfo.highlightColor = 0x80ffff00;
  renderInfo.highlightOffset = 0;
  renderInfo.highlightPaddingLeft = 0;
  renderInfo.highlightPaddingRight = 0;
  renderInfo.textIndent = 0;
  renderInfo.cutSx = 0;
  renderInfo.cutSy = 0;
  renderInfo.cutEx = 0;
  renderInfo.cutEy = 0;
  renderInfo.advancedRenderer = false;
  renderInfo.textRenderIssueMargin = 0;

  calculateRenderInfo(context, renderInfo);

  draw(canvas, context, renderInfo);

  let imageData: ImageData | null = null;
  if (canvas.width > 0 && canvas.height > 0) {
    imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  }

  return {
    imageData,
    width: renderInfo.width,
    height: renderInfo.lineHeight! * renderInfo.lines.length,
  };
};

/**
 * Add quads for rendering (Canvas doesn't use quads)
 */
const addQuads = (): Float32Array | null => {
  // Canvas renderer doesn't use quad-based rendering
  // Return null for interface compatibility
  return null;
};

/**
 * Render quads for Canvas renderer (Canvas doesn't use quad-based rendering)
 */
const renderQuads = (): void => {
  // Canvas renderer doesn't use quad-based rendering
  // This method is for interface compatibility only
};

/**
 * Canvas Text Renderer - implements TextRenderer interface
 */
const CanvasTextRenderer = {
  type,
  font,
  renderText,
  addQuads,
  renderQuads,
  init,
};

export default CanvasTextRenderer;
