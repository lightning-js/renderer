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
  TrFontProps,
} from './text-rendering/renderers/TextRenderer.js';
import { CoreNode, UpdateType, type CoreNodeProps } from './CoreNode.js';
import type { Stage } from './Stage.js';
import type { CoreRenderer } from './renderers/CoreRenderer.js';
import type {
  NodeTextFailedPayload,
  NodeTextLoadedPayload,
} from '../common/CommonTypes.js';
import type { RectWithValid } from './lib/utils.js';
import { assertTruthy } from '../utils.js';
import { Matrix3d } from './lib/Matrix3d.js';

import type {
  TextBaseline,
  TextVerticalAlign,
} from './text-rendering/renderers/canvas/LightningTextTextureRenderer.js';


export enum CanvasTextUpdateType {
  None = 0,
  Text = 1,
  Font = 2,
  All = 4,
  // TextAlign = 4,
  // TextBaseline = 8,
  // MaxWidth = 16,
  // LineHeight = 32,
}

export interface CoreTextNodeProps extends CoreNodeProps, TrFontProps {
  /**
   * Text to display
   *
   * @default ''
   */
  text: string;
  /**
   * Text alignment
   *
   * @remarks
   * Alignment of the text relative to it's contained bounds. For best results,
   * use {@link contain} mode `'width'` or `'both'` and a set an explicit
   * {@link width} for the text to be aligned within.
   *
   * @default 'left'
   */
  textAlign: 'left' | 'center' | 'right';

  /**
   * Color of text
   *
   * @remarks
   * The color value is a number in the format 0xRRGGBBAA, where RR is the red
   * component, GG is the green component, BB is the blue component, and AA is
   * the alpha component.
   *
   * @default 0xffffffff (opaque white)
   */
  color: number;

  /**
   * Contain mode for text
   *
   * @remarks
   * The contain mode determines how the text is contained within the bounds
   * of the Text Node. The default value is `'none'`, which means that the
   * Text Renderer will not constrain the text in any way. `'width'` mode will
   * constrain the text to the set width wrapping lines as necessary, and
   * `'both'` mode will constrain the text to both the set width and height
   * wrapping lines and truncating text as necessary.
   *
   * ## Text Auto-size Behavior
   * Depending on the set contain mode, after the text 'loaded' event is emitted,
   * the text node may have either its {@link width} and {@link height} updated
   * to match the rendered size of the text.
   *
   * When contain mode is 'none', both the {@link width} and {@link height}
   * properties are updated.
   *
   * When contain mode is 'width', only the {@link height} property is updated.
   *
   * When contain mode is 'both', neither property is updated.
   *
   * @default 'none'
   */
  contain: 'none' | 'width' | 'both';

  /**
   * Letter spacing for text (in pixels)
   *
   * @remarks
   * This property sets additional (or reduced, if value is negative) spacing
   * between characters in the text.
   *
   * @default 0
   */
  letterSpacing: number;

  /**
   * Line height for text (in pixels)
   *
   * @remarks
   * This property sets the height of each line. If set to `undefined`, the
   * line height will be calculated based on the font and font size to be the
   * minimal height required to completely contain a line of text.
   *
   * See: https://github.com/lightning-js/renderer/issues/170
   *
   * @default `undefined`
   */
  lineHeight: number | undefined;

  /**
   * Max lines for text
   *
   * @remarks
   * This property sets max number of lines of a text paragraph.
   * Not yet implemented in the SDF renderer.
   *
   * @default 0
   */
  maxLines: number;

  /**
   * Baseline for text
   *
   * @remarks
   * This property sets the text baseline used when drawing text.
   * Not yet implemented in the SDF renderer.
   *
   * @default alphabetic
   */
  textBaseline: TextBaseline;
  /**
   * Vertical Align for text when lineHeight > fontSize
   *
   * @remarks
   * This property sets the vertical align of the text.
   * Not yet implemented in the SDF renderer.
   *
   * @default middle
   */
  verticalAlign: TextVerticalAlign;

  /**
   * Overflow Suffix for text
   *
   * @remarks
   * The suffix to be added when text is cropped due to overflow.
   * Not yet implemented in the SDF renderer.
   *
   * @default "..."
   */
  overflowSuffix: string;

  /**
   * Font Style String
   *
   * @remarks
   * This property sets the font style string used when drawing text.
   *
   * @default "normal normal normal"
   */
  fontStyleString?: string;

  /**
   * Word wrap
   *
   * @remarks
   * This property sets the word wrap mode for the text.
   *
   * @default true
   */
  wordWrap: boolean;

  /**
   * Debug mode for text
   *
   * @remarks
   * This property sets the debug mode for the text.
   * Not yet implemented in the SDF renderer.
   *
   * @default false
   */
  debug?: boolean;
}

/**
 * An CoreNode in the Renderer scene graph that renders text using Canvas 2D.
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
export class CoreTextCanvasNode extends CoreNode {
  private textUpdateType: CanvasTextUpdateType = CanvasTextUpdateType.None;
  private textProps: Partial<CoreTextNodeProps> = {};
  private textRenderer: TextRenderer;

  private fontLoaded = false;

  constructor(stage: Stage, props: CoreTextNodeProps, textRenderer: TextRenderer) {
    super(stage, props);

    this.textProps = {
      text: props.text,
      fontSize: props.fontSize,
      fontFamily: props.fontFamily,
      fontStretch: props.fontStretch,
      fontStyle: props.fontStyle,
      fontWeight: props.fontWeight,
      textAlign: props.textAlign,
      contain: props.contain,
      letterSpacing: props.letterSpacing,
      lineHeight: props.lineHeight,
      maxLines: props.maxLines,
      textBaseline: props.textBaseline,
      verticalAlign: props.verticalAlign,
      overflowSuffix: props.overflowSuffix,
      wordWrap: props.contain !== 'none',
      debug: props.debug ?? false,
    };

    // set the font style string
    this.textProps.fontStyleString = [
      props.fontStretch,
      props.fontStyle,
      props.fontWeight,
    ].join(' ')

    // locking it to Canvas 2D for now
    this.textRenderer = textRenderer;

    this.setTextUpdateType(CanvasTextUpdateType.All);
  }

  setTextUpdateType(updateType: CanvasTextUpdateType) {
    this.textUpdateType = updateType;
  }

  // handle text updates first
  override update(delta: number, parentClippingRect: RectWithValid): void {
    super.update(delta, parentClippingRect);


    if (this.fontLoaded === false && this.textUpdateType !== CanvasTextUpdateType.Font) {
      this.processFont();
    }

    // No need to do any text updates if the font is not loaded
    if (this.fontLoaded === false) {
      return;
    }

    if (this.textUpdateType === CanvasTextUpdateType.Text) {
      this.updateText();
    }

    this.textUpdateType = CanvasTextUpdateType.None;
  }

  updateText() {
    const { textProps } = this;

    const texture = this.textRenderer.renderText(this.props, this.fontFace);

    if (texture !== null) {
      this.texture = texture;
    }
  }

  async updateFont() {
    if (this.textRenderer.isFontLoaded() === true) {
      this.fountFace = this.textRenderer.getFontFace();
      this.fontLoaded = true;
      return;
    }

    this.fontFace = await this.textRenderer.loadFont(
      this.fontSize,
      this.fontFamily,
      this.fontStretch,
      this.fontStyle,
      this.fontWeight,
    );

    this.fontLoaded = true;
  }

  get text(): string {
    return this.textProps.text || '';
  }

  set text(value: string) {
    this.textProps.text = value || '';
    this.setTextUpdateType(CanvasTextUpdateType.Text);
  }

  get fontSize(): CoreTextNodeProps['fontSize'] {
    assertTruthy(this.textProps.fontSize !== undefined, 'fontSize');
    return this.textProps.fontSize;
  }

  set fontSize(value: CoreTextNodeProps['fontSize']) {
    this.textProps.fontSize = value;
    this.setTextUpdateType(CanvasTextUpdateType.Font);
  }

  get fontFamily(): CoreTextNodeProps['fontFamily'] {
    assertTruthy(this.textProps.fontFamily !== undefined, 'fontFamily');
    return this.textProps.fontFamily;
  }

  set fontFamily(value: CoreTextNodeProps['fontFamily']) {
    this.textProps.fontFamily = value;
    this.setTextUpdateType(CanvasTextUpdateType.Font);
  }

  get fontStretch(): CoreTextNodeProps['fontStretch'] {
    assertTruthy(this.textProps.fontStretch !== undefined, 'fontStretch');
    return this.textProps.fontStretch;
  }

  set fontStretch(value: CoreTextNodeProps['fontStretch']) {
    this.textProps.fontStretch = value || 'normal';
    this.setTextUpdateType(CanvasTextUpdateType.Text);
  }

  get fontStyle(): CoreTextNodeProps['fontStyle'] {
    assertTruthy(this.textProps.fontStyle !== undefined, 'fontStyle');
    return this.textProps.fontStyle;
  }

  set fontStyle(value: CoreTextNodeProps['fontStyle']) {
    this.textProps.fontStyle = value || 'normal';
    this.setTextUpdateType(CanvasTextUpdateType.Font | CanvasTextUpdateType.Text);
  }

  get fontWeight(): CoreTextNodeProps['fontWeight'] {
    assertTruthy(this.textProps.fontWeight !== undefined, 'fontWeight');
    return this.textProps.fontWeight;
  }

  set fontWeight(value: CoreTextNodeProps['fontWeight']) {
    this.textProps.fontWeight = value || 'normal';
    this.setTextUpdateType(CanvasTextUpdateType.Font | CanvasTextUpdateType.Text);
  }

  get textAlign(): CoreTextNodeProps['textAlign'] {
    assertTruthy(this.textProps.textAlign !== undefined, 'textAlign');
    return this.textProps.textAlign;
  }

  set textAlign(value: CoreTextNodeProps['textAlign']) {
    this.textProps.textAlign = value || 'left';
    this.setTextUpdateType(CanvasTextUpdateType.Text);
  }

  get contain(): CoreTextNodeProps['contain'] {
    assertTruthy(this.textProps.contain !== undefined, 'contain');
    return this.textProps.contain;
  }

  set contain(value: CoreTextNodeProps['contain']) {
    this.textProps.contain = value || 'none';
    this.setTextUpdateType(CanvasTextUpdateType.Text);
  }

  get letterSpacing(): CoreTextNodeProps['letterSpacing'] {
    assertTruthy(this.textProps.letterSpacing !== undefined, 'letterSpacing');
    return this.textProps.letterSpacing;
  }

  set letterSpacing(value: CoreTextNodeProps['letterSpacing']) {
    this.textProps.letterSpacing = value || 0;
    this.setTextUpdateType(CanvasTextUpdateType.Text);
  }

  get lineHeight(): CoreTextNodeProps['lineHeight'] {
    return this.textProps.lineHeight;
  }

  set lineHeight(value: CoreTextNodeProps['lineHeight']) {
    this.textProps.lineHeight = value;
    this.setTextUpdateType(CanvasTextUpdateType.Text);
  }

  get maxLines(): CoreTextNodeProps['maxLines'] {
    assertTruthy(this.textProps.maxLines !== undefined, 'maxLines');
    return this.textProps.maxLines;
  }

  set maxLines(value: CoreTextNodeProps['maxLines']) {
    this.textProps.maxLines = value || 0;
    this.setTextUpdateType(CanvasTextUpdateType.Text);
  }

  get textBaseline(): CoreTextNodeProps['textBaseline'] {
    assertTruthy(this.textProps.textBaseline !== undefined, 'textBaseline');
    return this.textProps.textBaseline;
  }

  set textBaseline(value: CoreTextNodeProps['textBaseline']) {
    this.textProps.textBaseline = value || 'alphabetic';
    this.setTextUpdateType(CanvasTextUpdateType.Text);
  }

  get verticalAlign(): CoreTextNodeProps['verticalAlign'] {
    assertTruthy(this.textProps.verticalAlign !== undefined, 'verticalAlign');
    return this.textProps.verticalAlign;
  }

  set verticalAlign(value: CoreTextNodeProps['verticalAlign']) {
    this.textProps.verticalAlign = value || 'middle';
    this.setTextUpdateType(CanvasTextUpdateType.Text);
  }

  get overflowSuffix(): CoreTextNodeProps['overflowSuffix'] {
    assertTruthy(this.textProps.overflowSuffix !== undefined, 'overflowSuffix');
    return this.textProps.overflowSuffix;
  }

  set overflowSuffix(value: CoreTextNodeProps['overflowSuffix']) {
    this.textProps.overflowSuffix = value || '...';
    this.setTextUpdateType(CanvasTextUpdateType.Text);
  }

  get debug(): CoreTextNodeProps['debug'] {
    return this.textProps.debug;
  }

  set debug(value: CoreTextNodeProps['debug']) {
    this.textProps.debug = value;
    this.setTextUpdateType(CanvasTextUpdateType.Text);
  }
}
