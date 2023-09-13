/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2023 Comcast
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

import { SdfTrFontFace } from './font-face-types/SdfTrFontFace/SdfTrFontFace.js';
import type { TrFontFace } from './font-face-types/TrFontFace.js';
import { WebTrFontFace } from './font-face-types/WebTrFontFace.js';
import type { TextRendererMap, TrFontProps } from './renderers/TextRenderer.js';

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
    const closeFaces: WebTrFontFace[] = [];
    const exactMatch = familyMapsByPriority.reduce<TrFontFace | undefined>(
      (prev, fontFamiles) => {
        if (prev) {
          return prev;
        }
        const fontFaces = fontFamiles[props.fontFamily];
        if (!fontFaces) {
          return undefined;
        }
        const fontFacesCopy = new Set(fontFaces);

        // Remove any font faces that don't match the style exactly
        // TODO: In the future we may enhance this to find the best match
        // based on font weight, style, etc.
        // See https://www.w3.org/TR/2018/REC-css-fonts-3-20180920/#font-matching-algorithm
        for (const fontFace of fontFacesCopy) {
          if (
            fontFace.descriptors.stretch !== props.fontStretch ||
            fontFace.descriptors.style !== props.fontStyle ||
            fontFace.descriptors.weight !== props.fontWeight
          ) {
            fontFacesCopy.delete(fontFace);
          }
        }

        // Return the first font face that matches the style exactly
        return fontFacesCopy.values().next().value;
      },
      undefined,
    );

    return exactMatch || closeFaces[0];
  }
}
