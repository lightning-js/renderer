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

import type { EventEmitter } from '../../../common/EventEmitter.js';
import type { Stage } from '../../Stage.js';
import type { Matrix3d } from '../../lib/Matrix3d.js';
import type { Rect } from '../../lib/utils.js';
import type {
  TrFontFace,
  TrFontFaceDescriptors,
} from '../font-face-types/TrFontFace.js';

/**
 * Augmentable map of text renderer type IDs to text renderer types.
 *
 * @example
 * ```ts
 * declare module './TextRenderer' {
 *   interface TextRendererMap {
 *     canvas: CanvasTextRenderer;
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TextRendererMap {}

export interface TextRendererState {
  props: TrProps;
  /**
   * Whether or not the text renderer state is scheduled to be updated
   * via queueMicrotask.
   */
  updateScheduled: boolean;
  status: 'initialState' | 'loading' | 'loaded' | 'failed';
  /**
   * Event emitter for the text renderer
   */
  emitter: EventEmitter;

  /**
   * Force a full layout pass for the calculation of the
   * total dimensions of the text
   */
  forceFullLayoutCalc: boolean;
  textW: number | undefined;
  textH: number | undefined;

  debugData: {
    updateCount: number;
    layoutCount: number;
    drawCount: number;
    lastLayoutNumCharacters: number;
    layoutSum: number;
    drawSum: number;
    bufferSize: number;
  };
}

export interface TextRendererDebugProps {
  showRenderWindow: boolean;
  showVisibleRect: boolean;
  showElementRect: boolean;
  disableScissor: boolean;
  printLayoutTime: boolean;
}

/**
 * Text renderer properties that are used in resolving appropriate font faces
 *
 * @remarks
 * Extended by {@link TrProps}
 */
export interface TrFontProps {
  /**
   * Font Family
   *
   * @internalRemarks
   * `fontFamily` is defined currently as single string, but in the future we may want to
   * support multiple font family fallbacks, as this is supported by CSS / Canvas2d. We can
   * do this in a backwards compatible way by unioning an array of strings to the
   * `fontFamily` property.
   */
  fontFamily: string;
  /**
   * Font Weight
   *
   * @remarks
   * The font weight to use when looking up the font face. This can be a numeric
   * value between 1 and 1000, or one of the following strings:
   * - `'normal'` - same as 400
   * - `'bold'` - same as 700
   * - `'bolder'` - (Not yet properly supported)
   */
  fontWeight: TrFontFaceDescriptors['weight'] | 'bolder' | 'lighter';
  /**
   * Font Style
   *
   * @remarks
   * The font style to use when looking up the font face. This can be one of the
   * following strings:
   * - `'normal'`
   * - `'italic'`
   * - `'oblique'`
   */
  fontStyle: TrFontFaceDescriptors['style'];
  /**
   * Font Stretch
   *
   * @remarks
   * The font stretch to use when looking up the font face. This can be one of the
   * following strings:
   * - `'normal'`
   * - `'ultra-condensed'`
   * - `'extra-condensed'`
   * - `'condensed'`
   * - `'semi-condensed'`
   * - `'semi-expanded'`
   * - `'expanded'`
   * - `'extra-expanded'`
   * - `'ultra-expanded'`
   *
   * @default 'normal'
   */
  fontStretch: TrFontFaceDescriptors['stretch'];
  /**
   * Font Size
   *
   * @remarks
   * The font size to use when looking up the font face.
   *
   * The font size is specified in pixels and is the height of the font's
   * em-square. The em-square is essentially the height of the capital letters
   * for the font. The actual height of the text can be larger than the
   * specified font size, as the font may have ascenders and descenders that
   * extend beyond the em-square.
   *
   * @default 16
   */
  fontSize: number;
}

export interface TrProps extends TrFontProps {
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
  x: number;
  y: number;
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
   * @default 'none'
   */
  contain: 'none' | 'width' | 'both';
  width: number;
  height: number;
  /**
   * Whether or not the text is scrollable
   *
   * @remarks
   * If `scrollable` is `true`, the text can be scrolled vertically within the
   * bounds of the Text Node. You can set the scroll position using the
   * {@link scrollY} property.
   *
   * @default false
   */
  scrollable: boolean;
  /**
   * Vertical scroll position for text
   *
   * @remarks
   * The vertical scroll position of the text. This property is only used if
   * {@link scrollable} is `true`.
   *
   * @default 0
   */
  scrollY: number;
  /**
   * Vertical offset for text
   *
   * @remarks
   * The vertical offset of the text. This property is only used if
   * {@link scrollable} is `true`.
   *
   * @default 0
   */
  offsetY: number;
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
  lineHeight?: number | null;
  maxLines?: number | undefined;
  maxLinesSuffix?: string | undefined;
  textOverflow?: 'ellipsis' | 'clip' | undefined;
  zIndex: number;
  debug: Partial<TextRendererDebugProps>;
}

export type TrPropSetters<StateT = TextRendererState> = {
  [key in keyof TrProps]: (state: StateT, value: TrProps[key]) => void;
};

const trPropSetterDefaults: TrPropSetters = {
  x: (state, value) => {
    state.props.x = value;
  },
  y: (state, value) => {
    state.props.y = value;
  },
  width: (state, value) => {
    state.props.width = value;
  },
  height: (state, value) => {
    state.props.height = value;
  },
  color: (state, value) => {
    state.props.color = value;
  },
  zIndex: (state, value) => {
    state.props.zIndex = value;
  },
  fontFamily: (state, value) => {
    state.props.fontFamily = value;
  },
  fontWeight: (state, value) => {
    state.props.fontWeight = value;
  },
  fontStyle: (state, value) => {
    state.props.fontStyle = value;
  },
  fontStretch: (state, value) => {
    state.props.fontStretch = value;
  },
  fontSize: (state, value) => {
    state.props.fontSize = value;
  },
  text: (state, value) => {
    state.props.text = value;
  },
  textAlign: (state, value) => {
    state.props.textAlign = value;
  },
  contain: (state, value) => {
    state.props.contain = value;
  },
  offsetY: (state, value) => {
    state.props.offsetY = value;
  },
  scrollable: (state, value) => {
    state.props.scrollable = value;
  },
  scrollY: (state, value) => {
    state.props.scrollY = value;
  },
  letterSpacing: (state, value) => {
    state.props.letterSpacing = value;
  },
  lineHeight: (state, value) => {
    state.props.lineHeight = value;
  },
  maxLines: (state, value) => {
    state.props.maxLines = value;
  },
  maxLinesSuffix: (state, value) => {
    state.props.maxLinesSuffix = value;
  },
  textOverflow: (state, value) => {
    state.props.textOverflow = value;
  },
  debug: (state, value) => {
    state.props.debug = value;
  },
};

/**
 * Event handler for when text is loaded
 *
 * @remarks
 * Emitted by state.emitter
 */
export type TrLoadedEventHandler = (target: any) => void;

/**
 * Event handler for when text failed to load
 *
 * @remarks
 * Emitted by state.emitter
 */
export type TrFailedEventHandler = (target: any, error: Error) => void;

export abstract class TextRenderer<
  StateT extends TextRendererState = TextRendererState,
> {
  readonly set: Readonly<TrPropSetters<StateT>>;

  constructor(protected stage: Stage) {
    const propSetters = {
      ...trPropSetterDefaults,
      ...this.getPropertySetters(),
    };
    // For each prop setter add a wrapper method that checks if the prop is
    // different before calling the setter
    this.set = Object.freeze(
      Object.fromEntries(
        Object.entries(propSetters).map(([key, setter]) => {
          return [
            key as keyof TrProps,
            (state: StateT, value: TrProps[keyof TrProps]) => {
              if (state.props[key as keyof TrProps] !== value) {
                setter(state, value as never);
              }
            },
          ];
        }),
      ),
    ) as typeof this.set;
  }

  setStatus(state: StateT, status: StateT['status'], error?: Error) {
    // Don't emit the same status twice
    if (state.status === status) {
      return;
    }
    state.status = status;
    state.emitter.emit(status, error);
  }

  /**
   * Called by constructor to get a map of property setter functions for this renderer.
   */
  abstract getPropertySetters(): Partial<TrPropSetters<StateT>>;

  /**
   * Given text renderer properties (particularly the specific properties related to font selection)
   * returns whether or not the renderer can render it.
   *
   * @param props
   */
  abstract canRenderFont(props: TrFontProps): boolean;

  /**
   * Called by the TrFontManager to find out if a newly added font face is supported
   * by this renderer.
   *
   * @param fontFace
   */
  abstract isFontFaceSupported(fontFace: TrFontFace): boolean;

  /**
   * Called by the TrFontManager to add a font face to the renderer's font registry.
   *
   * @remarks
   * This method MUST ONLY be called for a fontFace that previously passed the
   * {@link isFontFaceSupported} check.
   *
   * @param fontFace
   */
  abstract addFontFace(fontFace: TrFontFace): void;

  abstract createState(props: TrProps): StateT;

  /**
   * Schedule a state update via queueMicrotask
   *
   * @remarks
   * This method is used to schedule a state update via queueMicrotask. This
   * method should be called whenever a state update is needed, and it will
   * ensure that the state is only updated once per microtask.
   * @param state
   * @returns
   */
  scheduleUpdateState(state: StateT): void {
    if (state.updateScheduled) {
      return;
    }
    state.updateScheduled = true;
    queueMicrotask(() => {
      state.updateScheduled = false;
      this.updateState(state);
    });
  }

  abstract updateState(state: StateT): void;

  abstract renderQuads(
    state: StateT,
    transform: Matrix3d,
    clippingRect: Rect | null,
    alpha: number,
  ): void;
}
