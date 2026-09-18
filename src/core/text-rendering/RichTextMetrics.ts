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

import type { RichSpan } from './RichTextParser.js';

/**
 * Shared style metrics for rich text.
 *
 * @remarks
 * Advance width and drawn extent must agree, otherwise styled runs either
 * collide with the text that follows them or get clipped by a texture sized
 * from a too-small measurement. The renderers used to compute these
 * independently; keeping the formulas here means measurement and drawing
 * cannot drift apart.
 */

/**
 * Amount the SDF alpha threshold is shifted for bold, matching
 * `threshold = 0.5 - v_style * 0.05` in SdfShader's fragment source.
 *
 * Changing this constant without changing the shader (or vice versa) will
 * reintroduce the advance/extent mismatch it exists to prevent.
 */
export const SDF_BOLD_THRESHOLD_SHIFT = 0.05;

/**
 * Horizontal shear applied to fake italics in the SDF renderer: tan(14°).
 */
export const ITALIC_SHEAR = Math.tan((14 * Math.PI) / 180);

/**
 * Extra advance width, in design units, that a synthetically emboldened SDF
 * glyph needs.
 *
 * @remarks
 * The SDF encodes signed distance such that the full 0..1 range of the sampled
 * median spans `distanceRange` design units. Lowering the threshold by
 * `SDF_BOLD_THRESHOLD_SHIFT` therefore pushes the rendered edge outward by
 * `SDF_BOLD_THRESHOLD_SHIFT * distanceRange` on each side, so the glyph grows
 * by twice that in total. The glyph's own `xadvance` is unchanged by the
 * shader, so without this correction bold text advances as if it were regular
 * and overlaps its neighbour.
 */
export const sdfBoldExtra = (distanceRange: number): number =>
  2 * SDF_BOLD_THRESHOLD_SHIFT * distanceRange;

/**
 * Extra advance width needed after the last glyph of an italic run.
 *
 * @remarks
 * Shearing leans the top of the glyph to the right without changing its
 * advance, so the final glyph of an italic run overhangs whatever follows it.
 * The widest excursion is at the top of the glyph box, i.e. the greatest
 * distance above the baseline.
 *
 * @param baseline Alphabetic baseline in design-unit space.
 * @param topY Top edge of the glyph box in design-unit space.
 */
export const italicOverhang = (baseline: number, topY: number): number => {
  const rise = baseline - topY;
  return rise > 0 ? rise * ITALIC_SHEAR : 0;
};

/**
 * Build the CSS font shorthand for a rich text span.
 *
 * @remarks
 * Span bold/italic override the node level `fontStyle`. The result is used for
 * both drawing and measuring, which is the whole point: measuring with the
 * regular face while drawing with the bold one is what makes styled runs
 * collide with following text.
 */
export const canvasSpanFont = (
  span: RichSpan,
  fontStyle: string,
  fontSize: number,
  fontFamily: string,
): string => {
  const style = span.italic === true ? 'italic' : fontStyle;
  const weight = span.bold === true ? 'bold ' : '';
  return `${style} ${weight}${fontSize}px Unknown, ${fontFamily}`;
};

/**
 * Index of the span covering `pos`, searching forward from `fromIdx`.
 *
 * @remarks
 * Spans are sorted by start offset and callers walk positions in ascending
 * order, so this only ever scans forward and the whole traversal stays linear.
 * Clamps to the last span, matching the renderers' existing behaviour for
 * positions past the final span end.
 */
export const spanIndexAt = (
  spans: RichSpan[],
  spanCount: number,
  pos: number,
  fromIdx: number,
): number => {
  let idx = fromIdx;
  while (idx < spanCount - 1 && pos >= spans[idx]!.end) {
    idx++;
  }
  return idx;
};

// --- Decoration geometry -----------------------------------------------------
//
// Underline and strikethrough offsets are shared so the same markup lands in
// the same place on both backends. The baseline itself is still derived per
// backend (Canvas from normalized font metrics, SDF from the BMFont `base`
// value, which is more accurate for SDF atlases), since those are genuinely
// different and better sources; only the offsets from it are unified.
//
// All three return pixels. The SDF renderer works in design units and divides
// by its font scale.

/**
 * Stroke thickness for underline and strikethrough, in pixels.
 */
export const decorationThickness = (fontSize: number): number =>
  Math.max(1, Math.round(fontSize / 20));

/**
 * Gap between the alphabetic baseline and the top of the underline, in pixels.
 */
export const underlineGap = (fontSize: number): number =>
  Math.max(1, Math.round(fontSize * 0.08));

/**
 * Fraction of the top-to-baseline distance at which the strikethrough sits.
 *
 * @remarks
 * A true strikethrough is centred on the x-height, but neither backend has
 * x-height available, so it is approximated as a fraction of the distance from
 * the top of the line box down to the alphabetic baseline.
 */
export const STRIKE_BASELINE_RATIO = 0.6;

/**
 * Distance from the top of the line box to the strikethrough, in pixels.
 *
 * @param baselineDistance Distance from the top of the line box to the
 * alphabetic baseline.
 */
export const strikeOffset = (baselineDistance: number): number =>
  baselineDistance * STRIKE_BASELINE_RATIO;
