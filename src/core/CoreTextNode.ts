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
} from './text-rendering/TextRenderer.js';
import { CoreNode, UpdateType, type CoreNodeProps } from './CoreNode.js';
import type { Stage } from './Stage.js';
import type {
  NodeTextFailedPayload,
  NodeTextLoadedPayload,
} from '../common/CommonTypes.js';
import type { RectWithValid } from './lib/utils.js';
import type { CoreRenderer } from './renderers/CoreRenderer.js';

// Internal text update tracking
enum TextUpdateReason {
  None = 0,
  FontChange = 1,
  TextChange = 2,
  Both = 3, // FontChange | TextChange
}

export interface CoreTextNodeProps extends CoreNodeProps, TrProps {
  /**
   * Force Text Node to use a specific Text Renderer
   */
  textRendererOverride?: string | null;
}

export class CoreTextNode extends CoreNode implements CoreTextNodeProps {
  private textRenderer: TextRenderer;
  private fontHandler: FontHandler;

  // SDF layout caching for performance
  private _cachedLayout: TextLayout | null = null;
  private _lastVertexBuffer: Float32Array | null = null;

  // Internal text update tracking
  private _pendingTextUpdate: TextUpdateReason = TextUpdateReason.Both;

  // Text renderer properties - stored directly on the node
  // All defaults are handled by Stage.createTextNode
  private _text!: string;
  private _fontFamily!: string;
  private _fontSize!: number;
  private _fontStyle!: TrProps['fontStyle'];
  private _textAlign!: TrProps['textAlign'];
  private _contain!: TrProps['contain'];
  private _letterSpacing!: number;
  private _lineHeight: number | undefined;
  private _maxLines!: number;
  private _textBaseline!: TrProps['textBaseline'];
  private _verticalAlign!: TrProps['verticalAlign'];
  private _overflowSuffix!: string;
  private _wordBreak!: TrProps['wordBreak'];
  private _offsetY!: number;

  private _textRenderNeeded: boolean = true;

  constructor(
    stage: Stage,
    props: CoreTextNodeProps,
    textRenderer: TextRenderer,
  ) {
    super(stage, props);
    this.textRenderer = textRenderer;
    this.fontHandler = textRenderer.font;

    // Initialize text properties from props
    // Props are guaranteed to have all defaults resolved by Stage.createTextNode
    this._text = props.text;
    this._fontFamily = props.fontFamily;
    this._fontSize = props.fontSize;
    this._fontStyle = props.fontStyle;
    this._textAlign = props.textAlign;
    this._contain = props.contain;
    this._letterSpacing = props.letterSpacing;
    this._lineHeight = props.lineHeight;
    this._maxLines = props.maxLines;
    this._textBaseline = props.textBaseline;
    this._verticalAlign = props.verticalAlign;
    this._overflowSuffix = props.overflowSuffix;
    this._wordBreak = props.wordBreak;
    this._offsetY = props.offsetY;

    // Mark text as needing update - this will trigger the text rendering process
    this._pendingTextUpdate = TextUpdateReason.Both;
    this.setUpdateType(UpdateType.Local);
  }

  /**
   * Override CoreNode's update method to handle text-specific updates
   */
  override update(delta: number, parentClippingRect: RectWithValid): void {
    // First run the standard CoreNode update
    super.update(delta, parentClippingRect);

    // Handle text-specific updates if we have pending updates
    // Process synchronously in the same tick to maintain frame consistency
    if (this._pendingTextUpdate === TextUpdateReason.None) {
      return; // No updates needed
    }

    // Clear cached layout data when any text update is pending
    this.clearCachedLayout();

    const textUpdateReason = this._pendingTextUpdate;
    let fontUpdateNeeded = false;
    let textRenderNeeded = false;

    // Check if font update is needed
    if (textUpdateReason & TextUpdateReason.FontChange) {
      fontUpdateNeeded = true;
    }

    // Check if text render update is needed
    if (textUpdateReason & TextUpdateReason.TextChange) {
      textRenderNeeded = true;
    }

    // Step 1: Check if the font is loaded
    if (
      fontUpdateNeeded &&
      this.fontHandler.isFontLoaded(this._fontFamily) === false
    ) {
      return; // Exit early, will re-render when font is loaded
    }

    // Step 2: Render text if rendering is needed
    if (textRenderNeeded || this._textRenderNeeded) {
      this.textRenderer
        .renderText(this.stage, {
          x: this.props.x,
          y: this.props.y,
          zIndex: this.props.zIndex,
          text: this._text,
          fontFamily: this._fontFamily,
          fontSize: this._fontSize,
          fontStyle: this._fontStyle,
          textAlign: this._textAlign,
          contain: this._contain,
          letterSpacing: this._letterSpacing,
          lineHeight: this._lineHeight,
          maxLines: this._maxLines,
          textBaseline: this._textBaseline,
          verticalAlign: this._verticalAlign,
          color: this.props.color,
          offsetY: this._offsetY,
          width: this.props.width,
          height: this.props.height,
          overflowSuffix: this._overflowSuffix,
          wordBreak: this._wordBreak,
        })
        .then(this.handleRenderResult.bind(this))
        .catch((error) => {
          // Emit failure if rendering fails
          this.emit('failed', {
            type: 'text',
            error: error as Error,
          } satisfies NodeTextFailedPayload);
        });
    }

    // Reset pending updates after processing
    this._pendingTextUpdate = TextUpdateReason.None;
    this._textRenderNeeded = false; // Reset render needed flag
  }

  /**
   * Handle the result of text rendering for both Canvas and SDF renderers
   */
  private handleRenderResult(result: {
    imageData: ImageData | null;
    width: number;
    height: number;
    layout?: TextLayout;
  }): void {
    // Host paths on top
    const textRendererType = this.textRenderer.type;
    const setWidth = this.props.width;
    const setHeight = this.props.height;
    const resultWidth = result.width;
    const resultHeight = result.height;
    const contain = this._contain;

    // Handle Canvas renderer (uses ImageData)
    if (textRendererType === 'canvas') {
      if (!result.imageData) {
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
        src: result.imageData,
      });
    }

    // Handle SDF renderer (uses layout caching)
    if (textRendererType === 'sdf') {
      this._cachedLayout = result.layout || null;

      if (this._cachedLayout) {
        this._lastVertexBuffer = this.textRenderer.addQuads(this._cachedLayout);
      }
    }

    // Get alpha from color property
    this.alpha = this.props.color
      ? ((this.props.color >>> 24) & 0xff) / 255
      : 1;

    // Update dimensions based on contain mode (same for both renderers)
    if (contain === 'both') {
      this.props.width = setWidth;
      this.props.height = setHeight;
    } else if (contain === 'width') {
      this.props.width = setWidth;
      this.props.height = resultHeight;
    } else if (contain === 'none') {
      this.props.width = resultWidth;
      this.props.height = resultHeight;
    }

    this._textRenderNeeded = false;
    this.setUpdateType(UpdateType.Local);
    this.stage.requestRender();

    this.emit('loaded', {
      type: 'text',
      dimensions: {
        width: resultWidth,
        height: resultHeight,
      },
    } satisfies NodeTextLoadedPayload);
  }

  /**
   * Override renderQuads to handle SDF vs Canvas rendering
   */
  override renderQuads(renderer: CoreRenderer): void {
    const textRendererType = this.textRenderer.type;

    // Canvas renderer: use standard texture rendering via CoreNode
    if (textRendererType === 'canvas') {
      super.renderQuads(renderer);
      return;
    }

    // SDF renderer: use WebGL quad-based rendering
    this.renderSdfQuads(renderer);
  }

  /**
   * Handle SDF-specific WebGL quad rendering
   */
  private renderSdfQuads(renderer: CoreRenderer): void {
    // Early return if no cached data
    if (!this._cachedLayout || !this._lastVertexBuffer) {
      return;
    }

    this.textRenderer.renderQuads(
      renderer,
      this._cachedLayout as TextLayout,
      this._lastVertexBuffer,
      {
        fontFamily: this._fontFamily,
        fontSize: this._fontSize,
        color: this.props.color || 0xffffffff,
        offsetY: this._offsetY,
        worldAlpha: this.worldAlpha,
        globalTransform:
          this.globalTransform?.getFloatArr() || new Float32Array(16),
        clippingRect: this.clippingRect,
        width: this.props.width,
        height: this.props.height,
        parentHasRenderTexture: this.parentHasRenderTexture,
        framebufferDimensions: this.parentFramebufferDimensions,
        stage: this.stage,
      },
    );
  }

  /**
   * Clear cached layout data when text properties change
   */
  private clearCachedLayout(): void {
    this._cachedLayout = null;
    this._lastVertexBuffer = null;
  }

  // Property getters and setters
  get text(): string {
    return this._text;
  }

  set text(value: string) {
    if (this._text !== value) {
      this._text = value;
      this._textRenderNeeded = true;
      this._pendingTextUpdate |= TextUpdateReason.TextChange;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get fontSize(): number {
    return this._fontSize;
  }

  set fontSize(value: number) {
    if (this._fontSize !== value) {
      this._fontSize = value;
      this._textRenderNeeded = true;
      this._pendingTextUpdate |= TextUpdateReason.TextChange;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get fontFamily(): string {
    return this._fontFamily;
  }

  set fontFamily(value: string) {
    if (this._fontFamily !== value) {
      this._fontFamily = value;
      this._textRenderNeeded = true;
      this._pendingTextUpdate |= TextUpdateReason.Both;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get fontStyle(): TrProps['fontStyle'] {
    return this._fontStyle;
  }

  set fontStyle(value: TrProps['fontStyle']) {
    if (this._fontStyle !== value) {
      this._fontStyle = value;
      this._textRenderNeeded = true;
      this._pendingTextUpdate |= TextUpdateReason.Both;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get textAlign(): TrProps['textAlign'] {
    return this._textAlign;
  }

  set textAlign(value: TrProps['textAlign']) {
    if (this._textAlign !== value) {
      this._textAlign = value;
      this._textRenderNeeded = true;
      this._pendingTextUpdate |= TextUpdateReason.TextChange;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get contain(): TrProps['contain'] {
    return this._contain;
  }

  set contain(value: TrProps['contain']) {
    if (this._contain !== value) {
      this._contain = value;
      this._textRenderNeeded = true;
      this._pendingTextUpdate |= TextUpdateReason.TextChange;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get letterSpacing(): number {
    return this._letterSpacing;
  }

  set letterSpacing(value: number) {
    if (this._letterSpacing !== value) {
      this._letterSpacing = value;
      this._textRenderNeeded = true;
      this._pendingTextUpdate |= TextUpdateReason.TextChange;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get lineHeight(): number | undefined {
    return this._lineHeight;
  }

  set lineHeight(value: number | undefined) {
    if (this._lineHeight !== value) {
      this._lineHeight = value;
      this._textRenderNeeded = true;
      this._pendingTextUpdate |= TextUpdateReason.TextChange;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get maxLines(): number {
    return this._maxLines;
  }

  set maxLines(value: number) {
    if (this._maxLines !== value) {
      this._maxLines = value;
      this._textRenderNeeded = true;
      this._pendingTextUpdate |= TextUpdateReason.TextChange;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get textBaseline(): TrProps['textBaseline'] {
    return this._textBaseline;
  }

  set textBaseline(value: TrProps['textBaseline']) {
    if (this._textBaseline !== value) {
      this._textBaseline = value;
      this._textRenderNeeded = true;
      this._pendingTextUpdate |= TextUpdateReason.TextChange;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get verticalAlign(): TrProps['verticalAlign'] {
    return this._verticalAlign;
  }

  set verticalAlign(value: TrProps['verticalAlign']) {
    if (this._verticalAlign !== value) {
      this._verticalAlign = value;
      this._textRenderNeeded = true;
      this._pendingTextUpdate |= TextUpdateReason.TextChange;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get overflowSuffix(): string {
    return this._overflowSuffix;
  }

  set overflowSuffix(value: string) {
    if (this._overflowSuffix !== value) {
      this._overflowSuffix = value;
      this._textRenderNeeded = true;
      this._pendingTextUpdate |= TextUpdateReason.TextChange;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get wordBreak(): TrProps['wordBreak'] {
    return this._wordBreak;
  }

  set wordBreak(value: TrProps['wordBreak']) {
    if (this._wordBreak !== value) {
      this._wordBreak = value;
      this._textRenderNeeded = true;
      this._pendingTextUpdate |= TextUpdateReason.TextChange;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get offsetY(): number {
    return this._offsetY;
  }

  set offsetY(value: number) {
    if (this._offsetY !== value) {
      this._offsetY = value;
      this._textRenderNeeded = true;
      this._pendingTextUpdate |= TextUpdateReason.TextChange;
      this.setUpdateType(UpdateType.Local);
    }
  }
}
