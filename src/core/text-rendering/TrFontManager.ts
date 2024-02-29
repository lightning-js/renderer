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

import type { TrFontFace } from './font-face-types/TrFontFace.js';
import type { TextRendererMap, TrFontProps } from './renderers/TextRenderer.js';
import memize from 'memize';

const weightConversions: { [key: string]: number } = {
  normal: 400,
  bold: 700,
  bolder: 900,
  lighter: 100,
};

const fontWeightToNumber = (weight: string | number): number => {
  if (typeof weight === 'number') {
    return weight;
  }

  return weightConversions[weight] || 400;
};

function rawResolveFontToUse(
  familyMapsByPriority: FontFamilyMap[],
  family: string,
  weightIn: string | number,
  style: string,
  stretch: string,
): TrFontFace | undefined {
  const weight = fontWeightToNumber(weightIn);
  let result = undefined;

  for (const fontFamiles of familyMapsByPriority) {
    if (result) {
      break;
    }

    const fontFaces = fontFamiles[family];
    if (!fontFaces) {
      continue;
    }

    if (fontFaces.size === 1) {
      // No Exact match found, find nearest weight match
      console.warn(
        `TrFontManager: Only one font face found for family: '${family}' - will be used for all weights and styles`,
      );

      result = fontFaces.values().next().value as TrFontFace;
      continue;
    }

    const weightMap = new Map<number, TrFontFace>();
    for (const fontFace of fontFaces) {
      const fontFamilyWeight = fontWeightToNumber(fontFace.descriptors.weight);
      if (
        fontFamilyWeight === weight &&
        fontFace.descriptors.style === style &&
        fontFace.descriptors.stretch === stretch
      ) {
        result = fontFace;
        break;
      }

      weightMap.set(fontFamilyWeight, fontFace);
    }

    // No Exact match found, find nearest weight match
    const msg = `TrFontManager: No exact match: '${family} Weight: ${weight} Style: ${style} Stretch: ${stretch}'`;
    console.error(msg);

    if (!result && weight === 400 && weightMap.has(500)) {
      result = weightMap.get(500);
    }

    if (!result && weight === 500 && weightMap.has(400)) {
      result = weightMap.get(400);
    }

    if (!result && weight < 400) {
      const lighter =
        weightMap.get(300) || weightMap.get(200) || weightMap.get(100);
      if (lighter) {
        result = lighter;
      }
    }

    if (!result && weight > 500) {
      const bolder =
        weightMap.get(600) ||
        weightMap.get(700) ||
        weightMap.get(800) ||
        weightMap.get(900);
      if (bolder) {
        result = bolder;
      }
    }
  }

  return result;
}
const resolveFontToUse = memize(rawResolveFontToUse);

/**
 * Structure mapping font family names to a set of font faces.
 */
export interface FontFamilyMap {
  [familyName: string]: Set<TrFontFace>;
}

export class TrFontManager {
  constructor(private textRenderers: Partial<TextRendererMap>) {
    // Intentionally left blank
  }

  public addFontFace(font: TrFontFace): void {
    // All the font face to all of the text renderers that support it
    for (const trId in this.textRenderers) {
      const tr = this.textRenderers[trId as keyof TextRendererMap];
      if (tr && tr.isFontFaceSupported(font)) {
        tr.addFontFace(font);
      }
    }
  }

  /**
   * Utility method to resolve a single font face from a list of prioritized family maps based on
   * a set of font properties.
   *
   * @remarks
   * These are to be used by a text renderer to resolve a font face if needed.
   *
   * @param familyMapsByPriority
   * @param props
   * @returns
   */
  public static resolveFontFace(
    familyMapsByPriority: FontFamilyMap[],
    props: TrFontProps,
  ): TrFontFace | undefined {
    const { fontFamily, fontWeight, fontStyle, fontStretch } = props;
    return resolveFontToUse(
      familyMapsByPriority,
      fontFamily,
      fontWeight,
      fontStyle,
      fontStretch,
    );
  }
}
