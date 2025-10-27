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
import type {
  FontLoadOptions,
  TextLineStruct,
  TextRenderer,
  TextRenderInfo,
} from './TextRenderer.js';
import * as CanvasFontHandler from './CanvasFontHandler.js';
import type { CoreTextNodeProps } from '../CoreTextNode.js';
import { hasZeroWidthSpace } from './Utils.js';
import { mapTextLayout } from './TextLayoutEngine.js';
import { CanvasFont, type CanvasFontProps } from './CanvasFont.js';

const MAX_TEXTURE_DIMENSION = 4096;

const type = 'canvas' as const;

let canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
export let context:
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D
  | null = null;

// Separate canvas and context for text measurements
let measureCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;
export let measureContext:
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
  const dpr = window.devicePixelRatio || 1;

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

const createFont = (settings: FontLoadOptions): CanvasFont | undefined => {
  if (settings.fontUrl === undefined) {
    console.error('fontUrl is missing');
    return;
  }
  return new CanvasFont(
    CanvasTextRenderer as unknown as TextRenderer,
    settings as unknown as CanvasFontProps,
    measureContext!,
  );
};

/**
 * Canvas text renderer
 *
 * @param stage - Stage instance for font resolution
 * @param props - Text rendering properties
 * @returns Object containing ImageData and dimensions
 */
const renderText = (
  font: CanvasFont,
  props: CoreTextNodeProps,
): TextRenderInfo => {
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

  const canvasFont = `${fontStyle} ${fontSize}px Unknown, ${fontFamily}`;
  // Get font metrics and calculate line height
  measureContext.font = canvasFont;
  measureContext.textBaseline = 'hanging';

  const metrics = font.getMetrics(fontSize);

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
    font,
    metrics,
    text,
    textAlign,
    verticalAlign,
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
  const canvasW = Math.ceil(maxWidth || effectiveWidth);
  const canvasH = Math.ceil(maxHeight || effectiveHeight);

  canvas.width = canvasW;
  canvas.height = canvasH;
  context.fillStyle = 'white';
  context.font = canvasFont;
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
    let currentX = Math.ceil(line[2]);
    const currentY = Math.ceil(line[3]);
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
    width: canvasW,
    height: canvasH,
    remainingLines,
    hasRemainingText,
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
  createFont,
  renderText,
  addQuads,
  renderQuads,
  init,
  clearLayoutCache,
};

export default CanvasTextRenderer;
