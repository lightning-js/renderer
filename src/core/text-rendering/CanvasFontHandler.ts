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
  FontStatus,
} from './TextRenderer.js';
import { FontLoadEventEmitter } from './TextRenderer.js';
import type { Stage } from '../Stage.js';
import { calculateFontMetrics } from './Utils.js';

/**
 * Global font set regardless of if run in the main thread or a web worker
 */
// const globalFontSet: FontFaceSet = (resolvedGlobal.document?.fonts ||
//   (resolvedGlobal as unknown as { fonts: FontFaceSet }).fonts) as FontFaceSet;

// Global state variables for fontHandler
const fontFamilies: Record<string, FontFace> = {};
const registeredFonts = new Map<string, FontStatus>();
const normalizedMetrics = new Map<string, NormalizedFontMetrics>();
let initialized = false;
let context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/**
 * Normalize font metrics to be in the range of 0 to 1
 */
function normalizeMetrics(metrics: FontMetrics): NormalizedFontMetrics {
  return {
    ascender: metrics.ascender / metrics.unitsPerEm,
    descender: metrics.descender / metrics.unitsPerEm,
    lineGap: metrics.lineGap / metrics.unitsPerEm,
  };
}

/**
 * make fontface add not show errors
 */
interface FontFaceSetWithAdd extends FontFaceSet {
  add(font: FontFace): void;
}

/**
 * Check if a font can be rendered
 */
export const canRenderFont = (fontFamily: string): boolean => {
  // Simply check if the font is in our registered fonts map
  return registeredFonts.has(fontFamily);
};

/**
 * Load a font by providing fontFamily, fontUrl, and optional metrics
 */
export const loadFont = (
  stage: Stage,
  options: FontLoadOptions,
): FontStatus => {
  const { fontFamily, fontUrl, metrics } = options;

  // If already registered, return existing status
  const existingStatus = registeredFonts.get(fontFamily);
  if (existingStatus) {
    return existingStatus;
  }

  // Create new emitter and font status
  const emitter = new FontLoadEventEmitter();
  const fontStatus: FontStatus = {
    isLoaded: false,
    emitter,
  };

  // Register font status immediately
  registeredFonts.set(fontFamily, fontStatus);

  if (!fontUrl) {
    // If no URL provided, emit error
    setTimeout(() => {
      emitter.emitFailed(new Error(`Font URL is required for ${fontFamily}`));
    }, 0);
    return fontStatus;
  }

  // Start loading font asynchronously
  const fontFace = new FontFace(fontFamily, `url(${fontUrl})`);
  fontFace
    .load()
    .then((loadedFont) => {
      (document.fonts as FontFaceSetWithAdd).add(loadedFont);

      // Store normalized metrics if provided
      if (metrics) {
        setFontMetrics(fontFamily, normalizeMetrics(metrics));
      }

      // Update status to loaded
      fontStatus.isLoaded = true;
      emitter.emitLoaded();
    })
    .catch((error: unknown) => {
      registeredFonts.delete(fontFamily);
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      console.error(`Failed to load font: ${fontFamily}`, errorObj);
      emitter.emitFailed(errorObj);
    });

  return fontStatus;
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
  c?: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
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

  // Register the default 'sans-serif' font face
  const defaultMetrics: NormalizedFontMetrics = {
    ascender: 0.8,
    descender: -0.2,
    lineGap: 0.2,
  };

  setFontMetrics('sans-serif', defaultMetrics);

  // Create a dummy emitter for sans-serif that's always loaded
  const sansSerifEmitter = new FontLoadEventEmitter();
  const sansSerifStatus: FontStatus = {
    isLoaded: true,
    emitter: sansSerifEmitter,
  };
  registeredFonts.set('sans-serif', sansSerifStatus);
  // Emit loaded immediately for sans-serif
  setTimeout(() => sansSerifEmitter.emitLoaded(), 0);

  initialized = true;
};

export const type = 'canvas';

/**
 * Check if a font is already loaded by font family
 */
export const isFontLoaded = (fontFamily: string): boolean => {
  if (fontFamily === 'sans-serif') return true;

  // Check if the font is registered and actually loaded in the browser
  if (!registeredFonts.has(fontFamily)) return false;

  // Check if font is actually loaded in the browser
  return document.fonts.check(`16px ${fontFamily}`);
};

/**
 * Get font status and emitter for listening to load events
 */
export const getFontStatus = (fontFamily: string): FontStatus => {
  const storedStatus = registeredFonts.get(fontFamily);

  if (storedStatus) {
    // Update the isLoaded status for canvas fonts by checking browser state
    if (fontFamily !== 'sans-serif') {
      storedStatus.isLoaded = document.fonts.check(`16px ${fontFamily}`);
    }
    return storedStatus;
  }

  // Return default status for unregistered fonts
  return {
    isLoaded: false,
    emitter: null,
  };
};

export const getFontMetrics = (
  fontFamily: string,
  fontSize: number,
): NormalizedFontMetrics => {
  let out =
    normalizedMetrics.get(fontFamily) ||
    normalizedMetrics.get(fontFamily + fontSize);
  if (out !== undefined) {
    return out;
  }
  out = calculateFontMetrics(context, fontFamily, fontSize);
  normalizedMetrics.set(fontFamily + fontSize, out);
  return out;
};

export const setFontMetrics = (
  fontFamily: string,
  metrics: NormalizedFontMetrics,
): void => {
  normalizedMetrics.set(fontFamily, metrics);
};
