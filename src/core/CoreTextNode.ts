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
} from './text-rendering/renderers/TextRenderer.js';
import { CoreNode, UpdateType, type CoreNodeProps } from './CoreNode.js';
import type { Stage } from './Stage.js';
import type {
  NodeTextFailedPayload,
  NodeTextLoadedPayload,
} from '../common/CommonTypes.js';
import type { RectWithValid } from './lib/utils.js';

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

  // Internal text update tracking
  private _pendingTextUpdate: TextUpdateReason = TextUpdateReason.Both;

  // Text renderer properties - stored directly on the node
  private _text: string = '';
  private _fontFamily: string = 'sans-serif';
  private _fontSize: number = 16;
  private _fontWeight: TrProps['fontWeight'] = 'normal';
  private _fontStyle: TrProps['fontStyle'] = 'normal';
  private _fontStretch: TrProps['fontStretch'] = 'normal';
  private _textAlign: TrProps['textAlign'] = 'left';
  private _contain: TrProps['contain'] = 'none';
  private _letterSpacing: number = 0;
  private _lineHeight: number | undefined = undefined;
  private _maxLines: number = 0;
  private _textBaseline: TrProps['textBaseline'] = 'alphabetic';
  private _verticalAlign: TrProps['verticalAlign'] = 'middle';
  private _overflowSuffix: string = '...';
  private _wordBreak: TrProps['wordBreak'] = 'normal';
  private _offsetY: number = 0;

  // Font loading state
  private _fontLoadStatus: 'unloaded' | 'loading' | 'loaded' | 'failed' =
    'unloaded';
  private _textRenderNeeded: boolean = true;

  constructor(
    stage: Stage,
    props: CoreTextNodeProps,
    textRenderer: TextRenderer,
  ) {
    super(stage, props);
    this.textRenderer = textRenderer;
    this.fontHandler = textRenderer.fontHandler;

    // Initialize text properties from props
    this._text = props.text || '';
    this._fontFamily = props.fontFamily || 'sans-serif';
    this._fontSize = props.fontSize || 16;
    this._fontWeight = props.fontWeight || 'normal';
    this._fontStyle = props.fontStyle || 'normal';
    this._fontStretch = props.fontStretch || 'normal';
    this._textAlign = props.textAlign || 'left';
    this._contain = props.contain || 'none';
    this._letterSpacing = props.letterSpacing || 0;
    this._lineHeight = props.lineHeight;
    this._maxLines = props.maxLines || 0;
    this._textBaseline = props.textBaseline || 'alphabetic';
    this._overflowSuffix = props.overflowSuffix || '...';
    this._wordBreak = props.wordBreak || 'normal';
    this._offsetY = props.offsetY || 0;

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

    const textUpdateReason = this._pendingTextUpdate;
    let fontUpdateNeeded = false;
    let textRenderNeeded = false;

    // Check if font update is needed
    if (textUpdateReason & TextUpdateReason.FontChange) {
      fontUpdateNeeded = true;
      // Reset font load status when font changes
      this._fontLoadStatus = 'unloaded';
    }

    // Check if text render update is needed
    if (textUpdateReason & TextUpdateReason.TextChange) {
      textRenderNeeded = true;
    }

    // Step 1: Handle font loading if needed
    if (fontUpdateNeeded || this._fontLoadStatus === 'unloaded') {
      const isFontLoaded = this.fontHandler.isFontLoaded(this._fontFamily);

      if (!isFontLoaded && this._fontLoadStatus === 'unloaded') {
        this._fontLoadStatus = 'loading';
        // Start font loading asynchronously but don't block the update
        this.fontHandler
          .loadFont(this._fontFamily)
          .then(() => {
            this._fontLoadStatus = 'loaded';
            // Mark for re-render when font loads
            this._textRenderNeeded = true;
            this._pendingTextUpdate |= TextUpdateReason.TextChange;
            this.setUpdateType(UpdateType.Local);
          })
          .catch((error) => {
            this._fontLoadStatus = 'failed';
            this.emit('failed', {
              type: 'text',
              error: error as Error,
            } satisfies NodeTextFailedPayload);
          });
        return; // Exit early, will re-render when font loads
      }
    }

    // Step 2: Render text if font is loaded and rendering is needed
    if (
      this._fontLoadStatus === 'loaded' &&
      (textRenderNeeded || this._textRenderNeeded)
    ) {
      this.textRenderer
        .renderText(this.stage, {
          x: this.props.x,
          y: this.props.y,
          zIndex: this.props.zIndex,
          text: this._text,
          fontFamily: this._fontFamily,
          fontSize: this._fontSize,
          fontWeight: this._fontWeight,
          fontStyle: this._fontStyle,
          fontStretch: this._fontStretch,
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
        .then((result) => {
          // Handle the result of text rendering
          this.handleRenderResult(result);
        })
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
   * Handle the result of text rendering
   */
  private handleRenderResult(result: {
    imageData: ImageData | null;
    width: number;
    height: number;
  }): void {
    if (!result.imageData) {
      // If rendering failed, emit failure event
      this.emit('failed', {
        type: 'text',
        error: new Error('Text rendering failed, no image data returned'),
      } satisfies NodeTextFailedPayload);
      return;
    }

    // Create a texture from the image data
    this.texture = this.stage.txManager.createTexture('ImageTexture', {
      premultiplyAlpha: true,
      src: result.imageData,
    });

    // Get the alpha from the color property
    this.alpha = this.props.color
      ? ((this.props.color >>> 24) & 0xff) / 255
      : 1;

    // Update dimensions based on contain mode
    const { contain } = this;
    const setWidth = this.props.width;
    const setHeight = this.props.height;
    const height = result.height;
    const width = result.width;

    if (contain === 'both') {
      // Keep original dimensions
      this.props.width = setWidth;
      this.props.height = setHeight;
    } else if (contain === 'width') {
      // Keep width, update height
      this.props.width = setWidth;
      this.props.height = height;
    } else if (contain === 'none') {
      // Update both dimensions
      this.props.width = width;
      this.props.height = height;
    }

    this._textRenderNeeded = false;
    this.setUpdateType(UpdateType.Local);
    this.stage.requestRender();

    this.emit('loaded', {
      type: 'text',
      dimensions: {
        width: result.width,
        height: result.height,
      },
    } satisfies NodeTextLoadedPayload);
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
      this._fontLoadStatus = 'unloaded'; // Reset font load status
      this._textRenderNeeded = true;
      this._pendingTextUpdate |= TextUpdateReason.Both;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get fontWeight(): TrProps['fontWeight'] {
    return this._fontWeight;
  }

  set fontWeight(value: TrProps['fontWeight']) {
    if (this._fontWeight !== value) {
      this._fontWeight = value;
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

  get fontStretch(): TrProps['fontStretch'] {
    return this._fontStretch;
  }

  set fontStretch(value: TrProps['fontStretch']) {
    if (this._fontStretch !== value) {
      this._fontStretch = value;
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
