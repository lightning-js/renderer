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
  intersectBound,
  type Bound,
  type Rect,
  createBound,
  type BoundWithValid,
} from '../../../lib/utils.js';
import {
  TextRenderer,
  type TrProps,
  type TextRendererState,
  type TrFontProps,
  type TrPropSetters,
} from '../TextRenderer.js';
import { SdfTrFontFace } from '../../font-face-types/SdfTrFontFace/SdfTrFontFace.js';
import { FLOATS_PER_GLYPH } from './internal/constants.js';
import { getStartConditions } from './internal/getStartConditions.js';
import { layoutText } from './internal/layoutText.js';
import { makeRenderWindow } from './internal/makeRenderWindow.js';
import type { TrFontFace } from '../../font-face-types/TrFontFace.js';
import { TrFontManager, type FontFamilyMap } from '../../TrFontManager.js';
import { assertTruthy, mergeColorAlpha } from '../../../../utils.js';
import type { Stage } from '../../../Stage.js';
import { WebGlCoreRenderOp } from '../../../renderers/webgl/WebGlCoreRenderOp.js';
import { BufferCollection } from '../../../renderers/webgl/internal/BufferCollection.js';
import type {
  SdfShader,
  SdfShaderProps,
} from '../../../renderers/webgl/shaders/SdfShader.js';
import type { WebGlCoreCtxTexture } from '../../../renderers/webgl/WebGlCoreCtxTexture.js';
import { EventEmitter } from '../../../../common/EventEmitter.js';
import type { Matrix3d } from '../../../lib/Matrix3d.js';

declare module '../TextRenderer.js' {
  interface TextRendererMap {
    sdf: SdfTextRenderer;
  }

  // Add prefixed SDF-specific props to TextRendererDebugProps
  interface TextRendererDebugProps {
    sdfShaderDebug: boolean;
  }
}

export interface LineCacheItem {
  codepointIndex: number;
  maxY: number;
  maxX: number;
}

export interface SdfTextRendererState extends TextRendererState {
  /**
   * Cache for layout resume points indexed by the `curY` for each line
   * in the render sequence.
   *
   * Allows faster rendering by skipping parts of the layout loop that are
   * outside of the renderWindow.
   */
  lineCache: LineCacheItem[];

  renderWindow: Bound | undefined;

  visibleWindow: BoundWithValid;

  bufferNumFloats: number;

  bufferNumQuads: number;

  // texCoordBuffer: Float32Array | undefined;

  vertexBuffer: Float32Array | undefined;

  webGlBuffers: BufferCollection | null;

  bufferUploaded: boolean;

  distanceRange: number;

  trFontFace: SdfTrFontFace | undefined;
}

/**
 * Ephemeral bounds object used for intersection calculations
 *
 * @remarks
 * Used to avoid creating a new object every time we need to intersect
 * element bounds.
 */
const tmpElementBounds = createBound(0, 0, 0, 0);

/**
 * Singleton class for rendering text using signed distance fields.
 *
 * @remarks
 * SdfTextRenderer supports both single-channel and multi-channel signed distance fields.
 */
export class SdfTextRenderer extends TextRenderer<SdfTextRendererState> {
  /**
   * Map of font family names to a set of font faces.
   */
  private ssdfFontFamilies: FontFamilyMap = {};
  private msdfFontFamilies: FontFamilyMap = {};
  private sdfShader: SdfShader;
  private rendererBounds: Bound;

  constructor(stage: Stage) {
    super(stage);
    this.sdfShader = this.stage.shManager.loadShader('SdfShader').shader;
    this.rendererBounds = {
      x1: 0,
      y1: 0,
      x2: this.stage.options.appWidth,
      y2: this.stage.options.appHeight,
    };
  }

  //#region Overrides
  getPropertySetters(): Partial<TrPropSetters<SdfTextRendererState>> {
    return {
      fontFamily: (state, value) => {
        state.props.fontFamily = value;
        state.trFontFace = undefined;
        this.invalidateLayoutCache(state);
      },
      fontWeight: (state, value) => {
        state.props.fontWeight = value;
        state.trFontFace = undefined;
        this.invalidateLayoutCache(state);
      },
      fontStyle: (state, value) => {
        state.props.fontStyle = value;
        state.trFontFace = undefined;
        this.invalidateLayoutCache(state);
      },
      fontStretch: (state, value) => {
        state.props.fontStretch = value;
        state.trFontFace = undefined;
        this.invalidateLayoutCache(state);
      },
      fontSize: (state, value) => {
        state.props.fontSize = value;
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
        this.invalidateLayoutCache(state);
      },
      height: (state, value) => {
        state.props.height = value;
        this.invalidateLayoutCache(state);
      },
      offsetY: (state, value) => {
        state.props.offsetY = value;
        this.invalidateLayoutCache(state);
      },
      scrollable: (state, value) => {
        state.props.scrollable = value;
        this.invalidateLayoutCache(state);
      },
      scrollY: (state, value) => {
        state.props.scrollY = value;
        // Scrolling doesn't need to invalidate any caches, but it does need to
        // schedule an update
        this.scheduleUpdateState(state);
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
      debug: (state, value) => {
        state.props.debug = value;
      },
    };
  }

  override canRenderFont(props: TrFontProps): boolean {
    // TODO: Support matching on font stretch, weight and style (if/when needed)
    // For now we just match on the font family name
    // '$$SDF_FAILURE_TEST$$' is used to test the 'failure' event coming from text
    const { fontFamily } = props;
    return (
      fontFamily in this.ssdfFontFamilies ||
      fontFamily in this.msdfFontFamilies ||
      fontFamily === '$$SDF_FAILURE_TEST$$'
    );
  }

  override isFontFaceSupported(fontFace: TrFontFace): boolean {
    return fontFace instanceof SdfTrFontFace;
  }

  override addFontFace(fontFace: TrFontFace): void {
    // Make sure the font face is an SDF font face (it should have already passed
    // the `isFontFaceSupported` check)
    assertTruthy(fontFace instanceof SdfTrFontFace);
    const familyName = fontFace.fontFamily;
    const fontFamiles =
      fontFace.type === 'ssdf'
        ? this.ssdfFontFamilies
        : fontFace.type === 'msdf'
        ? this.msdfFontFamilies
        : undefined;
    if (!fontFamiles) {
      console.warn(`Invalid font face type: ${fontFace.type as string}`);
      return;
    }
    let faceSet = fontFamiles[familyName];
    if (!faceSet) {
      faceSet = new Set();
      fontFamiles[familyName] = faceSet;
    }
    faceSet.add(fontFace);
  }

  override createState(props: TrProps): SdfTextRendererState {
    return {
      props,
      status: 'initialState',
      updateScheduled: false,
      emitter: new EventEmitter(),
      lineCache: [],
      forceFullLayoutCalc: false,
      renderWindow: undefined,
      visibleWindow: {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
        valid: false,
      },
      bufferNumFloats: 0,
      bufferNumQuads: 0,
      vertexBuffer: undefined,
      webGlBuffers: null,
      bufferUploaded: false,
      textH: undefined,
      textW: undefined,
      distanceRange: 0,
      trFontFace: undefined,
      debugData: {
        updateCount: 0,
        layoutCount: 0,
        lastLayoutNumCharacters: 0,
        layoutSum: 0,
        drawSum: 0,
        drawCount: 0,
        bufferSize: 0,
      },
    };
  }

  override updateState(state: SdfTextRendererState): void {
    let { trFontFace } = state;
    const { textH, lineCache, debugData, forceFullLayoutCalc } = state;
    debugData.updateCount++;

    // On the first update call we need to set the status to loading
    if (state.status === 'initialState') {
      this.setStatus(state, 'loading');
    }

    // Resolve font face if we haven't yet
    if (!trFontFace) {
      trFontFace = this.resolveFontFace(state.props);
      state.trFontFace = trFontFace;
      if (!trFontFace) {
        const msg = `SdfTextRenderer: Could not resolve font face for family: '${state.props.fontFamily}'`;
        console.error(msg);
        this.setStatus(state, 'failed', new Error(msg));
        return;
      }
    }

    // If the font hasn't been loaded yet, stop here.
    // Listen for the 'loaded' event and forward fontLoaded event
    if (!trFontFace.loaded) {
      trFontFace.once('loaded', () => {
        this.scheduleUpdateState(state);
      });
      return;
    }

    // If the font is loaded then so should the data
    assertTruthy(trFontFace.data, 'Font face data should be loaded');

    const { text, fontSize, x, y, contain, width, height, scrollable } =
      state.props;

    // scrollY only has an effect when contain === 'both' and scrollable === true
    const scrollY = contain === 'both' && scrollable ? state.props.scrollY : 0;

    let { renderWindow } = state;

    // Needed in renderWindow calculation
    const sdfLineHeight = trFontFace.data.info.size;

    /**
     * Divide screen space points by this to get the SDF space points
     * Mulitple SDF space points by this to get screen space points
     */
    const fontSizeRatio = fontSize / sdfLineHeight;

    state.distanceRange =
      fontSizeRatio * trFontFace.data.distanceField.distanceRange;

    // Allocate buffers if needed
    const neededLength = text.length * FLOATS_PER_GLYPH;
    let vertexBuffer = state.vertexBuffer;
    if (!vertexBuffer || vertexBuffer.length < neededLength) {
      vertexBuffer = new Float32Array(neededLength * 2);
    }

    const visibleWindow = state.visibleWindow;
    // If the visibleWindow is not valid, calculate it
    if (!visibleWindow.valid) {
      // Figure out whats actually in the bounds of the renderer/canvas (visibleWindow)
      const elementBounds = createBound(
        x,
        y,
        contain !== 'none' ? x + width : Infinity,
        contain === 'both' ? y + height : Infinity,
        tmpElementBounds, // Prevent allocation by using this temp object
      );
      /**
       * Area that is visible on the screen.
       */
      intersectBound(this.rendererBounds, elementBounds, state.visibleWindow);
      visibleWindow.valid = true;
    }

    // Return early if we're still viewing inside the established render window
    // No need to re-render what we've already rendered
    // (Only if there's an established renderWindow and we're not suppressing early exit)
    if (!forceFullLayoutCalc && renderWindow) {
      if (
        x + renderWindow.x1 <= visibleWindow.x1 &&
        x + renderWindow.x2 >= visibleWindow.x2 &&
        y - scrollY + renderWindow.y1 <= visibleWindow.y1 &&
        y - scrollY + renderWindow.y2 >= visibleWindow.y2
      ) {
        this.setStatus(state, 'loaded');
        return;
      }
      // Otherwise clear the renderWindow so it can be redone
      renderWindow = state.renderWindow = undefined;
      this.setStatus(state, 'loading');
    }

    const { offsetY, textAlign } = state.props;

    // Create a new renderWindow if needed
    if (!renderWindow) {
      const visibleWindowHeight = visibleWindow.y2 - visibleWindow.y1;
      const maxLinesPerCanvasPage = Math.ceil(
        visibleWindowHeight / sdfLineHeight,
      );
      renderWindow = makeRenderWindow(
        x,
        y,
        scrollY,
        sdfLineHeight,
        maxLinesPerCanvasPage,
        visibleWindow,
      );
    }

    const start = getStartConditions(
      fontSize,
      offsetY,
      fontSizeRatio,
      sdfLineHeight,
      renderWindow,
      lineCache,
      textH,
    );

    if (!start) {
      // Nothing to render, return early, but still mark as loaded (since the text is just scrolled
      // out of view)
      this.setStatus(state, 'loaded');
      return;
    }

    const { letterSpacing } = state.props;

    const out2 = layoutText(
      start.lineIndex,
      start.x,
      start.y,
      text,
      textAlign,
      width,
      height,
      fontSize,
      letterSpacing,
      vertexBuffer,
      contain,
      lineCache,
      renderWindow,
      trFontFace,
      forceFullLayoutCalc,
      scrollable,
    );

    state.bufferUploaded = false;
    state.bufferNumFloats = out2.bufferNumFloats;
    state.bufferNumQuads = out2.bufferNumQuads;
    state.vertexBuffer = vertexBuffer;
    state.renderWindow = renderWindow;
    debugData.lastLayoutNumCharacters = out2.layoutNumCharacters;
    debugData.bufferSize = vertexBuffer.byteLength;

    // If we didn't exit early, we know we have completely computed w/h
    if (out2.fullyProcessed) {
      state.textW = out2.maxX * fontSizeRatio;
      state.textH = out2.maxY * fontSizeRatio;
    }

    // if (state.props.debug.printLayoutTime) {
    //   debugData.layoutSum += performance.now() - updateStartTime;
    //   debugData.layoutCount++;
    // }
    this.setStatus(state, 'loaded');
  }

  override renderQuads(
    state: SdfTextRendererState,
    transform: Matrix3d,
    clippingRect: Rect | null,
    alpha: number,
  ): void {
    if (!state.vertexBuffer) {
      // Nothing to draw
      return;
    }

    const drawStartTime = performance.now();

    const { sdfShader } = this;

    const { renderer } = this.stage;

    const { appWidth, appHeight } = this.stage.options;

    const { fontSize, color, contain, scrollable, zIndex, debug } = state.props;

    // scrollY only has an effect when contain === 'both' and scrollable === true
    const scrollY = contain === 'both' && scrollable ? state.props.scrollY : 0;

    const {
      textW = 0,
      textH = 0,
      distanceRange,
      vertexBuffer,
      bufferUploaded,
      trFontFace,
    } = state;

    let { webGlBuffers } = state;

    if (!webGlBuffers) {
      const gl = renderer.gl;
      const stride = 4 * Float32Array.BYTES_PER_ELEMENT;
      const webGlBuffer = gl.createBuffer();
      assertTruthy(webGlBuffer);
      state.webGlBuffers = new BufferCollection([
        {
          buffer: webGlBuffer,
          attributes: {
            a_position: {
              name: 'a_position',
              size: 2, // 2 components per iteration
              type: gl.FLOAT, // the data is 32bit floats
              normalized: false, // don't normalize the data
              stride, // 0 = move forward size * sizeof(type) each iteration to get the next position
              offset: 0, // start at the beginning of the buffer
            },
            a_textureCoordinate: {
              name: 'a_textureCoordinate',
              size: 2,
              type: gl.FLOAT,
              normalized: false,
              stride,
              offset: 2 * Float32Array.BYTES_PER_ELEMENT,
            },
          },
        },
      ]);
      state.bufferUploaded = false;
      assertTruthy(state.webGlBuffers);
      webGlBuffers = state.webGlBuffers;
    }

    if (!bufferUploaded) {
      const gl = renderer.gl;

      const buffer = webGlBuffers?.getBuffer('a_textureCoordinate') ?? null;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertexBuffer, gl.STATIC_DRAW);
      state.bufferUploaded = true;
    }

    assertTruthy(trFontFace);

    const renderOp = new WebGlCoreRenderOp(
      renderer.gl,
      renderer.options,
      webGlBuffers,
      this.sdfShader,
      {
        transform: transform.data,
        // IMPORTANT: The SDF Shader expects the color NOT to be premultiplied
        // for the best blending results. Which is why we use `mergeColorAlpha`
        // instead of `mergeColorAlphaPremultiplied` here.
        color: mergeColorAlpha(color, alpha),
        size: fontSize / (trFontFace.data?.info.size || 0),
        scrollY,
        distanceRange,
        debug: debug.sdfShaderDebug,
      } satisfies SdfShaderProps,
      alpha,
      clippingRect,
      { height: textH, width: textW },
      0,
      zIndex,
    );

    const texture = state.trFontFace?.texture;
    assertTruthy(texture);
    const ctxTexture = this.stage.txManager.getCtxTexture(texture);

    renderOp.addTexture(ctxTexture as WebGlCoreCtxTexture);
    renderOp.length = state.bufferNumFloats;
    renderOp.numQuads = state.bufferNumQuads;

    renderer.addRenderable(renderOp);

    // const elementRect = {
    //   x: x,
    //   y: y,
    //   w: contain !== 'none' ? width : textW,
    //   h: contain === 'both' ? height : textH,
    // };

    // const visibleRect = intersectRect(
    //   {
    //     x: 0,
    //     y: 0,
    //     w: renderer.w,
    //     h: renderer.h,
    //   },
    //   elementRect,
    // );

    // if (!debug.disableScissor) {
    //   renderer.enableScissor(
    //     visibleRect.x,
    //     visibleRect.y,
    //     visibleRect.w,
    //     visibleRect.h,
    //   );
    // }

    // Draw the arrays
    // gl.drawArrays(
    //   gl.TRIANGLES, // Primitive type
    //   0,
    //   bufferNumVertices, // Number of verticies
    // );

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
    // if (debug.printLayoutTime) {
    //   debugData.drawSum += performance.now() - drawStartTime;
    //   debugData.drawCount++;
    // }
  }
  //#endregion Overrides

  public resolveFontFace(props: TrFontProps): SdfTrFontFace | undefined {
    return TrFontManager.resolveFontFace(
      [this.msdfFontFamilies, this.ssdfFontFamilies],
      props,
    ) as SdfTrFontFace | undefined;
  }

  /**
   * Invalidate the visible window stored in the state. This will cause a new
   * visible window to be calculated on the next update.
   *
   * @param state
   */
  protected invalidateVisibleWindowCache(state: SdfTextRendererState): void {
    state.visibleWindow.valid = false;
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
  protected invalidateLayoutCache(state: SdfTextRendererState): void {
    state.visibleWindow.valid = false;
    state.renderWindow = undefined;
    state.textH = undefined;
    state.textW = undefined;
    state.lineCache = [];
    this.setStatus(state, 'loading');
    this.scheduleUpdateState(state);
  }
}
