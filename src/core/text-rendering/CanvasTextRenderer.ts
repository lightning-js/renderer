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
import type { TextLineStruct, TextRenderInfo } from './TextRenderer.js';
import * as CanvasFontHandler from './CanvasFontHandler.js';
import type { CoreTextNodeProps } from '../CoreTextNode.js';
import { hasZeroWidthSpace } from './Utils.js';
import { mapTextLayout } from './TextLayoutEngine.js';

const MAX_TEXTURE_DIMENSION = 4096;

const type = 'canvas' as const;

let canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
let context:
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D
  | null = null;

// Separate canvas and context for text measurements
let measureCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;
let measureContext:
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D
  | null = null;

// Cache for text layout calculations
const layoutCache = new Map<
  string,
  {
    lines: string[];
    lineWidths: number[];
    maxLineWidth: number;
    remainingText: string;
    moreTextLines: boolean;
  }
>();

// Initialize the Text Renderer
const init = (stage: Stage): void => {
  const dpr = stage.options.devicePhysicalPixelRatio;

  // Drawing canvas and context
  canvas = stage.platform.createCanvas() as HTMLCanvasElement | OffscreenCanvas;
  context = canvas.getContext('2d', { willReadFrequently: true }) as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D;

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.textRendering = 'optimizeSpeed';

  // Separate measuring canvas and context
  measureCanvas = stage.platform.createCanvas() as
    | HTMLCanvasElement
    | OffscreenCanvas;
  measureContext = measureCanvas.getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D;

  measureContext.setTransform(dpr, 0, 0, dpr, 0, 0);
  measureContext.textRendering = 'optimizeSpeed';

  // Set up a minimal size for the measuring canvas since we only use it for measurements
  measureCanvas.width = 1;
  measureCanvas.height = 1;

  CanvasFontHandler.init(context, measureContext);
};

/**
 * Canvas text renderer
 *
 * @param stage - Stage instance for font resolution
 * @param props - Text rendering properties
 * @returns Object containing ImageData and dimensions
 */
const renderText = (props: CoreTextNodeProps): TextRenderInfo => {
  assertTruthy(canvas, 'Canvas is not initialized');
  assertTruthy(context, 'Canvas context is not available');
  assertTruthy(measureContext, 'Canvas measureContext is not available');
  // Extract already normalized properties
  const {
    text,
    fontFamily,
    fontStyle,
    fontSize,
    textAlign,
    maxLines,
    lineHeight,
    verticalAlign,
    overflowSuffix,
    maxWidth,
    maxHeight,
    wordBreak,
  } = props;

  const font = `${fontStyle} ${fontSize}px Unknown, ${fontFamily}`;
  // Get font metrics and calculate line height
  measureContext.font = font;
  measureContext.textBaseline = 'hanging';

  const metrics = CanvasFontHandler.getFontMetrics(fontFamily, fontSize);

  const letterSpacing = props.letterSpacing;

  const [
    lines,
    remainingLines,
    hasRemainingText,
    bareLineHeight,
    lineHeightPx,
    effectiveWidth,
    effectiveHeight,
  ] = mapTextLayout(
    CanvasFontHandler.measureText,
    metrics,
    text,
    textAlign,
    fontFamily,
    lineHeight,
    overflowSuffix,
    wordBreak,
    letterSpacing,
    maxLines,
    maxWidth,
    maxHeight,
  );
  const lineAmount = lines.length;

  // Calculate shadow bounds to expand canvas
  let shadowLeft = 0;
  let shadowRight = 0;
  let shadowTop = 0;
  let shadowBottom = 0;
  let offsetX = 0;
  let offsetY = 0;

  if (props.shadow === true) {
    const shadowOffsetX = props.shadowOffsetX || 0;
    const shadowOffsetY = props.shadowOffsetY || 0;
    const shadowBlur = props.shadowBlur || 0;

    // Calculate shadow extents
    shadowLeft = Math.max(0, -shadowOffsetX + shadowBlur);
    shadowRight = Math.max(0, shadowOffsetX + shadowBlur);
    shadowTop = Math.max(0, -shadowOffsetY + shadowBlur);
    shadowBottom = Math.max(0, shadowOffsetY + shadowBlur);

    // Displacement needed to account for negative offsets
    offsetX = shadowLeft;
    offsetY = shadowTop;
  }

  const canvasW = Math.ceil(effectiveWidth + shadowLeft + shadowRight);
  const canvasH = Math.ceil(effectiveHeight + shadowTop + shadowBottom);

  canvas.width = canvasW;
  canvas.height = canvasH;

  if (props.shadow === true) {
    context.shadowColor = `rgba(${(props.shadowColor >> 16) & 0xff}, ${
      (props.shadowColor >> 8) & 0xff
    }, ${props.shadowColor & 0xff}, ${props.shadowAlpha})`;
    context.shadowOffsetX = props.shadowOffsetX;
    context.shadowOffsetY = props.shadowOffsetY;
    context.shadowBlur = props.shadowBlur;
  }

  context.fillStyle = 'white';
  context.font = font;
  context.textBaseline = 'hanging';

  // Performance optimization for large fonts
  if (fontSize >= 128) {
    context.globalAlpha = 0.01;
    context.fillRect(0, 0, 0.01, 0.01);
    context.globalAlpha = 1.0;
  }

  for (let i = 0; i < lineAmount; i++) {
    const line = lines[i] as TextLineStruct;
    const textLine = line[0];
    let currentX = Math.ceil(line[3]) + offsetX;
    const currentY = Math.ceil(line[4]) + offsetY;
    if (letterSpacing === 0) {
      context.fillText(textLine, currentX, currentY);
    } else {
      const textLineLength = textLine.length;
      for (let j = 0; j < textLineLength; j++) {
        const char = textLine.charAt(j);
        if (hasZeroWidthSpace(char) === true) {
          continue;
        }
        context.fillText(char, currentX, currentY);
        currentX += CanvasFontHandler.measureText(
          char,
          fontFamily,
          letterSpacing,
        );
      }
    }
  }

  // Extract image data
  let imageData: ImageData | null = null;
  if (canvas.width > 0 && canvas.height > 0) {
    imageData = context.getImageData(0, 0, canvasW, canvasH);
  }
  return {
    imageData,
    width: effectiveWidth,
    height: effectiveHeight,
    remainingLines,
    hasRemainingText,
    canvasW,
    canvasH,
    offsetX,
    offsetY,
  };
};

/**
 * Generate a cache key for text layout calculations
 */
function generateLayoutCacheKey(
  text: string,
  fontFamily: string,
  fontSize: number,
  fontStyle: string,
  wordWrap: boolean,
  wordWrapWidth: number,
  letterSpacing: number,
  maxLines: number,
  overflowSuffix: string,
): string {
  return `${text}-${fontFamily}-${fontSize}-${fontStyle}-${wordWrap}-${wordWrapWidth}-${letterSpacing}-${maxLines}-${overflowSuffix}`;
}

/**
 * Clear layout cache for memory management
 */
const clearLayoutCache = (): void => {
  layoutCache.clear();
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
  font: CanvasFontHandler,
  renderText,
  addQuads,
  renderQuads,
  init,
  clearLayoutCache,
};

export default CanvasTextRenderer;
