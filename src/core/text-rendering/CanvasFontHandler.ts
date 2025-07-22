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
import { calculateFontMetrics } from './Utils.js';

/**
 * Global font set regardless of if run in the main thread or a web worker
 */
// const globalFontSet: FontFaceSet = (resolvedGlobal.document?.fonts ||
//   (resolvedGlobal as unknown as { fonts: FontFaceSet }).fonts) as FontFaceSet;

// Global state variables for fontHandler
const fontFamilies: Record<string, FontFace> = {};
const loadedFonts = new Set<string>();
const fontLoadPromises = new Map<string, Promise<void>>();
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
export const canRenderFont = (): boolean => {
  // Canvas can always render any font family (assuming the browser supports it)
  return true;
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
  if (loadedFonts.has(fontFamily) === true) {
    return;
  }

  const existingPromise = fontLoadPromises.get(fontFamily);
  // If already loading, return the existing promise
  if (existingPromise !== undefined) {
    return existingPromise;
  }
  // Create and store the loading promise
  const loadPromise = new FontFace(fontFamily, `url(${fontUrl})`)
    .load()
    .then((loadedFont) => {
      (document.fonts as FontFaceSetWithAdd).add(loadedFont);
      loadedFonts.add(fontFamily);
      fontLoadPromises.delete(fontFamily);
      // Store normalized metrics if provided
      if (metrics) {
        setFontMetrics(fontFamily, normalizeMetrics(metrics));
      }
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
): void => {
  if (initialized === true) {
    return;
  }
  context = c;

  // Register the default 'sans-serif' font face
  const defaultMetrics: NormalizedFontMetrics = {
    ascender: 0.8,
    descender: -0.2,
    lineGap: 0.2,
  };

  setFontMetrics('sans-serif', defaultMetrics);
  loadedFonts.add('sans-serif');
  initialized = true;
};

export const type = 'canvas';

/**
 * Check if a font is already loaded by font family
 */
export const isFontLoaded = (fontFamily: string): boolean => {
  return loadedFonts.has(fontFamily) || fontFamily === 'sans-serif';
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
