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
  type Bound,
  type Rect,
  createBound,
  type BoundWithValid,
  intersectRect,
  type RectWithValid,
  copyRect,
  boundsOverlap,
  convertBoundToRect,
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
import {
  setRenderWindow,
  type SdfRenderWindow,
} from './internal/setRenderWindow.js';
import type { TrFontFace } from '../../font-face-types/TrFontFace.js';
import { type FontFamilyMap } from '../../TrFontManager.js';
import { assertTruthy, mergeColorAlpha } from '../../../../utils.js';
import type { Stage } from '../../../Stage.js';
import { WebGlRenderOp } from '../../../renderers/webgl/WebGlRenderOp.js';
import { BufferCollection } from '../../../renderers/webgl/internal/BufferCollection.js';
import { Sdf, type SdfShaderProps } from '../../../shaders/webgl/SdfShader.js';
import type { WebGlCtxTexture } from '../../../renderers/webgl/WebGlCtxTexture.js';
import { EventEmitter } from '../../../../common/EventEmitter.js';
import type { Matrix3d } from '../../../lib/Matrix3d.js';
import type { Dimensions } from '../../../../common/CommonTypes.js';
import { WebGlRenderer } from '../../../renderers/webgl/WebGlRenderer.js';
import { calcDefaultLineHeight } from '../../TextRenderingUtils.js';
import type { WebGlShaderProgram } from '../../../renderers/webgl/WebGlShaderProgram.js';
import type { WebGlShaderNode } from '../../../renderers/webgl/WebGlShaderNode.js';
import type { CoreTextNode } from '../../../CoreTextNode.js';

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

  renderWindow: SdfRenderWindow;

  elementBounds: BoundWithValid;

  clippingRect: RectWithValid;

  bufferNumFloats: number;

  bufferNumQuads: number;

  vertexBuffer: Float32Array | undefined;

  webGlBuffers: BufferCollection | null;

  bufferUploaded: boolean;

  distanceRange: number;

  trFontFace: SdfTrFontFace | undefined;

  /**
   * Resolved line height in logical screen pixel units
   */
  resLineHeight: number | undefined;
}

/**
 * Ephemeral rect object used for calculations
 */
const tmpRect: Rect = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
};

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
  private fontFamilyArray: FontFamilyMap[] = [
    this.ssdfFontFamilies,
    this.msdfFontFamilies,
  ];
  private sdfShader: WebGlShaderNode;
  private rendererBounds: Bound;

  public type: 'canvas' | 'sdf' = 'sdf';

  constructor(stage: Stage) {
    super(stage);
    this.stage.shManager.registerShaderType('Sdf', Sdf);
    this.sdfShader = this.stage.shManager.createShader(
      'Sdf',
    ) as WebGlShaderNode;
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
        this.releaseFontFace(state);
        this.invalidateLayoutCache(state);
      },
      fontWeight: (state, value) => {
        state.props.fontWeight = value;
        this.releaseFontFace(state);
        this.invalidateLayoutCache(state);
      },
      fontStyle: (state, value) => {
        state.props.fontStyle = value;
        this.releaseFontFace(state);
        this.invalidateLayoutCache(state);
      },
      fontStretch: (state, value) => {
        state.props.fontStretch = value;
        this.releaseFontFace(state);
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
        if (state.elementBounds.valid) {
          this.setElementBoundsX(state);
          // Only schedule an update if the text is not already rendered
          // (renderWindow is invalid) and the element possibly overlaps the screen
          // This is to avoid unnecessary updates when we know text is off-screen
          if (
            !state.renderWindow.valid &&
            boundsOverlap(state.elementBounds, this.rendererBounds)
          ) {
            this.scheduleUpdateState(state);
          }
        }
      },
      y: (state, value) => {
        state.props.y = value;
        if (state.elementBounds.valid) {
          this.setElementBoundsY(state);
          // See x() for explanation
          if (
            !state.renderWindow.valid &&
            boundsOverlap(state.elementBounds, this.rendererBounds)
          ) {
            this.scheduleUpdateState(state);
          }
        }
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
        state.resLineHeight = undefined;
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
      wordBreak: (state, value) => {
        state.props.wordBreak = value;
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
      renderWindow: {
        screen: {
          x1: 0,
          y1: 0,
          x2: 0,
          y2: 0,
        },
        sdf: {
          x1: 0,
          y1: 0,
          x2: 0,
          y2: 0,
        },
        firstLineIdx: 0,
        numLines: 0,
        valid: false,
      },
      elementBounds: {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
        valid: false,
      },
      clippingRect: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
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
      isRenderable: false,
      resLineHeight: undefined,
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
    if (trFontFace === undefined) {
      trFontFace = this.resolveFontFace(state.props);
      state.trFontFace = trFontFace;
      if (trFontFace === undefined) {
        const msg = `SdfTextRenderer: Could not resolve font face for family: '${state.props.fontFamily}'`;
        console.error(msg);
        this.setStatus(state, 'failed', new Error(msg));
        return;
      }
      trFontFace.texture.setRenderableOwner(state, true);
    }

    // If the font hasn't been loaded yet, stop here.
    // Listen for the 'loaded' event and forward fontLoaded event
    if (trFontFace.loaded === false) {
      trFontFace.once('loaded', () => {
        this.scheduleUpdateState(state);
      });
      return;
    }

    // If the font is loaded then so should the data
    assertTruthy(trFontFace.data, 'Font face data should be loaded');
    assertTruthy(trFontFace.metrics, 'Font face metrics should be loaded');

    const {
      text,
      fontSize,
      x,
      y,
      contain,
      width,
      height,
      verticalAlign,
      scrollable,
      overflowSuffix,
      wordBreak,
      maxLines,
    } = state.props;

    // scrollY only has an effect when contain === 'both' and scrollable === true
    const scrollY = contain === 'both' && scrollable ? state.props.scrollY : 0;

    const { renderWindow } = state;

    /**
     * The font size of the SDF font face (the basis for SDF space units)
     */
    const sdfFontSize = trFontFace.data.info.size;

    /**
     * Divide screen space units by this to get the SDF space units
     * Mulitple SDF space units by this to get screen space units
     */
    const fontSizeRatio = fontSize / sdfFontSize;

    // If not already resolved, resolve the line height and store it in the state
    let resLineHeight = state.resLineHeight;
    if (resLineHeight === undefined) {
      const lineHeight = state.props.lineHeight;
      // If lineHeight is undefined, use the maxCharHeight from the font face
      if (lineHeight === undefined) {
        resLineHeight = calcDefaultLineHeight(trFontFace.metrics, fontSize);
      } else {
        resLineHeight = lineHeight;
      }
      state.resLineHeight = resLineHeight;
    }

    // Needed in renderWindow calculation
    const sdfLineHeight = resLineHeight / fontSizeRatio;

    state.distanceRange =
      fontSizeRatio * trFontFace.data.distanceField.distanceRange;

    // Allocate buffers if needed
    const neededLength = text.length * FLOATS_PER_GLYPH;
    let vertexBuffer = state.vertexBuffer;
    if (!vertexBuffer || vertexBuffer.length < neededLength) {
      vertexBuffer = new Float32Array(neededLength * 2);
    }

    const elementBounds = state.elementBounds;
    if (!elementBounds.valid) {
      this.setElementBoundsX(state);
      this.setElementBoundsY(state);
      elementBounds.valid = true;
    }

    // Return early if we're still viewing inside the established render window
    // No need to re-render what we've already rendered
    // (Only if there's an established renderWindow and we're not suppressing early exit)
    if (!forceFullLayoutCalc && renderWindow.valid) {
      const rwScreen = renderWindow.screen;
      if (
        x + rwScreen.x1 <= elementBounds.x1 &&
        x + rwScreen.x2 >= elementBounds.x2 &&
        y - scrollY + rwScreen.y1 <= elementBounds.y1 &&
        y - scrollY + rwScreen.y2 >= elementBounds.y2
      ) {
        this.setStatus(state, 'loaded');
        return;
      }
      // Otherwise invalidate the renderWindow so it can be redone
      renderWindow.valid = false;
      this.setStatus(state, 'loading');
    }

    const { offsetY, textAlign } = state.props;

    // Create a new renderWindow if needed
    if (!renderWindow.valid) {
      const isPossiblyOnScreen = boundsOverlap(
        elementBounds,
        this.rendererBounds,
      );

      if (!isPossiblyOnScreen) {
        // If the element is not possibly on screen, we can skip the layout and rendering completely
        return;
      }

      setRenderWindow(
        renderWindow,
        x,
        y,
        scrollY,
        resLineHeight,
        contain === 'both' ? elementBounds.y2 - elementBounds.y1 : 0,
        elementBounds,
        fontSizeRatio,
      );
      // console.log('newRenderWindow', renderWindow);
    }

    const start = getStartConditions(
      sdfFontSize,
      sdfLineHeight,
      trFontFace,
      verticalAlign,
      offsetY,
      fontSizeRatio,
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
      start.sdfX,
      start.sdfY,
      text,
      textAlign,
      width,
      height,
      fontSize,
      resLineHeight,
      letterSpacing,
      vertexBuffer,
      contain,
      lineCache,
      renderWindow.sdf,
      trFontFace,
      forceFullLayoutCalc,
      scrollable,
      overflowSuffix,
      wordBreak,
      maxLines,
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
      state.textH = out2.numLines * sdfLineHeight * fontSizeRatio;
    }

    // if (state.props.debug.printLayoutTime) {
    //   debugData.layoutSum += performance.now() - updateStartTime;
    //   debugData.layoutCount++;
    // }
    this.setStatus(state, 'loaded');
  }

  override renderQuads(node: CoreTextNode): void {
    const state = node.trState as SdfTextRendererState;
    if (!state.vertexBuffer) {
      // Nothing to draw
      return;
    }

    const renderer = this.stage.renderer;
    assertTruthy(renderer instanceof WebGlRenderer);

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
      elementBounds,
    } = state;

    let { webGlBuffers } = state;

    if (!webGlBuffers) {
      const glw = renderer.glw;
      const stride = 4 * Float32Array.BYTES_PER_ELEMENT;
      const webGlBuffer = glw.createBuffer();
      assertTruthy(webGlBuffer);
      state.webGlBuffers = new BufferCollection([
        {
          buffer: webGlBuffer,
          attributes: {
            a_position: {
              name: 'a_position',
              size: 2, // 2 components per iteration
              type: glw.FLOAT, // the data is 32bit floats
              normalized: false, // don't normalize the data
              stride, // 0 = move forward size * sizeof(type) each iteration to get the next position
              offset: 0, // start at the beginning of the buffer
            },
            a_textureCoords: {
              name: 'a_textureCoords',
              size: 2,
              type: glw.FLOAT,
              normalized: false,
              stride,
              offset: 2 * Float32Array.BYTES_PER_ELEMENT,
            },
          },
        },
      ]);
      state.bufferUploaded = false;
      webGlBuffers = state.webGlBuffers;
    }

    if (!bufferUploaded) {
      const glw = renderer.glw;

      const buffer = webGlBuffers?.getBuffer('a_textureCoords') ?? null;
      glw.arrayBufferData(buffer, vertexBuffer, glw.STATIC_DRAW);
      state.bufferUploaded = true;
    }

    if (scrollable && contain === 'both') {
      const elementRect = convertBoundToRect(elementBounds, tmpRect);

      if (node.clippingRect.valid) {
        state.clippingRect.valid = true;
        node.clippingRect = intersectRect(
          node.clippingRect,
          elementRect,
          state.clippingRect,
        );
      } else {
        state.clippingRect.valid = true;
        node.clippingRect = copyRect(elementRect, state.clippingRect);
      }
    }

    const renderOp = new WebGlRenderOp(
      renderer,
      {
        sdfShaderProps: {
          transform: node.globalTransform!.getFloatArr(),
          color: mergeColorAlpha(color, node.worldAlpha),
          size: fontSize / (trFontFace!.data?.info.size || 0),
          scrollY,
          distanceRange,
          debug: debug.sdfShaderDebug,
        },
        sdfBuffers: state.webGlBuffers as BufferCollection,
        shader: this.sdfShader,
        alpha: node.worldAlpha,
        clippingRect: node.clippingRect,
        height: textH,
        width: textW,
        rtt: false,
        parentHasRenderTexture: node.parentHasRenderTexture,
        framebufferDimensions:
          node.parentHasRenderTexture === true
            ? node.parentFramebufferDimensions
            : null,
      },
      0,
    );

    const texture = state.trFontFace?.texture;
    const ctxTexture = texture!.ctxTexture;

    renderOp.addTexture(ctxTexture as WebGlCtxTexture);
    renderOp.numQuads = state.bufferNumQuads;

    renderer.addRenderOp(renderOp);
  }

  override setIsRenderable(
    state: SdfTextRendererState,
    renderable: boolean,
  ): void {
    super.setIsRenderable(state, renderable);
    state.trFontFace?.texture.setRenderableOwner(state, renderable);
  }

  override destroyState(state: SdfTextRendererState): void {
    super.destroyState(state);
    // If there's a Font Face assigned we must free the owner relation to its texture
    state.trFontFace?.texture.setRenderableOwner(state, false);
  }
  //#endregion Overrides

  public resolveFontFace(props: TrFontProps): SdfTrFontFace | undefined {
    return this.stage.fontManager.resolveFontFace(
      this.fontFamilyArray,
      props,
      'sdf',
    ) as SdfTrFontFace | undefined;
  }

  /**
   * Release the loaded SDF font face
   *
   * @param state
   */
  protected releaseFontFace(state: SdfTextRendererState) {
    state.resLineHeight = undefined;
    if (state.trFontFace) {
      state.trFontFace.texture.setRenderableOwner(state, false);
      state.trFontFace = undefined;
    }
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
    state.renderWindow.valid = false;
    state.elementBounds.valid = false;
    state.textH = undefined;
    state.textW = undefined;
    state.lineCache = [];
    this.setStatus(state, 'loading');
    this.scheduleUpdateState(state);
  }

  protected setElementBoundsX(state: SdfTextRendererState): void {
    const { x, contain, width } = state.props;
    const { elementBounds } = state;
    elementBounds.x1 = x;
    elementBounds.x2 = contain !== 'none' ? x + width : Infinity;
  }

  protected setElementBoundsY(state: SdfTextRendererState): void {
    const { y, contain, height } = state.props;
    const { elementBounds } = state;
    elementBounds.y1 = y;
    elementBounds.y2 = contain === 'both' ? y + height : Infinity;
  }
}
