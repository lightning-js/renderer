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

import type { Stage } from '../../Stage.js';

import type {
  TextBaseline,
  TextVerticalAlign,
} from './LightningTextTextureRenderer.js';

/**
 * Structure mapping font family names to a set of font faces.
 */
export interface FontFamilyMap {
  [familyName: string]: FontFace;
}

/**
 * Font metrics used for layout and default line height calculations.
 */
export interface FontMetrics {
  /**
   * The distance, in font units, from the baseline to the highest point of the font.
   */
  ascender: number;
  /**
   * The distance, in font units, from the baseline to the lowest point of the font.
   */
  descender: number;
  /**
   * The additional space used in the calculation of the default line height in font units.
   */
  lineGap: number;
  /**
   * The number of font units per 1 EM.
   */
  unitsPerEm: number;
}

/**
 * Normalized font metrics where values are expressed as a fraction of 1 EM.
 */
export interface NormalizedFontMetrics {
  /**
   * The distance, as a fraction of 1 EM, from the baseline to the highest point of the font.
   */
  ascender: number;
  /**
   * The distance, as a fraction of 1 EM, from the baseline to the lowest point of the font.
   */
  descender: number;
  /**
   * The additional space used in the calculation of the default line height as a fraction of 1 EM
   */
  lineGap: number;
}

/**
 * Text renderer properties that are used in resolving appropriate font faces
 *
 * @remarks
 * Extended by {@link TrProps}
 */
export interface TrFontProps {
  /**
   * Font Family
   *
   * @internalRemarks
   * `fontFamily` is defined currently as single string, but in the future we may want to
   * support multiple font family fallbacks, as this is supported by CSS / Canvas2d. We can
   * do this in a backwards compatible way by unioning an array of strings to the
   * `fontFamily` property.
   */
  fontFamily: string;
  /**
   * Font Style
   *
   * @remarks
   * The font style to use when looking up the font face. This can be one of the
   * following strings:
   * - `'normal'`
   * - `'italic'`
   * - `'oblique'`
   */
  fontStyle: 'normal' | 'italic' | 'oblique';
  /**
   * Font Size
   *
   * @remarks
   * The font size to use when looking up the font face.
   *
   * The font size is specified in pixels and is the height of the font's
   * em-square. The em-square is essentially the height of the capital letters
   * for the font. The actual height of the text can be larger than the
   * specified font size, as the font may have ascenders and descenders that
   * extend beyond the em-square.
   *
   * @default 16
   */
  fontSize: number;
}

export interface TrProps extends TrFontProps {
  /**
   * Text to display
   *
   * @default ''
   */
  text: string;
  /**
   * Text alignment
   *
   * @remarks
   * Alignment of the text relative to it's contained bounds. For best results,
   * use {@link contain} mode `'width'` or `'both'` and a set an explicit
   * {@link width} for the text to be aligned within.
   *
   * @default 'left'
   */
  textAlign: 'left' | 'center' | 'right';
  /**
   * Color of text
   *
   * @remarks
   * The color value is a number in the format 0xRRGGBBAA, where RR is the red
   * component, GG is the green component, BB is the blue component, and AA is
   * the alpha component.
   *
   * @default 0xffffffff (opaque white)
   */
  color: number;
  x: number;
  y: number;
  /**
   * Contain mode for text
   *
   * @remarks
   * The contain mode determines how the text is contained within the bounds
   * of the Text Node. The default value is `'none'`, which means that the
   * Text Renderer will not constrain the text in any way. `'width'` mode will
   * constrain the text to the set width wrapping lines as necessary, and
   * `'both'` mode will constrain the text to both the set width and height
   * wrapping lines and truncating text as necessary.
   *
   * ## Text Auto-size Behavior
   * Depending on the set contain mode, after the text 'loaded' event is emitted,
   * the text node may have either its {@link width} and {@link height} updated
   * to match the rendered size of the text.
   *
   * When contain mode is 'none', both the {@link width} and {@link height}
   * properties are updated.
   *
   * When contain mode is 'width', only the {@link height} property is updated.
   *
   * When contain mode is 'both', neither property is updated.
   *
   * @default 'none'
   */
  contain: 'none' | 'width' | 'both';
  width: number;
  height: number;
  /**
   * Vertical offset for text
   *
   * @remarks
   * The vertical offset of the text.
   *
   * @default 0
   */
  offsetY: number;
  /**
   * Letter spacing for text (in pixels)
   *
   * @remarks
   * This property sets additional (or reduced, if value is negative) spacing
   * between characters in the text.
   *
   * @default 0
   */
  letterSpacing: number;
  /**
   * Line height for text (in pixels)
   *
   * @remarks
   * This property sets the height of each line. If set to `undefined`, the
   * line height will be calculated based on the font and font size to be the
   * minimal height required to completely contain a line of text.
   *
   * See: https://github.com/lightning-js/renderer/issues/170
   *
   * @default `undefined`
   */
  lineHeight: number | undefined;
  /**
   * Max lines for text
   *
   * @remarks
   * This property sets max number of lines of a text paragraph.
   * Not yet implemented in the SDF renderer.
   *
   * @default 0
   */
  maxLines: number;
  /**
   * Baseline for text
   *
   * @remarks
   * This property sets the text baseline used when drawing text.
   * Not yet implemented in the SDF renderer.
   *
   * @default alphabetic
   */
  textBaseline: TextBaseline;
  /**
   * Vertical Align for text when lineHeight > fontSize
   *
   * @remarks
   * This property sets the vertical align of the text.
   * Not yet implemented in the SDF renderer.
   *
   * @default middle
   */
  verticalAlign: TextVerticalAlign;
  /**
   * Overflow Suffix for text
   *
   * @remarks
   * The suffix to be added when text is cropped due to overflow.
   * Not yet implemented in the SDF renderer.
   *
   * @default "..."
   */
  overflowSuffix: string;

  /**
   * Word Break for text
   *
   * @remarks
   * This property sets how words should break when reaching the end of a line.
   *
   * - `'normal'`: Use the default line break rule.
   * - `'break-all'`: To prevent overflow, word breaks should happen between any two characters.
   * - `'break-word'`: To prevent overflow, word breaks should happen between words. If words are too long word breaks happen between any two characters.
   *
   * @default "normal"
   */
  wordBreak: 'normal' | 'break-all' | 'break-word';

  zIndex: number;
}

export interface FontHandler {
  init: () => void;
  type: 'canvas' | 'sdf';
  addFontFace: (fontFace: FontFace) => void;
  isFontLoaded: (cssString: string) => boolean;
  loadFont: (cssString: string) => Promise<void>;
  getFontFamilies: () => FontFamilyMap;
  getFontFamilyArray: () => FontFamilyMap[];
  canRenderFont: (trProps: TrProps) => boolean;
}

export interface TextRenderer {
  type: 'canvas' | 'sdf';
  fontHandler: FontHandler;
  renderText: (
    stage: Stage,
    props: TrProps,
  ) => Promise<{
    imageData: ImageData | null;
    width: number;
    height: number;
  }>;
  // Fixme implement this for MSDF renderer
  // and update the properties to match
  addQuads: (quads: unknown) => void;
  init: () => void;
}
