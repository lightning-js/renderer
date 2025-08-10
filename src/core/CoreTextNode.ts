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
    w: 0,
    h: 0,
  };

  private _type: 'sdf' | 'canvas' = 'sdf'; // Default to SDF renderer

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
    if (dimensions.w > 1 && dimensions.h > 1) {
      this.emit('loaded', {
        type: 'texture',
        dimensions,
      } satisfies NodeTextureLoadedPayload);
    }

    this.w = this._renderInfo.w;
    this.h = this._renderInfo.h;

    // Texture was loaded. In case the RAF loop has already stopped, we request
    // a render to ensure the texture is rendered.
    this.stage.requestRender();
  };

  /**
   * Override CoreNode's update method to handle text-specific updates
   */
  override update(delta: number, parentClippingRect: RectWithValid): void {
    if (
      (this.props.parent?.isRenderable === true &&
        this._layoutGenerated === false) ||
      (this.textProps.forceLoad === true &&
        this._layoutGenerated === false &&
        this.fontHandler.isFontLoaded(this.textProps.fontFamily) === true)
    ) {
      this._cachedLayout = null; // Invalidate cached layout
      this._lastVertexBuffer = null; // Invalidate last vertex buffer
      const resp = this.textRenderer.renderText(this.stage, this.textProps);
      this.handleRenderResult(resp);
      this._layoutGenerated = true;
    }

    // First run the standard CoreNode update
    super.update(delta, parentClippingRect);
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
    // Host paths on top
    const textRendererType = this._type;
    let width = result.w;
    let height = result.h;

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
      this.props.w = width;
      this.props.h = height;
      this.setUpdateType(UpdateType.Local);
    }

    this._renderInfo = result;
    this.emit('loaded', {
      type: 'text',
      dimensions: {
        w: width,
        h: height,
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
        w: this.props.w,
        h: this.props.h,
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
      this.textProps.fontFamily = value;
      this._layoutGenerated = true;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get fontStyle(): TrProps['fontStyle'] {
    return this.textProps.fontStyle;
  }

  set fontStyle(value: TrProps['fontStyle']) {
    if (this.textProps.fontStyle !== value) {
      this.textProps.fontStyle = value;
      this._layoutGenerated = true;
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
