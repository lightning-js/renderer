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

import { EventEmitter } from '../../../common/EventEmitter.js';
import { assertTruthy } from '../../../utils.js';
import type { CoreNode } from '../../CoreNode.js';
import type { CoreTextNode, CoreTextNodeProps } from '../../CoreTextNode.js';
import type { Stage } from '../../Stage.js';
import {
  getNormalizedRgbaComponents,
  getNormalizedAlphaComponent,
} from '../../lib/utils.js';
import { type FontFamilyMap } from '../TrFontManager.js';
import type { TrFontFace } from '../font-face-types/TrFontFace.js';
import { WebTrFontFace } from '../font-face-types/WebTrFontFace.js';
import {
  LightningTextTextureRenderer,
  type RenderInfo,
} from './LightningTextTextureRenderer.js';
import {
  TextRenderer,
  type TrFontProps,
  type TrProps,
} from './TextRenderer.js';

const resolvedGlobal = typeof self === 'undefined' ? globalThis : self;

/**
 * Global font set regardless of if run in the main thread or a web worker
 */
const globalFontSet: FontFaceSet = (resolvedGlobal.document?.fonts ||
  (resolvedGlobal as any).fonts) as FontFaceSet;

declare module './TextRenderer.js' {
  interface TextRendererMap {
    canvas: CanvasTextRenderer;
  }
}

function getFontCssString(props: TrProps): string {
  const { fontFamily, fontStyle, fontWeight, fontStretch, fontSize } = props;
  return [fontStyle, fontWeight, fontStretch, `${fontSize}px`, fontFamily].join(
    ' ',
  );
}

export class CanvasTextRenderer extends TextRenderer {
  protected canvas: OffscreenCanvas | HTMLCanvasElement;
  protected context:
    | OffscreenCanvasRenderingContext2D
    | CanvasRenderingContext2D;
  /**
   * Font family map used to store web font faces that were added to the
   * canvas text renderer.
   */
  private fontFamilies: FontFamilyMap = {};
  private fontFamilyArray: FontFamilyMap[] = [this.fontFamilies];

  public type: 'canvas' | 'sdf' = 'canvas';

  constructor(stage: Stage) {
    super(stage);
    if (typeof OffscreenCanvas !== 'undefined') {
      this.canvas = new OffscreenCanvas(0, 0);
    } else {
      this.canvas = document.createElement('canvas');
    }

    let context = this.canvas.getContext('2d') as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;
    if (!context) {
      // A browser may appear to support OffscreenCanvas but not actually support the Canvas '2d' context
      // Here we try getting the context again after falling back to an HTMLCanvasElement.
      // See: https://github.com/lightning-js/renderer/issues/26#issuecomment-1750438486
      this.canvas = document.createElement('canvas');
      context = this.canvas.getContext('2d');
    }

    assertTruthy(context);
    this.context = context;

    // Install the default 'san-serif' font face
    this.addFontFace(
      new WebTrFontFace({
        fontFamily: 'sans-serif',
        descriptors: {},
        fontUrl: '',
      }),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override canRenderFont(props: TrFontProps): boolean {
    // The canvas renderer can render any font because it automatically
    // falls back to system fonts. The CanvasTextRenderer should be
    // checked last if other renderers are preferred.
    return true;
  }

  override isFontFaceSupported(fontFace: TrFontFace): boolean {
    return fontFace instanceof WebTrFontFace;
  }

  isFontLoaded(props: CoreTextNodeProps): boolean {
    return globalFontSet.check(getFontCssString(props));
  }

  override addFontFace(fontFace: TrFontFace): void {
    // Make sure the font face is an Canvas font face (it should have already passed
    // the `isFontFaceSupported` check)
    assertTruthy(fontFace instanceof WebTrFontFace);

    const fontFamily = fontFace.fontFamily;

    // Add the font face to the document
    // Except for the 'sans-serif' font family, which the Renderer provides
    // as a special default fallback.
    if (fontFamily !== 'sans-serif') {
      // @ts-expect-error `add()` method should be available from a FontFaceSet
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      globalFontSet.add(fontFace.fontFace);
    }

    let faceSet = this.fontFamilies[fontFamily];
    if (!faceSet) {
      faceSet = new Set();
      this.fontFamilies[fontFamily] = faceSet;
    }
    faceSet.add(fontFace);
  }

  renderText(props: CoreTextNodeProps): void {

    // load the canvas texture
    assertTruthy(renderInfo);
    lightning2TextRenderer.draw(renderInfo, {
      lines: renderInfo.lines,
      lineWidths: renderInfo.lineWidths,
    });
    if (this.canvas.width === 0 || this.canvas.height === 0) {
      return null;
    }
    return this.context.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );




    const texture = this.stage.txManager.createTexture('ImageTexture', {
      premultiplyAlpha: true,
      src:

    if (state.textureNode) {
      // Use the existing texture node
      state.textureNode.texture = texture;
      // Update the alpha
      state.textureNode.alpha = getNormalizedAlphaComponent(state.props.color);
    } else {
      // Create a new texture node
      const textureNode = this.stage.createNode({
        parent: node,
        texture,
        autosize: true,
        // The alpha channel of the color is ignored when rasterizing the text
        // texture so we need to pass it directly to the texture node.
        alpha: getNormalizedAlphaComponent(state.props.color),
      });
      state.textureNode = textureNode;
    }

    this.setStatus(state, 'loaded');
  }

  loadFont = (props: CoreTextNodeProps): Promise<void> => {
    // this shouldnt be necessary?
    if (this.isFontLoaded(props)) {
      assertTruthy(this.fontFamilies[props.fontFamily], 'font already loaded');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const cssString = getFontCssString(props);

      const trFontFace = this.stage.fontManager.resolveFontFace(
        this.fontFamilyArray,
        props,
        'canvas',
      ) as WebTrFontFace | undefined;

      assertTruthy(trFontFace, `Could not resolve font face for ${cssString}`);

      // If font is not loaded, set up a handler to update the font info when the font loads
      globalFontSet.load(cssString)
      .then(() => {
        this.addFontFace(trFontFace);
        resolve();
      })
      .catch(reject);
    });
  };

}
