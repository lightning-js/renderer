/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2025 Comcast Cable Communications Management, LLC.
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

import type { RGBA } from '../../lib/utils';

/**
 * Text Overflow Values
 */
export type TextOverflow =
  | 'ellipsis'
  | 'clip'
  | (string & Record<never, never>);

/***
 * Text Horizontal Align Values
 */
export type TextAlign = 'left' | 'center' | 'right';

/***
 * Text Baseline Values
 */
export type TextBaseline =
  | 'alphabetic'
  | 'top'
  | 'hanging'
  | 'middle'
  | 'ideographic'
  | 'bottom';

/***
 * Text Vertical Align Values
 */
export type TextVerticalAlign = 'top' | 'middle' | 'bottom';

/**
 * Text Texture Settings
 */
export interface Settings {
  w: number;
  h: number;
  text: string;
  fontStyle: string;
  fontSize: number;
  fontBaselineRatio: number;
  fontFamily: string | null;
  trFontFace: WebTrFontFace | null;
  wordWrap: boolean;
  wordWrapWidth: number;
  wordBreak: 'normal' | 'break-all' | 'break-word';
  textOverflow: TextOverflow | null;
  lineHeight: number | null;
  textBaseline: TextBaseline;
  textAlign: TextAlign;
  verticalAlign: TextVerticalAlign;
  offsetY: number | null;
  maxLines: number;
  maxHeight: number | null;
  overflowSuffix: string;
  precision: number;
  textColor: RGBA;
  paddingLeft: number;
  paddingRight: number;
  shadow: boolean;
  shadowColor: RGBA;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
  highlight: boolean;
  highlightHeight: number;
  highlightColor: RGBA;
  highlightOffset: number;
  highlightPaddingLeft: number;
  highlightPaddingRight: number;
  letterSpacing: number;
  textIndent: number;
  cutSx: number;
  cutSy: number;
  cutEx: number;
  cutEy: number;
  advancedRenderer: boolean;

  // Normally stage options
  textRenderIssueMargin: number;
}
