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
  TextRenderer,
  TextRendererMap,
  TrProps,
  TextRendererState,
  TrFailedEventHandler,
  TrLoadedEventHandler,
} from './text-rendering/renderers/TextRenderer.js';
import {
  CoreNode,
  UpdateType,
  type CoreNodeWritableProps,
} from './CoreNode.js';
import type { Stage } from './Stage.js';
import type { CoreRenderer } from './renderers/CoreRenderer.js';
import type {
  NodeTextFailedPayload,
  NodeTextLoadedPayload,
} from '../common/CommonTypes.js';
import type { RectWithValid } from './lib/utils.js';
import { assertTruthy } from '../utils.js';
import { Matrix3d } from './lib/Matrix3d.js';

export interface CoreTextNodeWritableProps
  extends CoreNodeWritableProps,
    TrProps {
  /**
   * Force Text Node to use a specific Text Renderer
   *
   * @remarks
   * By default, Text Nodes resolve the Text Renderer to use based on the font
   * that is matched using the font family and other font selection properties.
   *
   * If two fonts supported by two separate Text Renderers are matched setting
   * this override forces the Text Node to resolve to the Text Renderer defined
   * here.
   *
   * @default null
   */
  textRendererOverride: keyof TextRendererMap | null;
}

/**
 * An CoreNode in the Renderer scene graph that renders text.
 *
 * @remarks
 * A Text Node is the second graphical building block of the Renderer scene
 * graph. It renders text using a specific text renderer that is automatically
 * chosen based on the font requested and what type of fonts are installed
 * into an app.
 *
 * The text renderer can be overridden by setting the `textRendererOverride`
 *
 * The `texture` and `shader` properties are managed by loaded text renderer and
 * should not be set directly.
 *
 * For non-text rendering, see {@link CoreNode}.
 */
export class CoreTextNode
  extends CoreNode
  implements CoreTextNodeWritableProps
{
  textRenderer: TextRenderer;
  trState: TextRendererState;
  private _textRendererOverride: CoreTextNodeWritableProps['textRendererOverride'] =
    null;

  constructor(stage: Stage, props: CoreTextNodeWritableProps) {
    super(stage, props);
    this._textRendererOverride = props.textRendererOverride;
    const { resolvedTextRenderer, textRendererState } =
      this.resolveTextRendererAndState({
        x: this.absX,
        y: this.absY,
        width: props.width,
        height: props.height,
        textAlign: props.textAlign,
        color: props.color,
        zIndex: props.zIndex,
        contain: props.contain,
        scrollable: props.scrollable,
        scrollY: props.scrollY,
        offsetY: props.offsetY,
        letterSpacing: props.letterSpacing,
        debug: props.debug,
        fontFamily: props.fontFamily,
        fontSize: props.fontSize,
        fontStretch: props.fontStretch,
        fontStyle: props.fontStyle,
        fontWeight: props.fontWeight,
        text: props.text,
        lineHeight: props.lineHeight,
        maxLines: props.maxLines,
        textBaseline: props.textBaseline,
        verticalAlign: props.verticalAlign,
        overflowSuffix: props.overflowSuffix,
      });
    this.textRenderer = resolvedTextRenderer;
    this.trState = textRendererState;
  }

  private onTextLoaded: TrLoadedEventHandler = () => {
    const { contain } = this;
    const setWidth = this.trState.props.width;
    const setHeight = this.trState.props.height;
    const calcWidth = this.trState.textW || 0;
    const calcHeight = this.trState.textH || 0;

    if (contain === 'both') {
      this.props.width = setWidth;
      this.props.height = setHeight;
    } else if (contain === 'width') {
      this.props.width = setWidth;
      this.props.height = calcHeight;
    } else if (contain === 'none') {
      this.props.width = calcWidth;
      this.props.height = calcHeight;
    }
    this.updateLocalTransform();

    // Incase the RAF loop has been stopped already before text was loaded,
    // we request a render so it can be drawn.
    this.stage.requestRender();
    this.emit('loaded', {
      type: 'text',
      dimensions: {
        width: this.trState.textW || 0,
        height: this.trState.textH || 0,
      },
    } satisfies NodeTextLoadedPayload);
  };

  private onTextFailed: TrFailedEventHandler = (target, error) => {
    this.emit('failed', {
      type: 'text',
      error,
    } satisfies NodeTextFailedPayload);
  };

  override get width(): number {
    return this.props.width;
  }

  override set width(value: number) {
    this.props.width = value;
    this.textRenderer.set.width(this.trState, value);

    // If not containing, we must update the local transform to account for the
    // new width
    if (this.contain === 'none') {
      this.setUpdateType(UpdateType.Local);
    }
  }

  override get height(): number {
    return this.props.height;
  }

  override set height(value: number) {
    this.props.height = value;
    this.textRenderer.set.height(this.trState, value);

    // If not containing in the horizontal direction, we must update the local
    // transform to account for the new height
    if (this.contain !== 'both') {
      this.setUpdateType(UpdateType.Local);
    }
  }

  override get color(): number {
    return this.trState.props.color;
  }

  override set color(value: number) {
    this.textRenderer.set.color(this.trState, value);
  }

  get text(): string {
    return this.trState.props.text;
  }

  set text(value: string) {
    this.textRenderer.set.text(this.trState, value);
  }

  get textRendererOverride(): CoreTextNodeWritableProps['textRendererOverride'] {
    return this._textRendererOverride;
  }

  set textRendererOverride(
    value: CoreTextNodeWritableProps['textRendererOverride'],
  ) {
    this._textRendererOverride = value;

    this.textRenderer.destroyState(this.trState);

    const { resolvedTextRenderer, textRendererState } =
      this.resolveTextRendererAndState(this.trState.props);
    this.textRenderer = resolvedTextRenderer;
    this.trState = textRendererState;
  }

  get fontSize(): CoreTextNodeWritableProps['fontSize'] {
    return this.trState.props.fontSize;
  }

  set fontSize(value: CoreTextNodeWritableProps['fontSize']) {
    this.textRenderer.set.fontSize(this.trState, value);
  }

  get fontFamily(): CoreTextNodeWritableProps['fontFamily'] {
    return this.trState.props.fontFamily;
  }

  set fontFamily(value: CoreTextNodeWritableProps['fontFamily']) {
    this.textRenderer.set.fontFamily(this.trState, value);
  }

  get fontStretch(): CoreTextNodeWritableProps['fontStretch'] {
    return this.trState.props.fontStretch;
  }

  set fontStretch(value: CoreTextNodeWritableProps['fontStretch']) {
    this.textRenderer.set.fontStretch(this.trState, value);
  }

  get fontStyle(): CoreTextNodeWritableProps['fontStyle'] {
    return this.trState.props.fontStyle;
  }

  set fontStyle(value: CoreTextNodeWritableProps['fontStyle']) {
    this.textRenderer.set.fontStyle(this.trState, value);
  }

  get fontWeight(): CoreTextNodeWritableProps['fontWeight'] {
    return this.trState.props.fontWeight;
  }

  set fontWeight(value: CoreTextNodeWritableProps['fontWeight']) {
    this.textRenderer.set.fontWeight(this.trState, value);
  }

  get textAlign(): CoreTextNodeWritableProps['textAlign'] {
    return this.trState.props.textAlign;
  }

  set textAlign(value: CoreTextNodeWritableProps['textAlign']) {
    this.textRenderer.set.textAlign(this.trState, value);
  }

  get contain(): CoreTextNodeWritableProps['contain'] {
    return this.trState.props.contain;
  }

  set contain(value: CoreTextNodeWritableProps['contain']) {
    this.textRenderer.set.contain(this.trState, value);
  }

  get scrollable(): CoreTextNodeWritableProps['scrollable'] {
    return this.trState.props.scrollable;
  }

  set scrollable(value: CoreTextNodeWritableProps['scrollable']) {
    this.textRenderer.set.scrollable(this.trState, value);
  }

  get scrollY(): CoreTextNodeWritableProps['scrollY'] {
    return this.trState.props.scrollY;
  }

  set scrollY(value: CoreTextNodeWritableProps['scrollY']) {
    this.textRenderer.set.scrollY(this.trState, value);
  }

  get offsetY(): CoreTextNodeWritableProps['offsetY'] {
    return this.trState.props.offsetY;
  }

  set offsetY(value: CoreTextNodeWritableProps['offsetY']) {
    this.textRenderer.set.offsetY(this.trState, value);
  }

  get letterSpacing(): CoreTextNodeWritableProps['letterSpacing'] {
    return this.trState.props.letterSpacing;
  }

  set letterSpacing(value: CoreTextNodeWritableProps['letterSpacing']) {
    this.textRenderer.set.letterSpacing(this.trState, value);
  }

  get lineHeight(): CoreTextNodeWritableProps['lineHeight'] {
    return this.trState.props.lineHeight;
  }

  set lineHeight(value: CoreTextNodeWritableProps['lineHeight']) {
    if (this.textRenderer.set.lineHeight) {
      this.textRenderer.set.lineHeight(this.trState, value);
    }
  }

  get maxLines(): CoreTextNodeWritableProps['maxLines'] {
    return this.trState.props.maxLines;
  }

  set maxLines(value: CoreTextNodeWritableProps['maxLines']) {
    if (this.textRenderer.set.maxLines) {
      this.textRenderer.set.maxLines(this.trState, value);
    }
  }

  get textBaseline(): CoreTextNodeWritableProps['textBaseline'] {
    return this.trState.props.textBaseline;
  }

  set textBaseline(value: CoreTextNodeWritableProps['textBaseline']) {
    if (this.textRenderer.set.textBaseline) {
      this.textRenderer.set.textBaseline(this.trState, value);
    }
  }

  get verticalAlign(): CoreTextNodeWritableProps['verticalAlign'] {
    return this.trState.props.verticalAlign;
  }

  set verticalAlign(value: CoreTextNodeWritableProps['verticalAlign']) {
    if (this.textRenderer.set.verticalAlign) {
      this.textRenderer.set.verticalAlign(this.trState, value);
    }
  }

  get overflowSuffix(): CoreTextNodeWritableProps['overflowSuffix'] {
    return this.trState.props.overflowSuffix;
  }

  set overflowSuffix(value: CoreTextNodeWritableProps['overflowSuffix']) {
    if (this.textRenderer.set.overflowSuffix) {
      this.textRenderer.set.overflowSuffix(this.trState, value);
    }
  }

  get debug(): CoreTextNodeWritableProps['debug'] {
    return this.trState.props.debug;
  }

  set debug(value: CoreTextNodeWritableProps['debug']) {
    this.textRenderer.set.debug(this.trState, value);
  }

  override update(delta: number, parentClippingRect: RectWithValid) {
    super.update(delta, parentClippingRect);

    assertTruthy(this.globalTransform);

    // globalTransform is updated in super.update(delta)
    this.textRenderer.set.x(this.trState, this.globalTransform.tx);
    this.textRenderer.set.y(this.trState, this.globalTransform.ty);
  }

  override checkRenderProps(): boolean {
    if (this.trState.props.text !== '') {
      return true;
    }
    return super.checkRenderProps();
  }

  override onChangeIsRenderable(isRenderable: boolean) {
    super.onChangeIsRenderable(isRenderable);
    this.textRenderer.setIsRenderable(this.trState, isRenderable);
  }

  override renderQuads(renderer: CoreRenderer) {
    assertTruthy(this.globalTransform);

    // If the text renderer does not support rendering quads, fallback to the
    // default renderQuads method
    if (!this.textRenderer.renderQuads) {
      super.renderQuads(renderer);
      return;
    }

    // If the text renderer does support rendering quads, use it...

    // Prevent quad rendering if parent has a render texture
    // and this node is not the render texture
    if (this.parentHasRenderTexture) {
      if (!renderer.renderToTextureActive) {
        return;
      }
      // Prevent quad rendering if parent render texture is not the active render texture
      if (this.parentRenderTexture !== renderer.activeRttNode) {
        return;
      }
    }

    if (this.parentHasRenderTexture && this.props.parent?.rtt) {
      this.globalTransform = Matrix3d.identity();
      if (this.localTransform) {
        this.globalTransform.multiply(this.localTransform);
      }
    }

    assertTruthy(this.globalTransform);

    this.textRenderer.renderQuads(
      this.trState,
      this.globalTransform,
      this.clippingRect,
      this.worldAlpha,
      this.parentHasRenderTexture,
      this.framebufferDimensions,
    );
  }

  /**
   * Destroy the node and cleanup all resources
   */
  override destroy(): void {
    super.destroy();

    this.textRenderer.destroyState(this.trState);
  }

  /**
   * Resolve a text renderer and a new state based on the current text renderer props provided
   * @param props
   * @returns
   */
  private resolveTextRendererAndState(props: TrProps): {
    resolvedTextRenderer: TextRenderer;
    textRendererState: TextRendererState;
  } {
    const resolvedTextRenderer = this.stage.resolveTextRenderer(
      props,
      this._textRendererOverride,
    );

    const textRendererState = resolvedTextRenderer.createState(props, this);

    textRendererState.emitter.on('loaded', this.onTextLoaded);
    textRendererState.emitter.on('failed', this.onTextFailed);

    resolvedTextRenderer.scheduleUpdateState(textRendererState);

    return {
      resolvedTextRenderer,
      textRendererState,
    };
  }
}
