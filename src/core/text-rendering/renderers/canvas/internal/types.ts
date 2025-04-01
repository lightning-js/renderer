import type { WebTrFontFace } from '../../../font-face-types/WebTrFontFace.js';
import { type RGBA } from '../../../../lib/utils.js';

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
  wordBreak: boolean;
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
