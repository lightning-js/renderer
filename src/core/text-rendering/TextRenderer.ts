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

import type { CoreTextNodeProps } from '../CoreTextNode.js';
import type { CoreRenderer } from '../renderers/CoreRenderer.js';
import type { Stage } from '../Stage.js';

// Text baseline and vertical align types
export type TextBaseline =
  | 'alphabetic'
  | 'hanging'
  | 'middle'
  | 'ideographic'
  | 'bottom';
export type TextVerticalAlign = 'top' | 'middle' | 'bottom';
export type TextRenderers = 'canvas' | 'sdf';
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

  maxWidth: number;
  maxHeight: number;
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
  lineHeight: number;
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

  /**
   * contain mode for text
   *
   * @remarks
   *
   * This property sets how the text should be contained within its bounding box.
   *
   * - 'width': The text is contained within the specified maxWidth, horizontal position of text will adjust according to {@link textAlign}.
   * - 'height': The text is contained within the specified maxHeight, vertical position of text will adjust according to {@link verticalAlign}.
   * - 'both': The text is contained within both the specified maxWidth and maxHeight.
   * - 'none': The text is not contained within any bounding box.
   *
   * @default 'none'
   */
  contain: 'width' | 'height' | 'both' | 'none';
}

/**
 * Glyph layout information for WebGL rendering
 */
export interface GlyphLayout {
  /**
   * Unicode codepoint
   */
  codepoint: number;
  /**
   * Glyph ID in the font atlas
   */
  glyphId: number;
  /**
   * X position relative to text origin
   */
  x: number;
  /**
   * Y position relative to text origin
   */
  y: number;
  /**
   * Width of glyph in font units
   */
  width: number;
  /**
   * Height of glyph in font units
   */
  height: number;
  /**
   * X offset for glyph positioning
   */
  xOffset: number;
  /**
   * Y offset for glyph positioning
   */
  yOffset: number;
  /**
   * Atlas texture coordinates (normalized 0-1)
   */
  atlasX: number;
  atlasY: number;
  atlasWidth: number;
  atlasHeight: number;
}

/**
 * Complete text layout information for caching
 */
export interface TextLayout {
  /**
   * Individual glyph layouts
   */
  glyphs: GlyphLayout[];
  /**
   * Total text width
   */
  width: number;
  /**
   * Total text height
   */
  height: number;
  /**
   * Font scale factor
   */
  fontScale: number;
  /**
   * Line height
   */
  lineHeight: number;
  /**
   * Font family used
   */
  fontFamily: string;
  /**
   * distanceRange used
   */
  distanceRange: number;
}

export interface FontLoadOptions {
  fontFamily: string;
  metrics?: FontMetrics;
  // For Canvas/traditional font loading
  fontUrl?: string;
  // For SDF/atlas-based font loading
  atlasUrl?: string;
  atlasDataUrl?: string;
}

/**
 * Measure Width of Text function to be defined in font handlers, used in TextLayoutEngine
 */
export type MeasureTextFn = (
  text: string,
  fontFamily: string,
  letterSpacing: number,
) => number;

export interface FontHandler {
  init: (
    c: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  ) => void;
  type: 'canvas' | 'sdf';
  isFontLoaded: (fontFamily: string) => boolean;
  loadFont: (stage: Stage, options: FontLoadOptions) => Promise<void>;
  waitingForFont: (fontFamily: string, CoreTextNode) => void;
  stopWaitingForFont: (fontFamily: string, CoreTextNode) => void;
  getFontFamilies: () => FontFamilyMap;
  canRenderFont: (trProps: TrProps) => boolean;
  getFontMetrics: (
    fontFamily: string,
    fontSize: number,
  ) => NormalizedFontMetrics;
  measureText: MeasureTextFn;
}

export interface TextRenderProps {
  fontFamily: string;
  fontSize: number;
  color: number;
  offsetY: number;
  worldAlpha: number;
  globalTransform: Float32Array;
  clippingRect: unknown;
  width: number;
  height: number;
  parentHasRenderTexture: boolean;
  framebufferDimensions: unknown;
  stage: Stage;
}

export interface TextRenderInfo {
  width: number;
  height: number;
  hasRemainingText?: boolean;
  remainingLines?: number;
  imageData?: ImageData | null; // Image data for Canvas Text Renderer
  layout?: TextLayout; // Layout data for SDF renderer caching
}

export interface TextRenderer {
  type: 'canvas' | 'sdf';
  font: FontHandler;
  renderText: (props: CoreTextNodeProps) => TextRenderInfo;
  // Updated to accept layout data and return vertex buffer for performance
  addQuads: (layout?: TextLayout) => Float32Array | null;
  renderQuads: (
    renderer: CoreRenderer,
    layout: TextLayout,
    vertexBuffer: Float32Array,
    renderProps: TextRenderProps,
  ) => void;
  init: (stage: Stage) => void;
}

/**
 * Text line struct for text mapping
 * 0 - text
 * 1 - width
 * 2 - line offset x
 * 3 - line offset y
 */
export type TextLineStruct = [string, number, number, number];

/**
 * Wrapped lines struct for text mapping
 * 0 - line structs
 * 1 - remaining lines
 * 2 - remaining text
 */
export type WrappedLinesStruct = [TextLineStruct[], number, boolean];

/**
 * Wrapped lines struct for text mapping
 * 0 - line structs
 * 1 - remaining lines
 * 2 - remaining text
 * 3 - bare line height
 * 4 - line height pixels
 * 5 - effective width
 * 6 - effective height
 */
export type TextLayoutStruct = [
  TextLineStruct[],
  number,
  boolean,
  number,
  number,
  number,
  number,
];
