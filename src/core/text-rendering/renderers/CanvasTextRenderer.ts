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
import { assertTruthy, mergeColorAlphaPremultiplied } from '../../../utils.js';
import type { Stage } from '../../Stage.js';
import type { Matrix3d } from '../../lib/Matrix3d.js';
import {
  intersectRect,
  type Bound,
  intersectBound,
  getNormalizedRgbaComponents,
  getNormalizedAlphaComponent,
  type BoundWithValid,
  createBound,
  type RectWithValid,
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
import { RenderCoords } from '../../lib/RenderCoords.js';

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
        fontFace: WebTrFontFace;
        cssString: string;
        loaded: boolean;
      }
    | undefined;
  canvasPages: [CanvasPageInfo, CanvasPageInfo, CanvasPageInfo] | undefined;
  lightning2TextRenderer: LightningTextTextureRenderer;
  renderInfo: RenderInfo | undefined;
  renderWindow: Bound | undefined;
  visibleWindow: BoundWithValid;
}

/**
 * Ephemeral bounds object used for intersection calculations
 *
 * @remarks
 * Used to avoid creating a new object every time we need to intersect
 * element bounds.
 */
const tmpElementBounds = createBound(0, 0, 0, 0);

export class CanvasTextRenderer extends TextRenderer<CanvasTextRendererState> {
  protected canvas: OffscreenCanvas | HTMLCanvasElement;
  protected context:
    | OffscreenCanvasRenderingContext2D
    | CanvasRenderingContext2D;
  private rendererBounds: Bound;
  /**
   * Font family map used to store web font faces that were added to the
   * canvas text renderer.
   */
  private fontFamilies: FontFamilyMap = {};
  private fontFamilyArray: FontFamilyMap[] = [this.fontFamilies];

  constructor(stage: Stage) {
    super(stage);
    if (typeof OffscreenCanvas !== 'undefined') {
      this.canvas = new OffscreenCanvas(0, 0);
    } else {
      this.canvas = document.createElement('canvas');
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    let context = this.canvas.getContext('2d') as
      | OffscreenCanvasRenderingContext2D
      | CanvasRenderingContext2D
      | null;
    if (!context) {
      // A browser may appear to support OffscreenCanvas but not actually support the Canvas '2d' context
      // Here we try getting the context again after falling back to an HTMLCanvasElement.
      // See: https://github.com/lightning-js/renderer/issues/26#issuecomment-1750438486
      this.canvas = document.createElement('canvas');
      context = this.canvas.getContext('2d');
    }
    assertTruthy(context);
    this.context = context;
    this.rendererBounds = {
      x1: 0,
      y1: 0,
      x2: this.stage.options.appWidth,
      y2: this.stage.options.appHeight,
    };
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
        this.invalidateVisibleWindowCache(state);
      },
      y: (state, value) => {
        state.props.y = value;
        this.invalidateVisibleWindowCache(state);
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

  override createState(props: TrProps): CanvasTextRendererState {
    return {
      props,
      status: 'initialState',
      updateScheduled: false,
      emitter: new EventEmitter(),
      canvasPages: undefined,
      lightning2TextRenderer: new LightningTextTextureRenderer(
        this.canvas,
        this.context,
      ),
      renderWindow: undefined,
      visibleWindow: {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
        valid: false,
      },
      renderInfo: undefined,
      forceFullLayoutCalc: false,
      textW: 0,
      textH: 0,
      fontInfo: undefined,
      fontFaceLoadedHandler: undefined,
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
    }

    // If fontInfo is invalid, we need to establish it
    if (!state.fontInfo) {
      const cssString = getFontCssString(state.props);
      const trFontFace = TrFontManager.resolveFontFace(
        this.fontFamilyArray,
        state.props,
      ) as WebTrFontFace | undefined;
      assertTruthy(trFontFace, `Could not resolve font face for ${cssString}`);
      state.fontInfo = {
        fontFace: trFontFace,
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
        fontFamily: state.props.fontFamily,
        trFontFace: state.fontInfo.fontFace,
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
      // const renderInfoCalculateTime = performance.now();
      state.renderInfo = state.lightning2TextRenderer.calculateRenderInfo();
      // console.log(
      //   'Render info calculated in',
      //   performance.now() - renderInfoCalculateTime,
      //   'ms',
      // );
      state.textH = state.renderInfo.lineHeight * state.renderInfo.lines.length;
      state.textW = state.renderInfo.width;

      // Invalidate renderWindow because the renderInfo changed
      state.renderWindow = undefined;
    }

    const { x, y, width, height, scrollY, contain } = state.props;
    const { visibleWindow } = state;
    let { renderWindow, canvasPages } = state;

    if (!visibleWindow.valid) {
      // Figure out whats actually in the bounds of the renderer/canvas (visibleWindow)
      const elementBounds = createBound(
        x,
        y,
        contain !== 'none' ? x + width : Infinity,
        contain === 'both' ? y + height : Infinity,
        tmpElementBounds,
      );
      /**
       * Area that is visible on the screen.
       */
      intersectBound(this.rendererBounds, elementBounds, visibleWindow);
      visibleWindow.valid = true;
    }

    const visibleWindowHeight = visibleWindow.y2 - visibleWindow.y1;

    const maxLinesPerCanvasPage = Math.ceil(
      visibleWindowHeight / state.renderInfo.lineHeight,
    );

    if (visibleWindowHeight === 0) {
      // Nothing to render. Clear any canvasPages and existing renderWindow
      // Return early.
      canvasPages = undefined;
      renderWindow = undefined;
      this.setStatus(state, 'loaded');
      return;
    } else if (renderWindow && canvasPages) {
      // Return early if we're still viewing inside the established render window
      // No need to re-render what we've already rendered
      const renderWindowScreenX1 = x + renderWindow.x1;
      const renderWindowScreenY1 = y - scrollY + renderWindow.y1;
      const renderWindowScreenX2 = x + renderWindow.x2;
      const renderWindowScreenY2 = y - scrollY + renderWindow.y2;

      if (
        renderWindowScreenX1 <= visibleWindow.x1 &&
        renderWindowScreenX2 >= visibleWindow.x2 &&
        renderWindowScreenY1 <= visibleWindow.y1 &&
        renderWindowScreenY2 >= visibleWindow.y2
      ) {
        this.setStatus(state, 'loaded');
        return;
      }
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

      const scrollYNearestPage = page1Block * pageHeight;

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
        pageInfo.texture?.setRenderableOwner(state, false);
        pageInfo.texture = this.stage.txManager.loadTexture('ImageTexture', {
          src: '',
        });
        pageInfo.texture.setRenderableOwner(state, state.isRenderable);
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
        pageInfo.texture?.setRenderableOwner(state, false);
        pageInfo.texture = this.stage.txManager.loadTexture('ImageTexture', {
          src: this.context.getImageData(
            0,
            0,
            this.canvas.width,
            this.canvas.height,
          ),
        });
        this.stage.txManager.getCtxTexture(pageInfo.texture).load();

        pageInfo.texture.setRenderableOwner(state, state.isRenderable);
      }
      pageInfo.valid = true;
    }
    // console.log('pageDrawTime', performance.now() - pageDrawTime, 'ms');

    // Report final status
    this.setStatus(state, 'loaded');
  }

  override renderQuads(
    state: CanvasTextRendererState,
    transform: Matrix3d,
    clippingRect: RectWithValid,
    alpha: number,
  ): void {
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

    const { zIndex, color } = state.props;

    // Color alpha of text is not properly rendered to the Canvas texture, so we
    // need to apply it here.
    const combinedAlpha = alpha * getNormalizedAlphaComponent(color);
    const quadColor = mergeColorAlphaPremultiplied(0xffffffff, combinedAlpha);
    if (canvasPages[0].valid) {
      this.stage.renderer.addQuad({
        alpha: combinedAlpha,
        clippingRect,
        colorBl: quadColor,
        colorBr: quadColor,
        colorTl: quadColor,
        colorTr: quadColor,
        width: canvasPages[0].texture?.dimensions?.width || 0,
        height: canvasPages[0].texture?.dimensions?.height || 0,
        texture: canvasPages[0].texture!,
        textureOptions: {},
        shader: null,
        shaderProps: null,
        zIndex,
        renderCoords: this.calculateRenderCoords(
          width,
          height,
          transform,
          transform.ty - scrollY + renderWindow.y1,
        ),
        transform,
      });
    }
    if (canvasPages[1].valid) {
      this.stage.renderer.addQuad({
        alpha: combinedAlpha,
        clippingRect,
        colorBl: quadColor,
        colorBr: quadColor,
        colorTl: quadColor,
        colorTr: quadColor,
        width: canvasPages[1].texture?.dimensions?.width || 0,
        height: canvasPages[1].texture?.dimensions?.height || 0,
        texture: canvasPages[1].texture!,
        textureOptions: {},
        shader: null,
        shaderProps: null,
        zIndex,
        renderCoords: this.calculateRenderCoords(
          width,
          height,
          transform,
          transform.ty - scrollY + renderWindow.y1 + pageSize,
        ),
        transform,
      });
    }
    if (canvasPages[2].valid) {
      this.stage.renderer.addQuad({
        alpha: combinedAlpha,
        clippingRect,
        colorBl: quadColor,
        colorBr: quadColor,
        colorTl: quadColor,
        colorTr: quadColor,
        width: canvasPages[2].texture?.dimensions?.width || 0,
        height: canvasPages[2].texture?.dimensions?.height || 0,
        texture: canvasPages[2].texture!,
        textureOptions: {},
        shader: null,
        shaderProps: null,
        zIndex,
        renderCoords: this.calculateRenderCoords(
          width,
          height,
          transform,
          transform.ty - scrollY + renderWindow.y1 + pageSize + pageSize,
        ),
        transform,
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

  calculateRenderCoords(
    width: number,
    height: number,
    transform: Matrix3d,
    y: number,
  ): RenderCoords {
    assertTruthy(transform);
    const { tx, ta, tb, tc, td } = transform;
    if (tb === 0 && tc === 0) {
      const minX = tx;
      const maxX = tx + width * ta;

      const minY = y;
      const maxY = y + height * td;
      return RenderCoords.translate(
        //top-left
        minX,
        minY,
        //top-right
        maxX,
        minY,
        //bottom-right
        maxX,
        maxY,
        //bottom-left
        minX,
        maxY,
      );
    } else {
      return RenderCoords.translate(
        //top-left
        tx,
        y,
        //top-right
        tx + width * ta,
        y + width * tc,
        //bottom-right
        tx + width * ta + height * tb,
        y + width * tc + height * td,
        //bottom-left
        tx + height * tb,
        y + height * td,
      );
    }
  }

  override setIsRenderable(
    state: CanvasTextRendererState,
    renderable: boolean,
  ): void {
    super.setIsRenderable(state, renderable);
    // Set state object owner from any canvas page textures
    state.canvasPages?.forEach((pageInfo) => {
      pageInfo.texture?.setRenderableOwner(state, renderable);
    });
  }

  override destroyState(state: CanvasTextRendererState): void {
    super.destroyState(state);
    // Remove state object owner from any canvas page textures
    state.canvasPages?.forEach((pageInfo) => {
      pageInfo.texture?.setRenderableOwner(state, false);
    });
  }
  //#endregion Overrides

  /**
   * Invalidate the visible window stored in the state. This will cause a new
   * visible window to be calculated on the next update.
   *
   * @param state
   */
  protected invalidateVisibleWindowCache(state: CanvasTextRendererState): void {
    state.visibleWindow.valid = false;
    this.setStatus(state, 'loading');
    this.scheduleUpdateState(state);
  }

  /**
   * Invalidate the layout cache stored in the state. This will cause the text
   * to be re-layed out on the next update.
   *
   * @remarks
   * This also invalidates the visible window cache.
   *
   * @param state
   */
  private invalidateLayoutCache(state: CanvasTextRendererState): void {
    state.renderInfo = undefined;
    state.visibleWindow.valid = false;
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
