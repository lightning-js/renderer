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
import { CoreFont, FontState, type CoreFontProps } from './CoreFont.js';
import { normalizeFontMetrics } from './TextLayoutEngine.js';
import type { NormalizedFontMetrics, TextRenderer } from './TextRenderer.js';
import { hasZeroWidthSpace } from './Utils.js';

/**
 * make fontface add not show errors
 */
interface FontFaceSetWithAdd extends FontFaceSet {
  add(font: FontFace): void;
}

export type CanvasFontProps = CoreFontProps & {
  fontUrl: string;
};

export class CanvasFont extends CoreFont {
  public type = 'canvas';
  public url: string;

  constructor(
    textRenderer: TextRenderer,
    props: CanvasFontProps,
    private measureContext:
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D,
  ) {
    super(textRenderer, props);
    this.url = props.fontUrl;
    this.metrics = props.metrics;
  }

  load() {
    if (this.state !== FontState.Created) {
      return;
    }
    if (this.family === 'sans-serif') {
      // Default font, skip loading
      this.onLoaded();
      return;
    }

    this.state = FontState.Loading;
    new FontFace(this.family, `url(${this.url})`)
      .load()
      .then((loadedFont) => {
        (document.fonts as FontFaceSetWithAdd).add(loadedFont);
        this.onLoaded();
      })
      .catch((error) => {
        this.state = FontState.Failed;
        console.error(`Failed to load font: ${this.family}`, error);
        this.emit('failed');
        throw error;
      });
  }

  measureText(text: string, letterSpacing: number): number {
    if (letterSpacing === 0) {
      return this.measureContext.measureText(text).width;
    }
    if (hasZeroWidthSpace(text) === false) {
      return (
        this.measureContext.measureText(text).width +
        letterSpacing * text.length
      );
    }
    return text.split('').reduce((acc, char) => {
      if (hasZeroWidthSpace(char) === true) {
        return acc;
      }
      return acc + this.measureContext.measureText(char).width + letterSpacing;
    }, 0);
  }

  override getMetrics(fontSize: number): NormalizedFontMetrics {
    let m = this.normalizedMetrics![fontSize];
    if (m !== undefined) {
      return m;
    }
    let metrics = this.metrics;

    if (metrics === undefined) {
      metrics = calculateCanvasMetrics(
        this.family,
        fontSize,
        this.measureContext,
      );
    }
    m = this.normalizedMetrics![fontSize] = normalizeFontMetrics(
      metrics,
      fontSize,
    );

    console.log(
      'normalized metrics for font',
      this.family,
      'at size',
      fontSize,
      'calculated as',
      m,
    );
    return m;
  }
}

function calculateCanvasMetrics(
  fontFamily: string,
  fontSize: number,
  measureContext: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
) {
  // If the font face doesn't have metrics defined, we fallback to using the
  // browser's measureText method to calculate take a best guess at the font
  // actual font's metrics.
  // - fontBoundingBox[Ascent|Descent] is the best estimate but only supported
  //   in Chrome 87+ (2020), Firefox 116+ (2023), and Safari 11.1+ (2018).
  //   - It is an estimate as it can vary between browsers.
  // - actualBoundingBox[Ascent|Descent] is less accurate and supported in
  //   Chrome 77+ (2019), Firefox 74+ (2020), and Safari 11.1+ (2018).
  // - If neither are supported, we'll use some default values which will
  //   get text on the screen but likely not be great.
  // NOTE: It's been decided not to rely on fontBoundingBox[Ascent|Descent]
  // as it's browser support is limited and it also tends to produce higher than
  // expected values. It is instead HIGHLY RECOMMENDED that developers provide
  // explicit metrics in the font face definition.

  // Ensure font is loaded by checking document.fonts
  if (!document.fonts.check(`${fontSize}px ${fontFamily}`)) {
    console.warn(
      `Font ${fontFamily} may not be fully loaded yet when calculating metrics`,
    );
  }

  measureContext.font = `${fontSize}px ${fontFamily}`;

  const metrics = measureContext.measureText(
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  );
  console.warn(
    `Font metrics not provided for Canvas Web font ${fontFamily}. ` +
      'Using fallback values. It is HIGHLY recommended you use the latest ' +
      'version of the Lightning 3 `msdf-generator` tool to extract the default ' +
      'metrics for the font and provide them in the Canvas Web font definition.',
  );
  const ascender =
    metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent ?? 0;
  const descender =
    metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent ?? 0;

  const emHeight =
    (metrics.emHeightAscent ?? 0) + (metrics.emHeightDescent ?? 0);
  const unitsPerEm = emHeight > 0 ? emHeight : ascender + descender;

  return {
    ascender,
    descender: -descender,
    lineGap: emHeight - (ascender + descender),
    unitsPerEm,
  };
}
