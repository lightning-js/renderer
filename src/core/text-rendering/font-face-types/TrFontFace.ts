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

import { EventEmitter } from '../../../common/EventEmitter.js';

/**
 * Augmentable map of font type IDs to font types
 *
 * @example
 * ```ts
 * declare module './TrFontFace' {
 *   interface TrFontFaceMap {
 *     canvas: CanvasTrFontFace;
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TrFontFaceMap {}

/**
 * Descriptors defining a font face.
 *
 * Used when selecting a font face from a font family.
 *
 * @remarks
 * Based on the `@font-face` CSS rule. Not all descriptors are supported by all
 * text renderers.
 *
 * @see https://www.w3.org/TR/css-fonts-3/#font-face-rule
 */
export interface TrFontFaceDescriptors {
  style: 'normal' | 'italic' | 'oblique';
  weight: 'normal' | 'bold' | number;
  stretch:
    | 'normal'
    | 'ultra-condensed'
    | 'extra-condensed'
    | 'condensed'
    | 'semi-condensed'
    | 'semi-expanded'
    | 'expanded'
    | 'extra-expanded'
    | 'ultra-expanded';
  unicodeRange?: string;
  display?: FontDisplay;
  featureSettings?: string;
  variant?: string;
}

export class TrFontFace extends EventEmitter {
  public readonly fontFamily: string;
  public readonly descriptors: TrFontFaceDescriptors;
  public readonly loaded: boolean = false;

  constructor(fontFamily: string, descriptors: Partial<TrFontFaceDescriptors>) {
    super();
    this.fontFamily = fontFamily;
    this.descriptors = {
      style: 'normal',
      weight: 'normal',
      stretch: 'normal',
      ...descriptors,
    };
  }

  /**
   * Convert a TrFontFaceDescriptors to a FontFaceDescriptors which differ slightly
   *
   * @param descriptors
   * @returns
   */
  public static convertToCssFontFaceDescriptors(
    descriptors: TrFontFaceDescriptors,
  ): FontFaceDescriptors {
    return {
      style: descriptors.style,
      weight:
        typeof descriptors.weight === 'number'
          ? `${descriptors.weight}`
          : descriptors.weight,
      stretch: descriptors.stretch,
      unicodeRange: descriptors.unicodeRange,
      variant: descriptors.variant,
      featureSettings: descriptors.featureSettings,
      display: descriptors.display,
    };
  }
}
