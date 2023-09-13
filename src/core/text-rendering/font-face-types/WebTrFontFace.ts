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

import { TrFontFace, type TrFontFaceDescriptors } from './TrFontFace.js';

declare module './TrFontFace.js' {
  interface TrFontFaceMap {
    web: WebTrFontFace;
  }
}

export class WebTrFontFace extends TrFontFace {
  public readonly fontFace: FontFace;
  public readonly fontUrl: string;

  constructor(
    fontFamily: string,
    descriptors: Partial<TrFontFaceDescriptors>,
    fontUrl: string,
  ) {
    super(fontFamily, descriptors);

    // Filter out parentheses from fontUrl
    const fontUrlWithoutParentheses = fontUrl.replace(/\(|\)/g, '');

    // Defaults for descriptors resolved in the super constructor
    const determinedDescriptors = this.descriptors;

    // Convert TrFontFaceDescriptors to CSS FontFaceDescriptors
    const cssDescriptors: FontFaceDescriptors = {
      style: determinedDescriptors.style,
      weight:
        typeof determinedDescriptors.weight === 'number'
          ? `${determinedDescriptors.weight}`
          : determinedDescriptors.weight,
      stretch: determinedDescriptors.stretch,
      unicodeRange: determinedDescriptors.unicodeRange,
      variant: determinedDescriptors.variant,
      featureSettings: determinedDescriptors.featureSettings,
      display: determinedDescriptors.display,
    };

    const fontFace = new FontFace(
      fontFamily,
      `url(${fontUrlWithoutParentheses})`,
      cssDescriptors,
    );

    fontFace
      .load()
      .then(() => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        (this.loaded as boolean) = true;
        this.emit('loaded');
      })
      .catch(console.error);

    this.fontFace = fontFace;
    this.fontUrl = fontUrl;
  }
}
