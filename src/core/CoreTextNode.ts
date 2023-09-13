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

import type {
  TextRenderer,
  TextRendererMap,
  TrProps,
  TextRendererState,
} from './text-rendering/renderers/TextRenderer.js';
import { CoreNode, type CoreNodeProps } from './CoreNode.js';
import type { Stage } from './Stage.js';
import type { CoreRenderer } from './renderers/CoreRenderer.js';
import type {
  TextFailedEventHandler,
  TextLoadedEventHandler,
} from '../common/CommonTypes.js';

export interface CoreTextNodeProps extends CoreNodeProps, TrProps {
  text: string;
  textRendererOverride: keyof TextRendererMap | null;
}

type ICoreTextNode = Omit<
  CoreTextNodeProps,
  'texture' | 'textureOptions' | 'shader' | 'shaderProps'
>;

export class CoreTextNode extends CoreNode implements ICoreTextNode {
  textRenderer: TextRenderer;
  trState: TextRendererState;
  updateScheduled: boolean;
  private _textRendererOverride: CoreTextNodeProps['textRendererOverride'] =
    null;

  constructor(stage: Stage, props: CoreTextNodeProps) {
    super(stage, props);
    this.updateScheduled = false;
    // console.log('fontfamily', props.fontFamily)
    this._textRendererOverride = props.textRendererOverride;
    const { resolvedTextRenderer, textRendererState } =
      this.resolveTextRendererAndState(
        {
          x: this.absX,
          y: this.absY,
          width: props.width,
          height: props.height,
          textAlign: props.textAlign,
          color: props.color,
          alpha: props.alpha,
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
        },
        undefined,
      );
    this.textRenderer = resolvedTextRenderer;
    this.trState = textRendererState;
  }

  private onTextLoaded: TextLoadedEventHandler = () => {
    this.emit('textLoaded', {
      width: this.trState.textW,
      height: this.trState.textH,
    });
  };

  private onTextFailed: TextFailedEventHandler = (target, error) => {
    this.emit('textFailed', error);
  };

  override get width(): number {
    return this.trState.props.width;
  }

  override set width(value: number) {
    this.textRenderer.set.width(this.trState, value);
    this.updateText();
  }

  override get height(): number {
    return this.trState.props.height;
  }

  override set height(value: number) {
    this.textRenderer.set.height(this.trState, value);
    this.updateText();
  }

  override get alpha(): number {
    return this.trState.props.alpha;
  }

  override set alpha(value: number) {
    this.textRenderer.set.alpha(this.trState, value);
    this.updateText();
  }

  override get color(): number {
    return this.trState.props.color;
  }

  override set color(value: number) {
    this.textRenderer.set.color(this.trState, value);
    this.updateText();
  }

  get text(): string {
    return this.trState.props.text;
  }

  set text(value: string) {
    this.textRenderer.set.text(this.trState, value);
    this.updateText();
  }

  get textRendererOverride(): CoreTextNodeProps['textRendererOverride'] {
    return this._textRendererOverride;
  }

  set textRendererOverride(value: CoreTextNodeProps['textRendererOverride']) {
    this._textRendererOverride = value;

    const { resolvedTextRenderer, textRendererState } =
      this.resolveTextRendererAndState(this.trState.props, this.trState);
    this.textRenderer = resolvedTextRenderer;
    this.trState = textRendererState;
  }

  get fontSize(): CoreTextNodeProps['fontSize'] {
    return this.trState.props.fontSize;
  }

  set fontSize(value: CoreTextNodeProps['fontSize']) {
    this.textRenderer.set.fontSize(this.trState, value);
    this.updateText();
  }

  get fontFamily(): CoreTextNodeProps['fontFamily'] {
    return this.trState.props.fontFamily;
  }

  set fontFamily(value: CoreTextNodeProps['fontFamily']) {
    this.textRenderer.set.fontFamily(this.trState, value);
    this.updateText();
  }

  get fontStretch(): CoreTextNodeProps['fontStretch'] {
    return this.trState.props.fontStretch;
  }

  set fontStretch(value: CoreTextNodeProps['fontStretch']) {
    this.textRenderer.set.fontStretch(this.trState, value);
    this.updateText();
  }

  get fontStyle(): CoreTextNodeProps['fontStyle'] {
    return this.trState.props.fontStyle;
  }

  set fontStyle(value: CoreTextNodeProps['fontStyle']) {
    this.textRenderer.set.fontStyle(this.trState, value);
    this.updateText();
  }

  get fontWeight(): CoreTextNodeProps['fontWeight'] {
    return this.trState.props.fontWeight;
  }

  set fontWeight(value: CoreTextNodeProps['fontWeight']) {
    this.textRenderer.set.fontWeight(this.trState, value);
    this.updateText();
  }

  get textAlign(): CoreTextNodeProps['textAlign'] {
    return this.trState.props.textAlign;
  }

  set textAlign(value: CoreTextNodeProps['textAlign']) {
    this.textRenderer.set.textAlign(this.trState, value);
    this.updateText();
  }

  get contain(): CoreTextNodeProps['contain'] {
    return this.trState.props.contain;
  }

  set contain(value: CoreTextNodeProps['contain']) {
    this.textRenderer.set.contain(this.trState, value);
    this.updateText();
  }

  get scrollable(): CoreTextNodeProps['scrollable'] {
    return this.trState.props.scrollable;
  }

  set scrollable(value: CoreTextNodeProps['scrollable']) {
    this.textRenderer.set.scrollable(this.trState, value);
    this.updateText();
  }

  get scrollY(): CoreTextNodeProps['scrollY'] {
    return this.trState.props.scrollY;
  }

  set scrollY(value: CoreTextNodeProps['scrollY']) {
    this.textRenderer.set.scrollY(this.trState, value);
    this.updateText();
  }

  get offsetY(): CoreTextNodeProps['offsetY'] {
    return this.trState.props.offsetY;
  }

  set offsetY(value: CoreTextNodeProps['offsetY']) {
    this.textRenderer.set.offsetY(this.trState, value);
    this.updateText();
  }

  get letterSpacing(): CoreTextNodeProps['letterSpacing'] {
    return this.trState.props.letterSpacing;
  }

  set letterSpacing(value: CoreTextNodeProps['letterSpacing']) {
    this.textRenderer.set.letterSpacing(this.trState, value);
    this.updateText();
  }

  get debug(): CoreTextNodeProps['debug'] {
    return this.trState.props.debug;
  }

  set debug(value: CoreTextNodeProps['debug']) {
    this.textRenderer.set.debug(this.trState, value);
    this.updateText();
  }

  override update(delta: number) {
    super.update(delta);
    this.textRenderer.set.x(this.trState, this.worldContext.px);
    this.textRenderer.set.y(this.trState, this.worldContext.py);
    if (this.trState.status === 'loading') {
      this.updateText();
    }
  }

  private updateText() {
    if (this.updateScheduled) {
      return;
    }
    this.updateScheduled = true;
    queueMicrotask(() => {
      this.updateScheduled = false;
      this.textRenderer.updateState(this.trState);
    });
  }

  override renderQuads(renderer: CoreRenderer) {
    this.textRenderer.renderQuads(this.trState);
  }

  /**
   * Resolve a text renderer and a new state based on the current text renderer props provided
   * @param props
   * @returns
   */
  private resolveTextRendererAndState(
    props: TrProps,
    prevState?: TextRendererState,
  ): {
    resolvedTextRenderer: TextRenderer;
    textRendererState: TextRendererState;
  } {
    const resolvedTextRenderer = this.stage.resolveTextRenderer(
      props,
      this._textRendererOverride,
    );

    const textRendererState = resolvedTextRenderer.createState(props);

    const stateEvents = ['loading', 'loaded', 'failed'];

    if (prevState) {
      // Remove the old event listeners from previous state obj there was one
      stateEvents.forEach((eventName) => {
        prevState.emitter.off(eventName);
      });
    }

    // Forward basic status events from the text renderer state
    textRendererState.emitter.on('loading', () => {
      // This event will be fired only once between the `loading` and `loaded`
      // event ONLY if the font is not already loaded
      textRendererState.emitter.once('fontLoaded', () => {
        // When it's fired we must run update to make sure the text renders
        this.updateText();
      });

      textRendererState.emitter.once('loaded', () => {
        // Make sure we stop listening for fontLoaded events
        textRendererState.emitter.off('fontLoaded');
      });
    });

    textRendererState.emitter.on('loaded', this.onTextLoaded);
    textRendererState.emitter.on('failed', this.onTextFailed);
    this.updateText();

    // TODO: Handle text renderer errors

    return {
      resolvedTextRenderer,
      textRendererState,
    };
  }
}
