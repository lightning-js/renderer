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

import type {
  FontHandler,
  TextRenderer,
  TrProps,
  TextLayout,
  TextRenderInfo,
  FontLoadResult,
} from './text-rendering/TextRenderer.js';
import {
  CoreNode,
  CoreNodeRenderState,
  UpdateType,
  type CoreNodeProps,
} from './CoreNode.js';
import type { Stage } from './Stage.js';
import type {
  NodeTextFailedPayload,
  NodeTextLoadedPayload,
  NodeTextureLoadedPayload,
} from '../common/CommonTypes.js';
import type { RectWithValid } from './lib/utils.js';
import type { CoreRenderer } from './renderers/CoreRenderer.js';
import type { TextureLoadedEventHandler } from './textures/Texture.js';
export interface CoreTextNodeProps extends CoreNodeProps, TrProps {
  /**
   * Force Text Node to use a specific Text Renderer
   */
  textRendererOverride?: string | null;
  forceLoad: boolean;
}

export class CoreTextNode extends CoreNode implements CoreTextNodeProps {
  private textRenderer: TextRenderer;
  private fontHandler: FontHandler;

  private _layoutGenerated = false;

  // SDF layout caching for performance
  private _cachedLayout: TextLayout | null = null;
  private _lastVertexBuffer: Float32Array | null = null;

  // Text renderer properties - stored directly on the node
  private textProps: CoreTextNodeProps;

  private _renderInfo: TextRenderInfo = {
    width: 0,
    height: 0,
  };

  private _type: 'sdf' | 'canvas' = 'sdf'; // Default to SDF renderer

  // Font loading state
  private _fontStatusEmitter: FontLoadResult | null = null;
  private _isWaitingForFont = false;
  private _boundFontLoadedCallback = this._onFontLoaded.bind(this);
  private _boundFontFailedCallback = this._onFontFailed.bind(this);

  constructor(
    stage: Stage,
    props: CoreTextNodeProps,
    textRenderer: TextRenderer,
  ) {
    super(stage, props);
    this.textRenderer = textRenderer;
    this.fontHandler = textRenderer.font;
    this._type = textRenderer.type;

    // Initialize text properties from props
    // Props are guaranteed to have all defaults resolved by Stage.createTextNode
    this.textProps = props;

    this.setUpdateType(UpdateType.All);
  }

  protected override onTextureLoaded: TextureLoadedEventHandler = (
    _,
    dimensions,
  ) => {
    // If parent has a render texture, flag that we need to update
    if (this.parentHasRenderTexture) {
      this.notifyParentRTTOfUpdate();
    }

    // ignore 1x1 pixel textures
    if (dimensions.width > 1 && dimensions.height > 1) {
      this.emit('loaded', {
        type: 'texture',
        dimensions,
      } satisfies NodeTextureLoadedPayload);
    }

    this.width = this._renderInfo.width;
    this.height = this._renderInfo.height;

    // Texture was loaded. In case the RAF loop has already stopped, we request
    // a render to ensure the texture is rendered.
    this.stage.requestRender();
  };

  /**
   * Override CoreNode's update method to handle text-specific updates
   */
  override update(delta: number, parentClippingRect: RectWithValid): void {
    // Check if we can render (either font is loaded or we should force load)
    const canRender =
      (this.props.parent?.isRenderable === true &&
        this._layoutGenerated === false) ||
      (this.textProps.forceLoad === true &&
        this._layoutGenerated === false &&
        this.fontHandler.isFontLoaded(this.textProps.fontFamily) === true);

    if (canRender) {
      console.log(
        `Font '${this.textProps.fontFamily}' is loaded, rendering...`,
      );

      this._cachedLayout = null; // Invalidate cached layout
      this._lastVertexBuffer = null; // Invalidate last vertex buffer
      const resp = this.textRenderer.renderText(this.stage, this.textProps);
      this.handleRenderResult(resp);
    } else if (
      !this.fontHandler.isFontLoaded(this.textProps.fontFamily) &&
      !this._isWaitingForFont
    ) {
      console.log(
        `Font '${this.textProps.fontFamily}' is not loaded, waiting for it...`,
      );

      // Font is not loaded, start waiting for it
      this._isWaitingForFont = true;
      this._setupFontLoadWaiting();
    }

    // First run the standard CoreNode update
    super.update(delta, parentClippingRect);

    //if can render but layout not generated try again next loop
    if (canRender && this._layoutGenerated === false) {
      this.setUpdateType(UpdateType.Local);
    }
  }

  /**
   * Setup listeners for font loading using the proper API
   */
  private _setupFontLoadWaiting(): void {
    const fontStatus = this.fontHandler.getFontStatus(
      this.textProps.fontFamily,
    );

    if (fontStatus.isLoaded) {
      // Font is already loaded, proceed
      this._isWaitingForFont = false;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
      return;
    }

    if (fontStatus.emitter) {
      // Font is being loaded, listen for completion
      this._fontStatusEmitter = fontStatus.emitter;
      this._fontStatusEmitter.on('loaded', this._boundFontLoadedCallback);
      this._fontStatusEmitter.on('failed', this._boundFontFailedCallback);
    } else {
      // Font is not registered at all, can't wait for it
      console.warn(
        `Font '${this.textProps.fontFamily}' is not registered for loading`,
      );
      this._isWaitingForFont = false;
    }
  }

  /**
   * Handle successful font loading
   */
  private _onFontLoaded(): void {
    this._isWaitingForFont = false;
    this._layoutGenerated = false; // Allow re-generation
    this.setUpdateType(UpdateType.Local);
    this._cleanupFontListeners();
  }

  /**
   * Handle failed font loading
   */
  private _onFontFailed(error: Error): void {
    console.error(
      `Font loading failed for '${this.textProps.fontFamily}':`,
      error,
    );
    this._isWaitingForFont = false;
    this._cleanupFontListeners();
    // Could emit a 'failed' event here if needed
  }

  /**
   * Clean up font loading listeners
   */
  private _cleanupFontListeners(): void {
    if (this._fontStatusEmitter) {
      this._fontStatusEmitter.off('loaded', this._boundFontLoadedCallback);
      this._fontStatusEmitter.off('failed', this._boundFontFailedCallback);
      this._fontStatusEmitter = null;
    }
  }

  /**
   * Override destroy to prevent memory leaks from font loading listeners
   */
  override destroy(): void {
    this._cleanupFontListeners();
    super.destroy();
  }

  /**
   * Override is renderable check for SDF text nodes
   */
  override updateIsRenderable(): void {
    // SDF text nodes are always renderable if they have a valid layout
    if (this._type === 'canvas') {
      super.updateIsRenderable();
      return;
    }

    // For SDF, check if we have a cached layout
    this.setRenderable(this._cachedLayout !== null);
  }

  /**
   * Handle the result of text rendering for both Canvas and SDF renderers
   */
  private handleRenderResult(result: TextRenderInfo): void {
    if (result.imageData === undefined && result.layout === undefined) {
      return;
    }
    // Host paths on top
    const textRendererType = this._type;
    let width = result.width;
    let height = result.height;

    // Handle Canvas renderer (uses ImageData)
    if (textRendererType === 'canvas') {
      if (result.imageData === undefined) {
        this.emit('failed', {
          type: 'text',
          error: new Error(
            'Canvas text rendering failed, no image data returned',
          ),
        } satisfies NodeTextFailedPayload);
        return;
      }

      this.texture = this.stage.txManager.createTexture('ImageTexture', {
        premultiplyAlpha: true,
        src: result.imageData as ImageData,
      });

      // It isn't renderable until the texture is loaded we have to set it to false here to avoid it
      // being detected as a renderable default color node in the next frame
      // it will be corrected once the texture is loaded
      this.setRenderable(false);

      if (this.renderState > CoreNodeRenderState.OutOfBounds) {
        // We do want the texture to load immediately
        this.texture.setRenderableOwner(this, true);
      }
    }

    // Handle SDF renderer (uses layout caching)
    if (textRendererType === 'sdf') {
      this._cachedLayout = result.layout || null;
      this.setRenderable(true);
      this.props.width = width;
      this.props.height = height;
      this.setUpdateType(UpdateType.Local);
    }

    this._renderInfo = result;
    this._layoutGenerated = true;
    this.emit('loaded', {
      type: 'text',
      dimensions: {
        width: width,
        height: height,
      },
    } satisfies NodeTextLoadedPayload);
  }

  /**
   * Override renderQuads to handle SDF vs Canvas rendering
   */
  override renderQuads(renderer: CoreRenderer): void {
    // Canvas renderer: use standard texture rendering via CoreNode
    if (this._type === 'canvas') {
      super.renderQuads(renderer);
      return;
    }

    // Early return if no cached data
    if (!this._cachedLayout) {
      return;
    }

    if (this._lastVertexBuffer === null) {
      this._lastVertexBuffer = this.textRenderer.addQuads(this._cachedLayout);
    }

    const props = this.textProps;
    this.textRenderer.renderQuads(
      renderer,
      this._cachedLayout as TextLayout,
      this._lastVertexBuffer!,
      {
        fontFamily: this.textProps.fontFamily,
        fontSize: props.fontSize,
        color: this.props.color || 0xffffffff,
        offsetY: props.offsetY,
        worldAlpha: this.worldAlpha,
        globalTransform: this.globalTransform!.getFloatArr(),
        clippingRect: this.clippingRect,
        width: this.props.width,
        height: this.props.height,
        parentHasRenderTexture: this.parentHasRenderTexture,
        framebufferDimensions:
          this.parentHasRenderTexture === true
            ? this.parentFramebufferDimensions
            : null,
        stage: this.stage,
      },
    );
  }

  get maxWidth() {
    return this.textProps.maxWidth;
  }

  set maxWidth(value: number) {
    if (this.textProps.maxWidth !== value) {
      this.textProps.maxWidth = value;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
    }
  }

  // Property getters and setters
  get maxHeight() {
    return this.textProps.maxHeight;
  }

  set maxHeight(value: number) {
    if (this.textProps.maxHeight !== value) {
      this.textProps.maxHeight = value;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get text(): string {
    return this.textProps.text;
  }

  set text(value: string) {
    if (this.textProps.text !== value) {
      this.textProps.text = value;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get fontSize(): number {
    return this.textProps.fontSize;
  }

  set fontSize(value: number) {
    if (this.textProps.fontSize !== value) {
      this.textProps.fontSize = value;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get fontFamily(): string {
    return this.textProps.fontFamily;
  }

  set fontFamily(value: string) {
    if (this.textProps.fontFamily !== value) {
      this._cleanupFontListeners(); // Clean up old font listeners
      this.textProps.fontFamily = value;
      this._layoutGenerated = false;
      this._isWaitingForFont = false; // Reset waiting state
      this.setUpdateType(UpdateType.Local);
    }
  }

  get fontStyle(): TrProps['fontStyle'] {
    return this.textProps.fontStyle;
  }

  set fontStyle(value: TrProps['fontStyle']) {
    if (this.textProps.fontStyle !== value) {
      this.textProps.fontStyle = value;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get textAlign(): TrProps['textAlign'] {
    return this.textProps.textAlign;
  }

  set textAlign(value: TrProps['textAlign']) {
    if (this.textProps.textAlign !== value) {
      this.textProps.textAlign = value;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get letterSpacing(): number {
    return this.textProps.letterSpacing;
  }

  set letterSpacing(value: number) {
    if (this.textProps.letterSpacing !== value) {
      this.textProps.letterSpacing = value;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get lineHeight(): number {
    return this.textProps.lineHeight;
  }

  set lineHeight(value: number) {
    if (this.textProps.lineHeight !== value) {
      this.textProps.lineHeight = value;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get maxLines(): number {
    return this.textProps.maxLines;
  }

  set maxLines(value: number) {
    if (this.textProps.maxLines !== value) {
      this.textProps.maxLines = value;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get textBaseline(): TrProps['textBaseline'] {
    return this.textProps.textBaseline;
  }

  set textBaseline(value: TrProps['textBaseline']) {
    if (this.textProps.textBaseline !== value) {
      this.textProps.textBaseline = value;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get verticalAlign(): TrProps['verticalAlign'] {
    return this.textProps.verticalAlign;
  }

  set verticalAlign(value: TrProps['verticalAlign']) {
    if (this.textProps.verticalAlign !== value) {
      this.textProps.verticalAlign = value;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get overflowSuffix(): string {
    return this.textProps.overflowSuffix;
  }

  set overflowSuffix(value: string) {
    if (this.textProps.overflowSuffix !== value) {
      this.textProps.overflowSuffix = value;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get wordBreak(): TrProps['wordBreak'] {
    return this.textProps.wordBreak;
  }

  set wordBreak(value: TrProps['wordBreak']) {
    if (this.textProps.wordBreak !== value) {
      this.textProps.wordBreak = value;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get offsetY(): number {
    return this.textProps.offsetY;
  }

  set offsetY(value: number) {
    if (this.textProps.offsetY !== value) {
      this.textProps.offsetY = value;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get forceLoad() {
    return this.textProps.forceLoad;
  }

  set forceLoad(value: boolean) {
    if (this.textProps.forceLoad !== value) {
      this.textProps.forceLoad = value;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get renderInfo(): TextRenderInfo {
    return this._renderInfo;
  }
}
