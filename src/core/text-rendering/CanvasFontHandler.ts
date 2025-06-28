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

/**
 * Global font set regardless of if run in the main thread or a web worker
 */
// const globalFontSet: FontFaceSet = (resolvedGlobal.document?.fonts ||
//   (resolvedGlobal as unknown as { fonts: FontFaceSet }).fonts) as FontFaceSet;

// Global state for the font handler
const fontState = {
  fontFamilies: {} as Record<string, FontFace>,
  loadedFonts: new Set<string>(),
  fontLoadPromises: new Map<string, Promise<void>>(),
  normalized: new Map<string, NormalizedFontMetrics>(),
  initialized: false,
};

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
  if (fontState.loadedFonts.has(fontFamily)) {
    return;
  }

  // If already loading, return the existing promise
  if (fontState.fontLoadPromises.has(fontFamily)) {
    return fontState.fontLoadPromises.get(fontFamily);
  }

  // Create and store the loading promise
  const loadPromise = new FontFace(fontFamily, `url(${fontUrl})`)
    .load()
    .then(() => {
      fontState.loadedFonts.add(fontFamily);
      fontState.fontLoadPromises.delete(fontFamily);

      // Store normalized metrics if provided
      if (metrics) {
        setFontMetrics(fontFamily, normalizeMetrics(metrics));
      }
    })
    .catch((error) => {
      fontState.fontLoadPromises.delete(fontFamily);
      console.error(`Failed to load font: ${fontFamily}`, error);
      throw error;
    });

  fontState.fontLoadPromises.set(fontFamily, loadPromise);
  return loadPromise;
};

/**
 * Get the font families map for resolving fonts
 */
export const getFontFamilies = (): FontFamilyMap => {
  return fontState.fontFamilies;
};

/**
 * Initialize the global font handler
 */
export const init = (): void => {
  if (fontState.initialized) {
    return;
  }

  // Register the default 'sans-serif' font face
  const defaultMetrics: NormalizedFontMetrics = {
    ascender: 0.8,
    descender: -0.2,
    lineGap: 0.2,
  };

  setFontMetrics('sans-serif', defaultMetrics);
  fontState.loadedFonts.add('sans-serif');
  fontState.initialized = true;
};

export const type = 'canvas';

/**
 * Check if a font is already loaded by font family
 */
export const isFontLoaded = (fontFamily: string): boolean => {
  return fontState.loadedFonts.has(fontFamily) || fontFamily === 'sans-serif';
};

export const getFontMetrics = (
  fontFamily: string,
): NormalizedFontMetrics | null => {
  return fontState.normalized.get(fontFamily) || null;
};

export const setFontMetrics = (
  fontFamily: string,
  metrics: NormalizedFontMetrics,
): void => {
  fontState.normalized.set(fontFamily, metrics);
};
