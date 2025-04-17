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

import {
  TrFontFace,
  type TrFontFaceDescriptors,
  type TrFontFaceOptions,
} from './TrFontFace.js';

declare module './TrFontFace.js' {
  interface TrFontFaceMap {
    web: WebTrFontFace;
  }
}

export interface WebTrFontFaceOptions extends TrFontFaceOptions {
  fontUrl: string;
}

export class WebTrFontFace extends TrFontFace {
  public readonly fontFace: FontFace;
  public readonly fontUrl: string;

  constructor(options: WebTrFontFaceOptions) {
    super(options);

    const { fontFamily, fontUrl } = options;

    // Filter out parentheses from fontUrl
    const fontUrlWithoutParentheses = fontUrl.replace(/\(|\)/g, '');

    // Defaults for descriptors resolved in the super constructor
    const determinedDescriptors = this.descriptors;

    // Convert TrFontFaceDescriptors to CSS FontFaceDescriptors
    let cssDescriptors: FontFaceDescriptors = {
      style: determinedDescriptors.style,
      weight:
        typeof determinedDescriptors.weight === 'number'
          ? `${determinedDescriptors.weight}`
          : determinedDescriptors.weight,
      stretch: determinedDescriptors.stretch,
      unicodeRange: determinedDescriptors.unicodeRange,
      featureSettings: determinedDescriptors.featureSettings,
      display: determinedDescriptors.display,
    };

    for (const k in cssDescriptors) {
      const key = k as keyof FontFaceDescriptors;
      if (cssDescriptors[key] === undefined) {
        delete cssDescriptors[key];
      }
    }

    const fontFace = new FontFace(
      fontFamily,
      `url(${fontUrlWithoutParentheses})`,
      cssDescriptors,
    );

    if (fontUrlWithoutParentheses.length > 0) {
      fontFace
        .load()
        .then(() => {
          (this.loaded as boolean) = true;
          this.emit('loaded');
        })
        .catch(console.error);
    } else {
      // Default font
      (this.loaded as boolean) = true;
      this.emit('loaded');
    }

    this.fontFace = fontFace;
    this.fontUrl = fontUrl;
  }
}
