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
  FontMetrics,
  NormalizedFontMetrics,
} from './TextRenderer.js';
import type { ImageTexture } from '../textures/ImageTexture.js';

/**
 * SDF Font Data structure matching msdf-bmfont-xml output
 */
export interface SdfFontData {
  pages: string[];
  chars: Array<{
    id: number;
    char: string;
    x: number;
    y: number;
    width: number;
    height: number;
    xoffset: number;
    yoffset: number;
    xadvance: number;
    page: number;
    chnl: number;
  }>;

  kernings: Array<{
    first: number;
    second: number;
    amount: number;
  }>;
  info: {
    face: string;
    size: number;
    bold: number;
    italic: number;
    charset: string[];
    unicode: number;
    stretchH: number;
    smooth: number;
    aa: number;
    padding: [number, number, number, number]; // [up, right, down, left]
    spacing: [number, number]; // [horizontal, vertical]
    outline: number;
  };
  common: {
    lineHeight: number;
    base: number;
    scaleW: number;
    scaleH: number;
    pages: number;
    packed: number;
    alphaChnl: number;
    redChnl: number;
    greenChnl: number;
    blueChnl: number;
  };
  distanceField: {
    // msdf-bmfont-xml uses the string 'sdf' for single-channel SDF.
    fieldType: 'sdf' | 'msdf';
    distanceRange: number;
  };
  lightningMetrics?: FontMetrics;
}

/**
 * @typedef {Object} SdfGlyph
 * @property {number} id - Glyph ID
 * @property {string} char - Character
 * @property {number} x - Atlas x position
 * @property {number} y - Atlas y position
 * @property {number} width - Glyph width
 * @property {number} height - Glyph height
 * @property {number} xoffset - X offset
 * @property {number} yoffset - Y offset
 * @property {number} xadvance - Character advance width
 * @property {number} page - Page number
 * @property {number} chnl - Channel
 */

/**
 * @typedef {Object} KerningTable
 * Fast lookup table for kerning values
 */
type KerningTable = Record<
  number,
  Record<number, number | undefined> | undefined
>;

/**
 * @typedef {Object} SdfFontCache
 * Cached font data for performance
 */
interface SdfFontCache {
  data: SdfFontData;
  glyphMap: Map<number, SdfFontData['chars'][0]>;
  kernings: KerningTable;
  atlasTexture: ImageTexture;
  metrics: NormalizedFontMetrics;
  maxCharHeight: number;
}

// Host paths on top
const fontState = {
  fontCache: Object.create(null) as Record<string, SdfFontCache>,
  loadedFonts: new Set<string>(),
  fontLoadPromises: new Map<string, Promise<void>>(),
  initialized: false,
};

/**
 * Normalize font metrics to be in the range of 0 to 1
 */
const normalizeMetrics = (metrics: FontMetrics): NormalizedFontMetrics => ({
  ascender: metrics.ascender / metrics.unitsPerEm,
  descender: metrics.descender / metrics.unitsPerEm,
  lineGap: metrics.lineGap / metrics.unitsPerEm,
});

/**
 * Build kerning lookup table for fast access
 * @param {Array} kernings - Kerning data from font
 * @returns {KerningTable} Optimized kerning lookup table
 */
const buildKerningTable = (kernings: SdfFontData['kernings']): KerningTable => {
  const kerningTable: KerningTable = {};

  let i = 0;
  const length = kernings.length;

  while (i < length) {
    const kerning = kernings[i];
    if (!kerning) {
      i++;
      continue;
    }

    const second = kerning.second;

    let firsts = kerningTable[second];
    if (!firsts) {
      firsts = {};
      kerningTable[second] = firsts;
    }

    firsts[kerning.first] = kerning.amount;
    i++;
  }

  return kerningTable;
};

/**
 * Build glyph map from font data for fast character lookup
 * @param {Array} chars - Character data from font
 * @returns {Map} Glyph map for character to glyph lookup
 */
const buildGlyphMap = (
  chars: SdfFontData['chars'],
): Map<number, SdfFontData['chars'][0]> => {
  const glyphMap = new Map<number, SdfFontData['chars'][0]>();
  let maxCharHeight = 0;

  let i = 0;
  const length = chars.length;

  while (i < length) {
    const glyph = chars[i];
    if (!glyph) {
      i++;
      continue;
    }

    glyphMap.set(glyph.id, glyph);

    const charHeight = glyph.yoffset + glyph.height;
    if (charHeight > maxCharHeight) {
      maxCharHeight = charHeight;
    }

    i++;
  }

  return glyphMap;
};

/**
 * Process font data and create optimized cache entry
 * @param {string} fontFamily - Font family name
 * @param {SdfFontData} fontData - Raw font data
 * @param {ImageTexture} atlasTexture - Atlas texture
 * @param {FontMetrics} metrics - Font metrics
 */
const processFontData = (
  fontFamily: string,
  fontData: SdfFontData,
  atlasTexture: ImageTexture,
  metrics?: FontMetrics,
): void => {
  // Build optimized data structures
  const glyphMap = buildGlyphMap(fontData.chars);
  const kernings = buildKerningTable(fontData.kernings);

  // Calculate max char height
  let maxCharHeight = 0;
  let i = 0;
  const length = fontData.chars.length;

  while (i < length) {
    const glyph = fontData.chars[i];
    if (glyph) {
      const charHeight = glyph.yoffset + glyph.height;
      if (charHeight > maxCharHeight) {
        maxCharHeight = charHeight;
      }
    }
    i++;
  }

  // Determine metrics
  let normalizedMetrics: NormalizedFontMetrics;

  if (metrics) {
    normalizedMetrics = normalizeMetrics(metrics);
  } else if (fontData.lightningMetrics) {
    normalizedMetrics = normalizeMetrics(
      fontData.lightningMetrics as FontMetrics,
    );
  } else {
    console.warn(
      `Font metrics not found for SDF font ${fontFamily}. ` +
        'Make sure you are using the latest version of the Lightning ' +
        '3 msdf-generator tool to generate your SDF fonts. Using default metrics.',
    );
    // Use default metrics
    normalizedMetrics = {
      ascender: 0.8,
      descender: -0.2,
      lineGap: 0.2,
    };
  }

  // Cache processed data
  fontState.fontCache[fontFamily] = {
    data: fontData,
    glyphMap,
    kernings,
    atlasTexture,
    metrics: normalizedMetrics,
    maxCharHeight,
  };
};

/**
 * Check if a font can be rendered
 */
export const canRenderFont = (): boolean => {
  return true;
};

/**
 * Load SDF font from JSON + PNG atlas
 * @param {Object} options - Font loading options
 * @param {string} options.fontFamily - Font family name
 * @param {string} options.fontUrl - JSON font data URL (atlasDataUrl)
 * @param {string} options.atlasUrl - PNG atlas texture URL
 * @param {FontMetrics} options.metrics - Optional font metrics
 * @param {ImageTexture} options.atlasTexture - Atlas texture instance
 */
export const loadFont = async ({
  fontFamily,
  fontUrl,
  metrics,
  atlasTexture,
}: {
  fontFamily: string;
  fontUrl: string;
  metrics?: FontMetrics;
  atlasTexture?: ImageTexture;
}): Promise<void> => {
  // Early return if already loaded
  if (fontState.loadedFonts.has(fontFamily)) {
    return;
  }

  // Early return if already loading
  const existingPromise = fontState.fontLoadPromises.get(fontFamily);
  if (existingPromise) {
    return existingPromise;
  }

  // Create loading promise
  const loadPromise = (async (): Promise<void> => {
    try {
      // Load font JSON data
      const response = await fetch(fontUrl);
      if (!response.ok) {
        throw new Error(`Failed to load font data: ${response.statusText}`);
      }

      const fontData = (await response.json()) as SdfFontData;
      if (!fontData || !fontData.chars) {
        throw new Error('Invalid SDF font data format');
      }

      // Atlas texture should be provided externally
      if (!atlasTexture) {
        throw new Error('Atlas texture must be provided for SDF fonts');
      }

      // Process and cache font data
      processFontData(fontFamily, fontData, atlasTexture, metrics);

      // Mark as loaded
      fontState.loadedFonts.add(fontFamily);
      fontState.fontLoadPromises.delete(fontFamily);
    } catch (error) {
      // Cleanup on error
      fontState.fontLoadPromises.delete(fontFamily);
      if (fontState.fontCache[fontFamily]) {
        delete fontState.fontCache[fontFamily];
      }
      console.error(`Failed to load SDF font: ${fontFamily}`, error);
      throw error;
    }
  })();

  fontState.fontLoadPromises.set(fontFamily, loadPromise);
  return loadPromise;
};

/**
 * Get the font families map for resolving fonts
 */
export const getFontFamilies = (): FontFamilyMap => {
  const families: FontFamilyMap = {};

  // SDF fonts don't use the traditional FontFamilyMap structure
  // Return empty map since SDF fonts are handled differently
  return families;
};

/**
 * Initialize the SDF font handler
 */
export const init = (): void => {
  if (fontState.initialized) {
    return;
  }

  fontState.initialized = true;
};

export const type = 'sdf';

/**
 * Check if a font is already loaded by font family
 */
export const isFontLoaded = (fontFamily: string): boolean => {
  return fontState.loadedFonts.has(fontFamily);
};

/**
 * Get normalized font metrics for a font family
 */
export const getFontMetrics = (
  fontFamily: string,
): NormalizedFontMetrics | null => {
  const cache = fontState.fontCache[fontFamily];
  return cache ? cache.metrics : null;
};

/**
 * Set font metrics for a font family
 */
export const setFontMetrics = (
  fontFamily: string,
  metrics: NormalizedFontMetrics,
): void => {
  const cache = fontState.fontCache[fontFamily];
  if (cache) {
    cache.metrics = metrics;
  }
};

/**
 * Get glyph data for a character in a specific font
 * @param {string} fontFamily - Font family name
 * @param {number} codepoint - Character codepoint
 * @returns {Object|null} Glyph data or null if not found
 */
export const getGlyph = (
  fontFamily: string,
  codepoint: number,
): SdfFontData['chars'][0] | null => {
  const cache = fontState.fontCache[fontFamily];
  if (!cache) return null;

  return cache.glyphMap.get(codepoint) || cache.glyphMap.get(63) || null; // 63 = '?'
};

/**
 * Get kerning value between two glyphs
 * @param {string} fontFamily - Font family name
 * @param {number} firstGlyph - First glyph ID
 * @param {number} secondGlyph - Second glyph ID
 * @returns {number} Kerning value or 0
 */
export const getKerning = (
  fontFamily: string,
  firstGlyph: number,
  secondGlyph: number,
): number => {
  const cache = fontState.fontCache[fontFamily];
  if (!cache) return 0;

  const seconds = cache.kernings[secondGlyph];
  return seconds ? seconds[firstGlyph] || 0 : 0;
};

/**
 * Get atlas texture for a font family
 * @param {string} fontFamily - Font family name
 * @returns {ImageTexture|null} Atlas texture or null
 */
export const getAtlas = (fontFamily: string): ImageTexture | null => {
  const cache = fontState.fontCache[fontFamily];
  return cache ? cache.atlasTexture : null;
};

/**
 * Get font data for a font family
 * @param {string} fontFamily - Font family name
 * @returns {SdfFontData|null} Font data or null
 */
export const getFontData = (fontFamily: string): SdfFontData | null => {
  const cache = fontState.fontCache[fontFamily];
  return cache ? cache.data : null;
};

/**
 * Get maximum character height for a font family
 * @param {string} fontFamily - Font family name
 * @returns {number} Max character height or 0
 */
export const getMaxCharHeight = (fontFamily: string): number => {
  const cache = fontState.fontCache[fontFamily];
  return cache ? cache.maxCharHeight : 0;
};

/**
 * Get all loaded font families
 * @returns {string[]} Array of font family names
 */
export const getLoadedFonts = (): string[] => {
  return Array.from(fontState.loadedFonts);
};

/**
 * Unload a font and free resources
 * @param {string} fontFamily - Font family name
 */
export const unloadFont = (fontFamily: string): void => {
  const cache = fontState.fontCache[fontFamily];
  if (cache) {
    // Free texture if needed
    if (cache.atlasTexture && typeof cache.atlasTexture.free === 'function') {
      cache.atlasTexture.free();
    }

    delete fontState.fontCache[fontFamily];
    fontState.loadedFonts.delete(fontFamily);
  }
};
