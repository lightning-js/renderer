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
import type { CoreTextNode } from '../../CoreTextNode.js';
import type { Stage } from '../../Stage.js';
import {
  getNormalizedRgbaComponents,
  getNormalizedAlphaComponent,
} from '../../lib/utils.js';
import type { ImageTexture } from '../../textures/ImageTexture.js';
import { TrFontManager, type FontFamilyMap } from '../TrFontManager.js';
import type { TrFontFace } from '../font-face-types/TrFontFace.js';
import { WebTrFontFace } from '../font-face-types/WebTrFontFace.js';
import {
  LightningTextTextureRenderer,
  type RenderInfo,
} from './LightningTextTextureRenderer.js';
import {
  TextRenderer,
  type TextRendererState,
  type TrFontProps,
  type TrPropSetters,
  type TrProps,
} from './TextRenderer.js';

const resolvedGlobal = typeof self === 'undefined' ? globalThis : self;

/**
 * Global font set regardless of if run in the main thread or a web worker
 */
const globalFontSet = ((resolvedGlobal.document as any)?.fonts ||
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

export interface CanvasTextRendererState extends TextRendererState {
  node: CoreTextNode;
  props: TrProps;
  fontInfo:
    | {
        fontFace: WebTrFontFace;
        cssString: string;
        loaded: boolean;
      }
    | undefined;
  textureNode: CoreNode | undefined;
  lightning2TextRenderer: LightningTextTextureRenderer;
  renderInfo: RenderInfo | undefined;
}

export class CanvasTextRenderer extends TextRenderer<CanvasTextRendererState> {
  // protected canvas: HTMLCanvasElement;
  // protected context: CanvasRenderingContext2D;
  /**
   * Font family map used to store web font faces that were added to the
   * canvas text renderer.
   */
  private fontFamilies: FontFamilyMap = {};
  private fontFamilyArray: FontFamilyMap[] = [this.fontFamilies];

  constructor(stage: Stage) {
    super(stage);
    // this.canvas = document.createElement('canvas');
    // const context = this.canvas.getContext('2d', {
    //   willReadFrequently: true,
    // });
    // assertTruthy(context);
    // this.context = context;

    // Install the default 'san-serif' font face
    this.addFontFace(
      new WebTrFontFace({
        fontFamily: 'sans-serif',
        descriptors: {},
        fontUrl: '',
      }),
    );
  }

  //#region Overrides
  override getPropertySetters(): Partial<
    TrPropSetters<CanvasTextRendererState>
  > {
    return {
      fontFamily: (state, value) => {
        state.props.fontFamily = value;
        state.fontInfo = undefined;
        this.invalidateLayoutCache(state);
      },
      fontWeight: (state, value) => {
        state.props.fontWeight = value;
        state.fontInfo = undefined;
        this.invalidateLayoutCache(state);
      },
      fontStyle: (state, value) => {
        state.props.fontStyle = value;
        state.fontInfo = undefined;
        this.invalidateLayoutCache(state);
      },
      fontStretch: (state, value) => {
        state.props.fontStretch = value;
        state.fontInfo = undefined;
        this.invalidateLayoutCache(state);
      },
      fontSize: (state, value) => {
        state.props.fontSize = value;
        state.fontInfo = undefined;
        this.invalidateLayoutCache(state);
      },
      text: (state, value) => {
        state.props.text = value;
        this.invalidateLayoutCache(state);
      },
      textAlign: (state, value) => {
        state.props.textAlign = value;
        this.invalidateLayoutCache(state);
      },
      color: (state, value) => {
        state.props.color = value;
        this.invalidateLayoutCache(state);
      },
      x: (state, value) => {
        state.props.x = value;
      },
      y: (state, value) => {
        state.props.y = value;
      },
      contain: (state, value) => {
        state.props.contain = value;
        this.invalidateLayoutCache(state);
      },
      width: (state, value) => {
        state.props.width = value;
        // Only invalidate layout cache if we're containing in the horizontal direction
        if (state.props.contain !== 'none') {
          this.invalidateLayoutCache(state);
        }
      },
      height: (state, value) => {
        state.props.height = value;
        // Only invalidate layout cache if we're containing in the vertical direction
        if (state.props.contain === 'both') {
          this.invalidateLayoutCache(state);
        }
      },
      offsetY: (state, value) => {
        state.props.offsetY = value;
        this.invalidateLayoutCache(state);
      },
      scrollY: (state, value) => {
        state.props.scrollY = value;
      },
      letterSpacing: (state, value) => {
        state.props.letterSpacing = value;
        this.invalidateLayoutCache(state);
      },
      lineHeight: (state, value) => {
        state.props.lineHeight = value;
        this.invalidateLayoutCache(state);
      },
      maxLines: (state, value) => {
        state.props.maxLines = value;
        this.invalidateLayoutCache(state);
      },
      textBaseline: (state, value) => {
        state.props.textBaseline = value;
        this.invalidateLayoutCache(state);
      },
      verticalAlign: (state, value) => {
        state.props.verticalAlign = value;
        this.invalidateLayoutCache(state);
      },
      overflowSuffix: (state, value) => {
        state.props.overflowSuffix = value;
        this.invalidateLayoutCache(state);
      },
    };
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

  override addFontFace(fontFace: TrFontFace): void {
    // Make sure the font face is an Canvas font face (it should have already passed
    // the `isFontFaceSupported` check)
    assertTruthy(fontFace instanceof WebTrFontFace);

    // Add the font face to the document
    // Except for the 'sans-serif' font family, which the Renderer provides
    // as a special default fallback.
    if (fontFace.fontFamily !== 'sans-serif') {
      // @ts-expect-error `add()` method should be available from a FontFaceSet
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      globalFontSet.add(fontFace.fontFace);
    }

    const { fontFamilies } = this;
    const familyName = fontFace.fontFace.family;

    let faceSet = fontFamilies[familyName];
    if (!faceSet) {
      faceSet = new Set();
      fontFamilies[familyName] = faceSet;
    }

    faceSet.add(fontFace);
  }

  override createState(
    props: TrProps,
    node: CoreTextNode,
  ): CanvasTextRendererState {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    assertTruthy(context);
    return {
      node,
      props,
      status: 'initialState',
      updateScheduled: false,
      emitter: new EventEmitter(),
      textureNode: undefined,
      lightning2TextRenderer: new LightningTextTextureRenderer(canvas, context),
      renderInfo: undefined,
      forceFullLayoutCalc: false,
      textW: 0,
      textH: 0,
      fontInfo: undefined,
      isRenderable: false,
      debugData: {
        updateCount: 0,
        layoutCount: 0,
        drawCount: 0,
        lastLayoutNumCharacters: 0,
        layoutSum: 0,
        drawSum: 0,
        bufferSize: 0,
      },
    };
  }

  override updateState(state: CanvasTextRendererState): void {
    // On the first update call we need to set the status to loading
    if (state.status === 'initialState') {
      this.setStatus(state, 'loading');
      // check if we're on screen
      // if (this.isValidOnScreen(state) === true) {
      //   this.setStatus(state, 'loading');
      // }
    }

    if (state.status === 'loaded') {
      // If we're loaded, we don't need to do anything
      return;
    }

    // If fontInfo is invalid, we need to establish it
    if (!state.fontInfo) {
      state.fontInfo = this.loadFont(state);
    }

    // If we're waiting for a font face to load, don't render anything
    if (!state.fontInfo.loaded) {
      return;
    }

    if (!state.renderInfo) {
      state.renderInfo = this.calculateRenderInfo(state);
      state.textH = state.renderInfo.lineHeight * state.renderInfo.lines.length;
      state.textW = state.renderInfo.width;
      this.renderSingleCanvasPage(state);
    }

    // handle scrollable text !!!
    // if (state.isScrollable === true) {
    //   return this.renderScrollableCanvasPages(state);
    // }

    // handle single page text
  }

  renderSingleCanvasPage(state: CanvasTextRendererState): void {
    assertTruthy(state.renderInfo);
    const node = state.node;

    const texture = this.stage.txManager.loadTexture('ImageTexture', {
      src: function (
        this: CanvasTextRenderer,
        lightning2TextRenderer: LightningTextTextureRenderer,
        renderInfo: RenderInfo,
      ) {
        // load the canvas texture
        assertTruthy(renderInfo);
        lightning2TextRenderer.draw(renderInfo, {
          lines: renderInfo.lines,
          lineWidths: renderInfo.lineWidths,
        });
        if (
          lightning2TextRenderer.canvas.width === 0 ||
          lightning2TextRenderer.canvas.height === 0
        ) {
          return null;
        }
        return lightning2TextRenderer.canvas;
      }.bind(this, state.lightning2TextRenderer, state.renderInfo),
    });
    if (state.textureNode) {
      // Free the existing texture
      state.textureNode.texture!.ctxTexture.free();
      // Use the existing texture node
      state.textureNode.texture = texture;
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

  private loadFont(state: CanvasTextRendererState) {
    const cssString = getFontCssString(state.props);
    const trFontFace = TrFontManager.resolveFontFace(
      this.fontFamilyArray,
      state.props,
    ) as WebTrFontFace | undefined;
    assertTruthy(trFontFace, `Could not resolve font face for ${cssString}`);
    const fontInfo = {
      fontFace: trFontFace,
      cssString: cssString,
      // TODO: For efficiency we would use this here but it's not reliable on WPE -> document.fonts.check(cssString),
      loaded: globalFontSet.check(cssString),
    };
    // If font is not loaded, set up a handler to update the font info when the font loads
    if (!fontInfo.loaded) {
      globalFontSet
        .load(cssString)
        .then(this.onFontLoaded.bind(this, state, cssString))
        .catch(this.onFontLoadError.bind(this, state, cssString));
    }
    return fontInfo;
  }

  calculateRenderInfo(state: CanvasTextRendererState): RenderInfo {
    state.lightning2TextRenderer.settings = {
      text: state.props.text,
      textAlign: state.props.textAlign,
      fontFamily: state.props.fontFamily,
      trFontFace: state.fontInfo?.fontFace,
      fontSize: state.props.fontSize,
      fontStyle: [
        state.props.fontStretch,
        state.props.fontStyle,
        state.props.fontWeight,
      ].join(' '),
      textColor: getNormalizedRgbaComponents(state.props.color),
      offsetY: state.props.offsetY,
      wordWrap: state.props.contain !== 'none',
      wordWrapWidth:
        state.props.contain === 'none' ? undefined : state.props.width,
      letterSpacing: state.props.letterSpacing,
      lineHeight: state.props.lineHeight ?? null,
      maxLines: state.props.maxLines,
      maxHeight:
        state.props.contain === 'both'
          ? state.props.height - state.props.offsetY
          : null,
      textBaseline: state.props.textBaseline,
      verticalAlign: state.props.verticalAlign,
      overflowSuffix: state.props.overflowSuffix,
      w: state.props.contain !== 'none' ? state.props.width : undefined,
    };
    state.renderInfo = state.lightning2TextRenderer.calculateRenderInfo();
    return state.renderInfo;
  }

  override renderQuads(): void {
    // Do nothing. The renderer will render the child node(s) that were created
    // in the state update.
    return;
  }

  override destroyState(state: CanvasTextRendererState): void {
    if (state.status === 'destroyed') {
      return;
    }
    super.destroyState(state);

    if (state.textureNode) {
      state.textureNode.texture?.ctxTexture.free();
      state.textureNode.destroy();
      state.textureNode = undefined;
    }
    state.renderInfo = undefined;
  }
  //#endregion Overrides

  /**
   * Invalidate the layout cache stored in the state. This will cause the text
   * to be re-rendered on the next update.
   *
   * @remarks
   * This also invalidates the visible window cache.
   *
   * @param state
   */
  private invalidateLayoutCache(state: CanvasTextRendererState): void {
    state.renderInfo = undefined;
    this.setStatus(state, 'loading');
    this.scheduleUpdateState(state);
  }

  private onFontLoaded(
    state: CanvasTextRendererState,
    cssString: string,
  ): void {
    if (cssString !== state.fontInfo?.cssString || !state.fontInfo) {
      return;
    }
    state.fontInfo.loaded = true;
    this.scheduleUpdateState(state);
  }

  private onFontLoadError(
    state: CanvasTextRendererState,
    cssString: string,
    error: Error,
  ): void {
    if (cssString !== state.fontInfo?.cssString || !state.fontInfo) {
      return;
    }

    // Font didn't actually load, but we'll log the error and mark it as loaded
    // because the browser can still render with a fallback font.
    state.fontInfo.loaded = true;

    console.error(
      `CanvasTextRenderer: Error loading font '${state.fontInfo.cssString}'`,
      error,
    );
    this.scheduleUpdateState(state);
  }
}
