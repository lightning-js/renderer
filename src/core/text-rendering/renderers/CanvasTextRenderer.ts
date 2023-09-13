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
import { assertTruthy } from '../../../utils.js';
import type { Stage } from '../../Stage.js';
import {
  intersectRect,
  type Bound,
  intersectBound,
  getNormalizedRgbaComponents,
} from '../../lib/utils.js';
import type { ImageTexture } from '../../textures/ImageTexture.js';
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

/**
 * Global font set regardless of if run in the main thread or a web worker
 */
const globalFontSet = ((self.document as any)?.fonts ||
  (self as any).fonts) as FontFaceSet;

declare module './TextRenderer.js' {
  interface TextRendererMap {
    canvas: CanvasTextRenderer;
  }
}

interface CanvasPageInfo {
  texture: ImageTexture | undefined;
  lineNumStart: number;
  lineNumEnd: number;
  valid: boolean;
}

function getFontCssString(props: TrProps): string {
  const { fontFamily, fontStyle, fontWeight, fontStretch, fontSize } = props;
  return [fontStyle, fontWeight, fontStretch, `${fontSize}px`, fontFamily].join(
    ' ',
  );
}

export interface CanvasTextRendererState extends TextRendererState {
  props: TrProps;

  fontFaceLoadedHandler: (() => void) | undefined;
  fontInfo:
    | {
        cssString: string;
        loaded: boolean;
      }
    | undefined;
  canvasPages: [CanvasPageInfo, CanvasPageInfo, CanvasPageInfo] | undefined;
  lightning2TextRenderer: LightningTextTextureRenderer;
  renderInfo: RenderInfo | undefined;
  renderWindow: Bound | undefined;
}

export class CanvasTextRenderer extends TextRenderer<CanvasTextRendererState> {
  protected canvas: OffscreenCanvas;
  protected context: OffscreenCanvasRenderingContext2D;

  constructor(stage: Stage) {
    super(stage);
    this.canvas = new OffscreenCanvas(0, 0);
    const context = this.canvas.getContext('2d');
    assertTruthy(context);
    this.context = context;
  }

  //#region Overrides
  override getPropertySetters(): Partial<
    TrPropSetters<CanvasTextRendererState>
  > {
    return {
      fontFamily: (state, value) => {
        state.props.fontFamily = value;
        state.fontInfo = undefined;
        this.markForReload(state);
      },
      fontWeight: (state, value) => {
        state.props.fontWeight = value;
        state.fontInfo = undefined;
        this.markForReload(state);
      },
      fontStyle: (state, value) => {
        state.props.fontStyle = value;
        state.fontInfo = undefined;
        this.markForReload(state);
      },
      fontStretch: (state, value) => {
        state.props.fontStretch = value;
        state.fontInfo = undefined;
        this.markForReload(state);
      },
      fontSize: (state, value) => {
        state.props.fontSize = value;
        state.fontInfo = undefined;
        this.markForReload(state);
      },
      text: (state, value) => {
        state.props.text = value;
        this.markForReload(state);
      },
      textAlign: (state, value) => {
        state.props.textAlign = value;
        this.markForReload(state);
      },
      color: (state, value) => {
        state.props.color = value;
        this.markForReload(state);
      },
      x: (state, value) => {
        state.props.x = value;
      },
      y: (state, value) => {
        state.props.y = value;
      },
      contain: (state, value) => {
        state.props.contain = value;
        this.markForReload(state);
      },
      width: (state, value) => {
        state.props.width = value;
        this.markForReload(state);
      },
      height: (state, value) => {
        state.props.height = value;
        this.markForReload(state);
      },
      offsetY: (state, value) => {
        state.props.offsetY = value;
        this.markForReload(state);
      },
      scrollY: (state, value) => {
        state.props.scrollY = value;
      },
      letterSpacing: (state, value) => {
        state.props.letterSpacing = value;
        this.markForReload(state);
      },
      // debug: (state, value) => {
      //   state.props.debug = value;
      // },
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

    // We simply add the font face to the document
    // @ts-expect-error `add()` method should be available from a FontFaceSet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    globalFontSet.add(fontFace.fontFace);
  }

  override createState(props: TrProps): CanvasTextRendererState {
    return {
      props,
      status: 'initialState',
      emitter: new EventEmitter(),
      canvasPages: undefined,
      lightning2TextRenderer: new LightningTextTextureRenderer(
        this.canvas,
        this.context,
      ),
      renderWindow: undefined,
      renderInfo: undefined,
      forceFullLayoutCalc: false,
      textW: 0,
      textH: 0,
      fontInfo: undefined,
      fontFaceLoadedHandler: undefined,
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
    }

    // If fontInfo is invalid, we need to establish it
    if (!state.fontInfo) {
      const cssString = getFontCssString(state.props);
      state.fontInfo = {
        cssString: cssString,
        // TODO: For efficiency we would use this here but it's not reliable on WPE -> document.fonts.check(cssString),
        loaded: false,
      };
      // If font is not loaded, set up a handler to update the font info when the font loads
      if (!state.fontInfo.loaded) {
        globalFontSet
          .load(cssString)
          .then(this.onFontLoaded.bind(this, state, cssString))
          .catch(this.onFontLoadError.bind(this, state, cssString));
        return;
      }
    }

    // If we're waiting for a font face to load, don't render anything
    if (!state.fontInfo.loaded) {
      return;
    }

    if (!state.renderInfo) {
      state.lightning2TextRenderer.settings = {
        text: state.props.text,
        textAlign: state.props.textAlign,
        fontFace: state.props.fontFamily,
        fontSize: state.props.fontSize,
        fontStyle: [
          state.props.fontStretch,
          state.props.fontStyle,
          state.props.fontWeight,
        ].join(' '),
        textColor: getNormalizedRgbaComponents(state.props.color),
        offsetY: state.props.fontSize + state.props.offsetY,
        wordWrap: state.props.contain !== 'none',
        wordWrapWidth:
          state.props.contain === 'none' ? undefined : state.props.width,
        letterSpacing: state.props.letterSpacing,
      };
      const renderInfoCalculateTime = performance.now();
      state.renderInfo = state.lightning2TextRenderer.calculateRenderInfo();
      console.log(
        'Render info calculated in',
        performance.now() - renderInfoCalculateTime,
        'ms',
      );
      state.textH = state.renderInfo.lineHeight * state.renderInfo.lines.length;
      state.textW = state.renderInfo.width;

      // Invalidate renderWindow because the renderInfo changed
      state.renderWindow = undefined;
    }

    const { x, y, width, height, scrollY, contain } = state.props;

    let { renderWindow, canvasPages } = state;

    // Figure out whats actually in the bounds of the renderer/canvas (visibleWindow)
    const rendererBounds: Bound = {
      x1: 0,
      y1: 0,
      x2: this.stage.options.appWidth,
      y2: this.stage.options.appHeight,
    };
    const elementBounds: Bound = {
      x1: x,
      y1: y,
      x2: contain !== 'none' ? x + width : Infinity,
      y2: contain === 'both' ? y + height : Infinity,
    };
    /**
     * Area that is visible on the screen.
     */
    const visibleWindow: Bound = intersectBound(rendererBounds, elementBounds);

    const visibleWindowHeight = visibleWindow.y2 - visibleWindow.y1;

    const maxLinesPerCanvasPage = Math.ceil(
      visibleWindowHeight / state.renderInfo.lineHeight,
    );

    // Return early if we're still viewing inside the established render window
    // No need to re-render what we've already rendered
    if (renderWindow && canvasPages) {
      const renderWindowScreenX1 = x + renderWindow.x1;
      const renderWindowScreenY1 = y - scrollY + renderWindow.y1;
      const renderWindowScreenX2 = x + renderWindow.x2;
      const renderWindowScreenY2 = y - scrollY + renderWindow.y2;

      if (
        renderWindowScreenX1 <= visibleWindow.x1 &&
        renderWindowScreenX2 >= visibleWindow.x2 &&
        renderWindowScreenY1 <= visibleWindow.y1 &&
        renderWindowScreenY2 >= visibleWindow.y2
      )
        return;
      if (renderWindowScreenY2 < visibleWindow.y2) {
        // We've scrolled up, so we need to render the next page
        renderWindow.y1 += maxLinesPerCanvasPage * state.renderInfo.lineHeight;
        renderWindow.y2 += maxLinesPerCanvasPage * state.renderInfo.lineHeight;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        canvasPages.push(canvasPages.shift()!);
        canvasPages[2].lineNumStart =
          canvasPages[1].lineNumStart + maxLinesPerCanvasPage;
        canvasPages[2].lineNumEnd =
          canvasPages[2].lineNumStart + maxLinesPerCanvasPage;
        canvasPages[2].valid = false;
      } else if (renderWindowScreenY1 > visibleWindow.y1) {
        // We've scrolled down, so we need to render the previous page
        renderWindow.y1 -= maxLinesPerCanvasPage * state.renderInfo.lineHeight;
        renderWindow.y2 -= maxLinesPerCanvasPage * state.renderInfo.lineHeight;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        canvasPages.unshift(canvasPages.pop()!);
        canvasPages[0].lineNumStart =
          canvasPages[1].lineNumStart - maxLinesPerCanvasPage;
        canvasPages[0].lineNumEnd =
          canvasPages[0].lineNumStart + maxLinesPerCanvasPage;
        canvasPages[0].valid = false;
      }
    } else {
      const pageHeight = state.renderInfo.lineHeight * maxLinesPerCanvasPage;
      const page1Block = Math.ceil(scrollY / pageHeight);
      const page1LineStart = page1Block * maxLinesPerCanvasPage;
      const page0LineStart = page1LineStart - maxLinesPerCanvasPage;
      const page2LineStart = page1LineStart + maxLinesPerCanvasPage;

      // We haven't rendered anything yet, so we need to render the first page
      // If canvasPages already exist, let's re-use the textures
      canvasPages = [
        {
          texture: canvasPages?.[0].texture,
          lineNumStart: page0LineStart,
          lineNumEnd: page0LineStart + maxLinesPerCanvasPage,
          valid: false,
        },
        {
          texture: canvasPages?.[1].texture,
          lineNumStart: page1LineStart,
          lineNumEnd: page1LineStart + maxLinesPerCanvasPage,
          valid: false,
        },
        {
          texture: canvasPages?.[2].texture,
          lineNumStart: page2LineStart,
          lineNumEnd: page2LineStart + maxLinesPerCanvasPage,
          valid: false,
        },
      ];
      state.canvasPages = canvasPages;

      const scrollYNearestPage = Math.ceil(scrollY / pageHeight) * pageHeight;

      renderWindow = {
        x1: 0,
        y1: scrollYNearestPage - pageHeight,
        x2: width,
        y2: scrollYNearestPage + pageHeight * 2,
      };
    }

    state.renderWindow = renderWindow;

    const pageDrawTime = performance.now();
    for (const pageInfo of canvasPages) {
      if (pageInfo.valid) continue;
      if (pageInfo.lineNumStart < 0) {
        pageInfo.texture = this.stage.txManager.loadTexture('ImageTexture', {
          src: '',
        });
        pageInfo.valid = true;
        continue;
      }
      state.lightning2TextRenderer.draw(state.renderInfo, {
        lines: state.renderInfo.lines.slice(
          pageInfo.lineNumStart,
          pageInfo.lineNumEnd,
        ),
        lineWidths: state.renderInfo.lineWidths.slice(
          pageInfo.lineNumStart,
          pageInfo.lineNumEnd,
        ),
      });
      if (!(this.canvas.width === 0 || this.canvas.height === 0)) {
        pageInfo.texture = this.stage.txManager.loadTexture(
          'ImageTexture',
          {
            src: this.context.getImageData(
              0,
              0,
              this.canvas.width,
              this.canvas.height,
            ),
          },
          {
            preload: true,
          },
        );
      }
      pageInfo.valid = true;
    }
    console.log('pageDrawTime', performance.now() - pageDrawTime, 'ms');

    // Report final status
    this.setStatus(state, 'loaded');
  }

  override renderQuads(state: CanvasTextRendererState): void {
    const { stage } = this;

    const { canvasPages, textW = 0, textH = 0, renderWindow } = state;

    if (!canvasPages || !renderWindow) return;

    const { x, y, scrollY, contain, width, height /*, debug*/ } = state.props;

    const elementRect = {
      x: x,
      y: y,
      width: contain !== 'none' ? width : textW,
      height: contain === 'both' ? height : textH,
    };

    const visibleRect = intersectRect(
      {
        x: 0,
        y: 0,
        width: stage.options.appWidth,
        height: stage.options.appHeight,
      },
      elementRect,
    );

    // if (!debug.disableScissor) {
    //   renderer.enableScissor(
    //     visibleRect.x,
    //     visibleRect.y,
    //     visibleRect.w,
    //     visibleRect.h,
    //   );
    // }

    assertTruthy(canvasPages, 'canvasPages is not defined');
    assertTruthy(renderWindow, 'renderWindow is not defined');

    const renderWindowHeight = renderWindow.y2 - renderWindow.y1;
    const pageSize = renderWindowHeight / 3.0;

    const { zIndex, alpha } = state.props;

    if (canvasPages[0].valid) {
      this.stage.renderer.addRenderable({
        alpha,
        colorBl: 0xffffffff,
        colorBr: 0xffffffff,
        colorTl: 0xffffffff,
        colorTr: 0xffffffff,
        width: canvasPages[0].texture?.dimensions?.width || 0,
        height: canvasPages[0].texture?.dimensions?.height || 0,
        texture: canvasPages[0].texture!,
        textureOptions: {},
        shader: null,
        shaderProps: null,
        zIndex,
        worldScale: 1,
        scale: 1,
        wpx: x,
        wpy: y - scrollY + renderWindow.y1,
        ta: 1,
        tb: 0,
        tc: 0,
        td: 1,
      });
    }
    if (canvasPages[1].valid) {
      this.stage.renderer.addRenderable({
        alpha,
        colorBl: 0xffffffff,
        colorBr: 0xffffffff,
        colorTl: 0xffffffff,
        colorTr: 0xffffffff,
        width: canvasPages[1].texture?.dimensions?.width || 0,
        height: canvasPages[1].texture?.dimensions?.height || 0,
        texture: canvasPages[1].texture!,
        textureOptions: {},
        shader: null,
        shaderProps: null,
        zIndex,
        worldScale: 1,
        scale: 1,
        wpx: x,
        wpy: y - scrollY + renderWindow.y1 + pageSize,
        ta: 1,
        tb: 0,
        tc: 0,
        td: 1,
      });
    }
    if (canvasPages[2].valid) {
      this.stage.renderer.addRenderable({
        alpha,
        colorBl: 0xffffffff,
        colorBr: 0xffffffff,
        colorTl: 0xffffffff,
        colorTr: 0xffffffff,
        width: canvasPages[2].texture?.dimensions?.width || 0,
        height: canvasPages[2].texture?.dimensions?.height || 0,
        texture: canvasPages[2].texture!,
        textureOptions: {},
        shader: null,
        shaderProps: null,
        zIndex,
        worldScale: 1,
        scale: 1,
        wpx: x,
        wpy: y - scrollY + renderWindow.y1 + pageSize + pageSize,
        ta: 1,
        tb: 0,
        tc: 0,
        td: 1,
      });
    }

    // renderer.disableScissor();

    // if (debug.showElementRect) {
    //   this.renderer.drawBorder(
    //     Colors.Blue,
    //     elementRect.x,
    //     elementRect.y,
    //     elementRect.w,
    //     elementRect.h,
    //   );
    // }

    // if (debug.showVisibleRect) {
    //   this.renderer.drawBorder(
    //     Colors.Green,
    //     visibleRect.x,
    //     visibleRect.y,
    //     visibleRect.w,
    //     visibleRect.h,
    //   );
    // }

    // if (debug.showRenderWindow && renderWindow) {
    //   this.renderer.drawBorder(
    //     Colors.Red,
    //     x + renderWindow.x1,
    //     y + renderWindow.y1 - scrollY,
    //     x + renderWindow.x2 - (x + renderWindow.x1),
    //     y + renderWindow.y2 - scrollY - (y + renderWindow.y1 - scrollY),
    //   );
    // }
  }
  //#endregion Overrides

  private markForReload(state: CanvasTextRendererState): void {
    state.renderInfo = undefined;
    this.setStatus(state, 'loading');
  }

  private onFontLoaded(
    state: CanvasTextRendererState,
    cssString: string,
  ): void {
    if (cssString !== state.fontInfo?.cssString || !state.fontInfo) {
      return;
    }
    state.fontInfo.loaded = true;
    this.updateState(state);
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

    this.updateState(state);
  }
}
