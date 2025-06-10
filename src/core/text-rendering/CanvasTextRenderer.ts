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
import type { Stage } from '../Stage.js';
import { getNormalizedRgbaComponents } from '../lib/utils.js';
import type { FontHandler, TrProps } from './renderers/TextRenderer.js';
import { WebTrFontFace } from './font-face-types/WebTrFontFace.js';
import { LightningTextTextureRenderer } from './renderers/LightningTextTextureRenderer.js';
import * as CanvasFontHandler from './CanvasFontHandler.js';
import { getFontFamilyArray } from './CanvasFontHandler.js';

export const type = 'canvas';

/**
 * Get CSS font string from props
 */
const getFontCssString = (props: TrProps): string => {
  const { fontFamily, fontStyle, fontSize } = props;
  return [fontStyle, `${fontSize}px`, fontFamily].join(' ');
};

/**
 * Configure Lightning text renderer settings
 */
const configureLightningRenderer = (
  lightningRenderer: LightningTextTextureRenderer,
  props: TrProps,
  trFontFace: WebTrFontFace,
): void => {
  lightningRenderer.settings = {
    text: props.text,
    textAlign: props.textAlign,
    fontFamily: props.fontFamily,
    trFontFace: trFontFace,
    fontSize: props.fontSize,
    fontStyle: props.fontStyle,
    textColor: getNormalizedRgbaComponents(props.color || 0xffffffff),
    offsetY: props.offsetY || 0,
    wordWrap: props.contain !== 'none',
    wordWrapWidth: props.contain === 'none' ? undefined : props.width || 0,
    letterSpacing: props.letterSpacing || 0,
    lineHeight: props.lineHeight ?? null,
    maxLines: props.maxLines || 0,
    maxHeight:
      props.contain === 'both'
        ? (props.height || 0) - (props.offsetY || 0)
        : null,
    textBaseline: props.textBaseline,
    verticalAlign: props.verticalAlign,
    overflowSuffix: props.overflowSuffix,
    wordBreak: props.wordBreak,
    w: props.contain !== 'none' ? props.width || 0 : undefined,
  };
};

export const init = (): void => {
  /** nothing to init at this stage for Canvas */
};

export const getFontHandler = (): FontHandler => {
  return CanvasFontHandler;
};

/**
 * Canvas text renderer
 *
 * @param stage - Stage instance for font resolution
 * @param props - Text rendering properties
 * @returns Object containing ImageData and dimensions
 */
export const renderText = async (
  stage: Stage,
  props: TrProps,
): Promise<{
  imageData: ImageData | null;
  width: number;
  height: number;
}> => {
  const fontFamilyArray = getFontFamilyArray();
  const trFontFace = stage.fontManager.resolveFontFace(
    fontFamilyArray,
    props,
    'canvas',
  ) as WebTrFontFace | undefined;

  if (!trFontFace) {
    throw new Error(
      `Could not resolve font face for ${getFontCssString(props)}`,
    );
  }

  const canvas = stage.platform.createCanvas();
  const context = canvas.getContext('2d');

  assertTruthy(context, 'Canvas context is not available');

  const lightningTextRenderer = new LightningTextTextureRenderer(
    canvas,
    context,
  );
  configureLightningRenderer(lightningTextRenderer, props, trFontFace);

  const renderInfo = lightningTextRenderer.calculateRenderInfo();
  lightningTextRenderer.draw(renderInfo, {
    lines: renderInfo.lines,
    lineWidths: renderInfo.lineWidths,
  });

  let imageData: ImageData | null = null;
  if (canvas.width > 0 && canvas.height > 0) {
    imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  }

  return {
    imageData,
    width: renderInfo.width,
    height: renderInfo.lineHeight * renderInfo.lines.length,
  };
};
