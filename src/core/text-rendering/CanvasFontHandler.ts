/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2025 Comcast Cable Communications Management, LLC.
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

import type {
  FontFamilyMap,
  FontLoadOptions,
  FontMetrics,
  NormalizedFontMetrics,
} from './TextRenderer.js';
import type { Stage } from '../Stage.js';
import { hasZeroWidthSpace } from './Utils.js';
import type { CoreTextNode } from '../CoreTextNode.js';
import { UpdateType } from '../CoreNode.js';
import {
  defaultFontMetrics,
  normalizeFontMetrics,
} from './TextLayoutEngine.js';

interface CanvasFont {
  fontFamily: string;
  fontFace?: FontFace;
  metrics?: FontMetrics;
}

/**
 * Global font set regardless of if run in the main thread or a web worker
 */
// const globalFontSet: FontFaceSet = (resolvedGlobal.document?.fonts ||
//   (resolvedGlobal as unknown as { fonts: FontFaceSet }).fonts) as FontFaceSet;

// Global state variables for fontHandler
const fontFamilies: Record<string, FontFace> = {};
const fontLoadPromises = new Map<string, Promise<void>>();
const normalizedMetrics = new Map<string, NormalizedFontMetrics>();
const nodesWaitingForFont: Record<string, CoreTextNode[]> = Object.create(
  null,
) as Record<string, CoreTextNode[]>;

const fontCache = new Map<string, CanvasFont>();

let initialized = false;
let context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
let measureContext:
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D;
/**
 * make fontface add not show errors
 */
interface FontFaceSetWithAdd extends FontFaceSet {
  add(font: FontFace): void;
}

/**
 * Check if a font can be rendered
 */
export const canRenderFont = (): boolean => {
  // Canvas can always render any font family (assuming the browser supports it)
  return true;
};

const processFontData = (
  fontFamily: string,
  fontFace?: FontFace,
  metrics?: FontMetrics,
) => {
  metrics = metrics || defaultFontMetrics;
  fontCache.set(fontFamily, {
    fontFamily,
    fontFace,
    metrics,
  });
};

/**
 * Load a font by providing fontFamily, fontUrl, and optional metrics
 */
export const loadFont = async (
  stage: Stage,
  options: FontLoadOptions,
): Promise<void> => {
  const { fontFamily, fontUrl, metrics } = options;

  // If already loaded, return immediately
  if (fontCache.has(fontFamily) === true) {
    return;
  }

  const existingPromise = fontLoadPromises.get(fontFamily);
  // If already loading, return the existing promise
  if (existingPromise !== undefined) {
    return existingPromise;
  }

  const nwff: CoreTextNode[] = (nodesWaitingForFont[fontFamily] = []);
  // Create and store the loading promise
  const loadPromise = new FontFace(fontFamily, `url(${fontUrl})`)
    .load()
    .then((loadedFont) => {
      (document.fonts as FontFaceSetWithAdd).add(loadedFont);
      processFontData(fontFamily, loadedFont, metrics);
      fontLoadPromises.delete(fontFamily);
      for (let key in nwff) {
        nwff[key]!.setUpdateType(UpdateType.Local);
      }
      delete nodesWaitingForFont[fontFamily];
    })
    .catch((error) => {
      fontLoadPromises.delete(fontFamily);
      console.error(`Failed to load font: ${fontFamily}`, error);
      throw error;
    });

  fontLoadPromises.set(fontFamily, loadPromise);
  return loadPromise;
};

/**
 * Get the font families map for resolving fonts
 */
export const getFontFamilies = (): FontFamilyMap => {
  return fontFamilies;
};

/**
 * Initialize the global font handler
 */
export const init = (
  c: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  mc: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
): void => {
  if (initialized === true) {
    return;
  }

  if (c === undefined) {
    throw new Error(
      'Canvas context is not provided for font handler initialization',
    );
  }

  context = c;
  measureContext = mc;

  // Register the default 'sans-serif' font face
  const defaultMetrics: FontMetrics = {
    ascender: 800,
    descender: -200,
    lineGap: 200,
    unitsPerEm: 1000,
  };

  processFontData('sans-serif', undefined, defaultMetrics);
  initialized = true;
};

export const type = 'canvas';

/**
 * Check if a font is already loaded by font family
 */
export const isFontLoaded = (fontFamily: string): boolean => {
  return fontCache.has(fontFamily);
};

/**
 * Wait for a font to load
 *
 * @param fontFamily
 * @param node
 */
export const waitingForFont = (fontFamily: string, node: CoreTextNode) => {
  nodesWaitingForFont[fontFamily]![node.id] = node;
};

/**
 * Stop waiting for a font to load
 *
 * @param fontFamily
 * @param node
 * @returns
 */
export const stopWaitingForFont = (fontFamily: string, node: CoreTextNode) => {
  if (nodesWaitingForFont[fontFamily] === undefined) {
    return;
  }

  delete nodesWaitingForFont[fontFamily][node.id];
};

export const getFontMetrics = (
  fontFamily: string,
  fontSize: number,
): NormalizedFontMetrics => {
  const out = normalizedMetrics.get(fontFamily + fontSize);
  if (out !== undefined) {
    return out;
  }
  let metrics = fontCache.get(fontFamily)!.metrics;
  if (metrics === undefined) {
    metrics = calculateFontMetrics(fontFamily, fontSize);
  }
  return processFontMetrics(fontFamily, fontSize, metrics);
};

export const processFontMetrics = (
  fontFamily: string,
  fontSize: number,
  metrics: FontMetrics,
): NormalizedFontMetrics => {
  const label = fontFamily + fontSize;
  const normalized = normalizeFontMetrics(metrics, fontSize);
  normalizedMetrics.set(label, normalized);
  return normalized;
};

export const measureText = (
  text: string,
  fontFamily: string,
  letterSpacing: number,
) => {
  if (letterSpacing === 0) {
    return measureContext.measureText(text).width;
  }
  if (hasZeroWidthSpace(text) === false) {
    return measureContext.measureText(text).width + letterSpacing * text.length;
  }
  return text.split('').reduce((acc, char) => {
    if (hasZeroWidthSpace(char) === true) {
      return acc;
    }
    return acc + measureContext.measureText(char).width + letterSpacing;
  }, 0);
};

/**
 * Get the font metrics for a font face.
 *
 * @remarks
 * This function will attempt to grab the explicitly defined metrics from the
 * font face first. If the font face does not have metrics defined, it will
 * attempt to calculate the metrics using the browser's measureText method.
 *
 * If the browser does not support the font metrics API, it will use some
 * default values.
 *
 * @param context
 * @param fontFace
 * @param fontSize
 * @returns
 */
export function calculateFontMetrics(
  fontFamily: string,
  fontSize: number,
): FontMetrics {
  // If the font face doesn't have metrics defined, we fallback to using the
  // browser's measureText method to calculate take a best guess at the font
  // actual font's metrics.
  // - fontBoundingBox[Ascent|Descent] is the best estimate but only supported
  //   in Chrome 87+ (2020), Firefox 116+ (2023), and Safari 11.1+ (2018).
  //   - It is an estimate as it can vary between browsers.
  // - actualBoundingBox[Ascent|Descent] is less accurate and supported in
  //   Chrome 77+ (2019), Firefox 74+ (2020), and Safari 11.1+ (2018).
  // - If neither are supported, we'll use some default values which will
  //   get text on the screen but likely not be great.
  // NOTE: It's been decided not to rely on fontBoundingBox[Ascent|Descent]
  // as it's browser support is limited and it also tends to produce higher than
  // expected values. It is instead HIGHLY RECOMMENDED that developers provide
  // explicit metrics in the font face definition.
  const metrics = measureContext.measureText(
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  );
  console.warn(
    `Font metrics not provided for Canvas Web font ${fontFamily}. ` +
      'Using fallback values. It is HIGHLY recommended you use the latest ' +
      'version of the Lightning 3 `msdf-generator` tool to extract the default ' +
      'metrics for the font and provide them in the Canvas Web font definition.',
  );
  const ascender =
    metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent ?? 0;
  const descender =
    metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent ?? 0;
  return {
    ascender,
    descender: -descender,
    lineGap:
      (metrics.emHeightAscent ?? 0) +
      (metrics.emHeightDescent ?? 0) -
      (ascender + descender),
    unitsPerEm: (metrics.emHeightAscent ?? 0) + (metrics.emHeightDescent ?? 0),
  };
}
