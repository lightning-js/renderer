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
import type { TrFontFace } from './font-face-types/TrFontFace.js';
import { WebTrFontFace } from './font-face-types/WebTrFontFace.js';
import type { TrProps } from './renderers/TextRenderer.js';

const resolvedGlobal = typeof self === 'undefined' ? globalThis : self;

/**
 * Global font set regardless of if run in the main thread or a web worker
 */
const globalFontSet: FontFaceSet = (resolvedGlobal.document?.fonts ||
  (resolvedGlobal as unknown as { fonts: FontFaceSet }).fonts) as FontFaceSet;

// Global state for the font handler
const fontState = {
  fontFamilies: {} as FontFamilyMap,
  loadedFonts: new Set<string>(),
  fontLoadPromises: new Map<string, Promise<void>>(),
  initialized: false,
};

/**
 * Initialize the global font handler
 */
export const init = (): void => {
  if (fontState.initialized) {
    return;
  }

  // Install the default 'sans-serif' font face
  addFontFace(
    new WebTrFontFace({
      fontFamily: 'sans-serif',
      descriptors: {},
      fontUrl: '',
    }),
  );

  fontState.initialized = true;
};

export const type = 'canvas';

/**
 * Add a font face to be used by the global font handler
 */
export const addFontFace = (fontFace: TrFontFace): void => {
  assertTruthy(fontFace instanceof WebTrFontFace);

  const fontFamily = fontFace.fontFamily;

  // Add the font face to the document (except for sans-serif which is built-in)
  if (fontFamily !== 'sans-serif') {
    // @ts-expect-error `add()` method should be available from a FontFaceSet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    globalFontSet.add(fontFace.fontFace);
  }

  let faceSet = fontState.fontFamilies[fontFamily];
  if (!faceSet) {
    faceSet = new Set();
    fontState.fontFamilies[fontFamily] = faceSet;
  }
  faceSet.add(fontFace);
};

export const canRenderFont = (trProps: TrProps): boolean => {
  // Canvas can always render any font family (assumin the browser supports it)
  return true;
};

/**
 * Check if a font is already loaded by CSS string
 */
export const isFontLoaded = (cssString: string): boolean => {
  // Extract font family from CSS string for simple check
  const match = cssString.match(/(?:\d+px\s+)(.+)$/);
  const fontFamily = match?.[1] || cssString;

  return fontState.loadedFonts.has(fontFamily) || fontFamily === 'sans-serif';
};

/**
 * Load a font by CSS string
 */
export const loadFont = async (cssString: string): Promise<void> => {
  // Extract font family from CSS string for tracking
  const match = cssString.match(/(?:\d+px\s+)(.+)$/);
  const fontFamily = match?.[1] || cssString;

  // If already loaded, return immediately
  if (isFontLoaded(cssString)) {
    return;
  }

  // If already loading, return the existing promise
  if (fontState.fontLoadPromises.has(fontFamily)) {
    return fontState.fontLoadPromises.get(fontFamily);
  }

  // Create and store the loading promise
  const loadPromise = globalFontSet
    .load(cssString)
    .then(() => {
      fontState.loadedFonts.add(fontFamily);
      fontState.fontLoadPromises.delete(fontFamily);
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
 * Get font families array for font resolution
 */
export const getFontFamilyArray = (): FontFamilyMap[] => {
  return [fontState.fontFamilies];
};
