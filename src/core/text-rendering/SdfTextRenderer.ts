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

import type { Stage } from '../Stage.js';
import type {
  FontHandler,
  SdfRenderInfo,
  TextLineStruct,
  TextRenderInfo,
} from './TextRenderer.js';
import type { CoreTextNode, CoreTextNodeProps } from '../CoreTextNode.js';
import { getLayoutCacheKey, hasZeroWidthSpace } from './Utils.js';
import * as SdfFontHandler from './SdfFontHandler.js';
import { WebGlRenderer } from '../renderers/webgl/WebGlRenderer.js';
import { Sdf, SdfPlain } from '../shaders/webgl/SdfShader.js';
import type { WebGlShaderNode } from '../renderers/webgl/WebGlShaderNode.js';
import type { TextLayout } from './TextRenderer.js';
import { mapTextLayout } from './TextLayoutEngine.js';
import type { WebGlCtxTexture } from '../renderers/webgl/WebGlCtxTexture.js';
import { parseRichText, ParseResult } from './RichTextParser.js';

// Plain (non-richText) layout: x, y, u, v — matches v3.0.6 format
const FLOATS_PER_VERTEX_PLAIN = 4;
// Rich-text layout: x, y, u, v, packed_color, style
const FLOATS_PER_VERTEX_RICH = 6;
const VERTICES_PER_GLYPH = 6;
const FLOATS_PER_QUAD_PLAIN = VERTICES_PER_GLYPH * FLOATS_PER_VERTEX_PLAIN; // 24
const FLOATS_PER_QUAD_RICH = VERTICES_PER_GLYPH * FLOATS_PER_VERTEX_RICH; // 36

// Horizontal shear factor for fake italic: tan(14°).
// Applied to glyph and decoration vertices in design-unit space.
const ITALIC_SHEAR = Math.tan((14 * Math.PI) / 180);

// White (0xFFFFFFFF as 0xRRGGBBAA) packed little-endian: all UNSIGNED_BYTE channels = 255 → 1.0
// When v_color = vec4(1,1,1,1) the span color has no effect; u_color passes through unchanged.
const _PACKED_WHITE = 0xffffffff;

// Module-level ParseResult singleton — safe because generateTextLayout is synchronous.
const _richTextResult = new ParseResult();

// Type definition to match interface
const type = 'sdf' as const;

let sdfShader: WebGlShaderNode | null = null;
let sdfPlainShader: WebGlShaderNode | null = null;
let renderer: WebGlRenderer | null = null;

// Initialize the SDF text renderer
const init = (stage: Stage): void => {
  SdfFontHandler.init();

  // Register both SDF shader variants with the shader manager
  stage.shManager.registerShaderType('Sdf', Sdf);
  stage.shManager.registerShaderType('SdfPlain', SdfPlain);
  sdfShader = stage.shManager.createShader('Sdf') as WebGlShaderNode;
  sdfPlainShader = stage.shManager.createShader('SdfPlain') as WebGlShaderNode;
  renderer = stage.renderer as WebGlRenderer;
};

const font: FontHandler = SdfFontHandler;
const renderInfoCache = new Map<string, SdfRenderInfo>();

/**
 * Convert a 0xRRGGBBAA color to a little-endian uint32 suitable for an
 * UNSIGNED_BYTE normalized vec4 attribute.
 *
 * Memory layout (little-endian): byte 0 = R, byte 1 = G, byte 2 = B, byte 3 = A.
 * WebGL reads a_color[0..3] as (R/255, G/255, B/255, A/255).
 */
const _packColor = (rgba: number): number => {
  const r = (rgba >>> 24) & 0xff;
  const g = (rgba >>> 16) & 0xff;
  const b = (rgba >>> 8) & 0xff;
  const a = rgba & 0xff;
  return (r | (g << 8) | (b << 16) | (a << 24)) >>> 0;
};

/**
 * SDF text renderer using MSDF/SDF fonts with WebGL
 *
 * @param props - Text rendering properties
 * @returns TextRenderInfo (cached after first call per unique layout key)
 */
const renderText = (props: CoreTextNodeProps): TextRenderInfo => {
  const cacheKey = getLayoutCacheKey(props);

  let renderInfo = renderInfoCache.get(cacheKey);
  if (renderInfo !== undefined) {
    return renderInfo;
  }

  // Calculate text layout and generate glyph data for caching
  const layout = generateTextLayout(
    props,
    SdfFontHandler.getFontData(props.fontFamily)!,
  );
  renderInfo = {
    type,
    layout,
    width: layout.width,
    height: layout.height,
    remainingLines: layout.remainingLines,
    hasRemainingText: layout.hasRemainingText,
    atlasTexture: SdfFontHandler.getAtlas(props.fontFamily)!
      .ctxTexture as WebGlCtxTexture,
  } as SdfRenderInfo;
  renderInfoCache.set(cacheKey, renderInfo);

  // For SDF renderer, ImageData is null since we render via WebGL
  return renderInfo;
};

/**
 * Create and submit WebGL render operations for SDF text.
 * Called from CoreTextNode during rendering.
 */
const renderQuads = (textNode: CoreTextNode): void => {
  // Select the correct shader variant based on richText mode.
  // sdfPlainShader uses a 4-float-per-vertex VBO (no a_color / a_style attributes).
  // sdfShader uses a 6-float-per-vertex VBO with per-span color and style.
  textNode.props.shader =
    textNode.textProps.richText === true ? sdfShader : sdfPlainShader;
  renderer!.addRenderOp(textNode);
};

/**
 * Write 6 vertices for a solid-fill decoration rect (underline or strikethrough).
 *
 * Uses u = -1.0 as a UV sentinel so the fragment shader branches to solid fill
 * instead of the SDF glyph path (v_texcoord.x < 0.0).
 *
 * `shear1` / `shear2` are the x-deltas to add at y1 / y2 respectively for
 * italic lean; pass 0 for both when the span is not italic.
 *
 * All positions are in design-unit space (shader scales by u_size = fontScale).
 */
const _writeDecoQuad = (
  vb: Float32Array,
  u32: Uint32Array,
  di: number,
  x1: number,
  x2: number,
  y1: number,
  y2: number,
  color: number,
  shear1: number,
  shear2: number,
): number => {
  // Triangle 1: TL, TR, BL
  vb[di] = x1 + shear1;
  vb[di + 1] = y1;
  vb[di + 2] = -1.0;
  vb[di + 3] = 0.0;
  u32[di + 4] = color;
  vb[di + 5] = 0.0;
  di += 6;
  vb[di] = x2 + shear1;
  vb[di + 1] = y1;
  vb[di + 2] = -1.0;
  vb[di + 3] = 0.0;
  u32[di + 4] = color;
  vb[di + 5] = 0.0;
  di += 6;
  vb[di] = x1 + shear2;
  vb[di + 1] = y2;
  vb[di + 2] = -1.0;
  vb[di + 3] = 0.0;
  u32[di + 4] = color;
  vb[di + 5] = 0.0;
  di += 6;
  // Triangle 2: TR, BR, BL
  vb[di] = x2 + shear1;
  vb[di + 1] = y1;
  vb[di + 2] = -1.0;
  vb[di + 3] = 0.0;
  u32[di + 4] = color;
  vb[di + 5] = 0.0;
  di += 6;
  vb[di] = x2 + shear2;
  vb[di + 1] = y2;
  vb[di + 2] = -1.0;
  vb[di + 3] = 0.0;
  u32[di + 4] = color;
  vb[di + 5] = 0.0;
  di += 6;
  vb[di] = x1 + shear2;
  vb[di + 1] = y2;
  vb[di + 2] = -1.0;
  vb[di + 3] = 0.0;
  u32[di + 4] = color;
  vb[di + 5] = 0.0;
  di += 6;
  return di;
};

/**
 * Generate complete text layout with glyph positioning for caching.
 *
 * Two-pass approach:
 *   Pass 1 — count exact glyphs (calling getGlyph to avoid degenerate quads) and
 *             decoration quads needed by richText spans.
 *   Pass 2 — write all glyph vertices then all decoration vertices into a single
 *             pre-allocated Float32Array / Uint32Array view pair.
 */
const generateTextLayout = (
  props: CoreTextNodeProps,
  fontCache: SdfFontHandler.SdfFont,
): TextLayout => {
  const fontSize = props.fontSize;
  const fontFamily = props.fontFamily;
  const lineHeight = props.lineHeight;
  const metrics = SdfFontHandler.getFontMetrics(fontFamily, fontSize);

  const fontData = fontCache.data;
  const commonFontData = fontData.common;
  const designFontSize = fontData.info.size;

  const atlasWidth = commonFontData.scaleW;
  const atlasHeight = commonFontData.scaleH;

  // Pixel scale from design units to rendered pixels.
  const fontScale = fontSize / designFontSize;
  const letterSpacing = props.letterSpacing / fontScale;
  const maxWidth = props.maxWidth / fontScale;
  const maxHeight = props.maxHeight;

  // --- Rich text: parse BB-code and use stripped text for layout ---
  const richText = props.richText === true;
  let layoutText = props.text;
  if (richText === true) {
    parseRichText(props.text, _richTextResult);
    layoutText = _richTextResult.stripped;
  }

  const [
    lines,
    remainingLines,
    hasRemainingText,
    _bareLineHeight,
    lineHeightPx,
    effectiveWidth,
    effectiveHeight,
  ] = mapTextLayout(
    SdfFontHandler.measureText,
    metrics,
    layoutText,
    props.textAlign,
    fontFamily,
    lineHeight,
    props.overflowSuffix,
    props.wordBreak,
    letterSpacing,
    props.maxLines,
    maxWidth,
    maxHeight,
  );

  // --- Pre-compute decoration offsets in design-unit space ---
  // commonFontData.base is the BMFont "base" value: the y-distance from the top of the
  // character cell to the alphabetic baseline, expressed in design units.  Using it
  // directly is more accurate than deriving the baseline from metrics.ascender, which
  // comes from a different metrics source and can be off by several design units.
  const base = commonFontData.base;
  const decoThickness = Math.max(1, Math.round(fontSize / 20)) / fontScale;
  // Underline: 10 % of fontSize below the alphabetic baseline.
  const decoUnderlineOffset =
    base + Math.max(1 / fontScale, Math.round(fontSize * 0.1) / fontScale);
  // Strikethrough: 75 % of base from the line top ≈ visual midpoint of lowercase letters.
  const decoStrikeOffset = Math.round(base * 0.75);

  const lineAmount = lines.length;

  if (richText === false) {
    // --- PLAIN PATH (richText=false): 4 floats/vertex, single counting pass ---
    // Pass 1: count glyphs (calling getGlyph to skip null entries, matching rich pass 1 behaviour)
    let glyphCount = 0;
    for (let i = 0; i < lineAmount; i++) {
      const textLine = (lines[i] as TextLineStruct)[0];
      for (const char of textLine) {
        if (hasZeroWidthSpace(char) === true) continue;
        const codepoint = char.codePointAt(0);
        if (codepoint === undefined) continue;
        if (SdfFontHandler.getGlyph(fontFamily, codepoint) === null) continue;
        glyphCount++;
      }
    }

    const vertexBuffer = new Float32Array(glyphCount * FLOATS_PER_QUAD_PLAIN);
    let bi = 0;
    let currentX = 0;
    let currentY = 0;

    for (let i = 0; i < lineAmount; i++) {
      const line = lines[i] as TextLineStruct;
      const textLine = line[0];
      let prevGlyphId = 0;
      currentX = line[3];
      currentY = line[4] / fontScale;

      for (const char of textLine) {
        if (hasZeroWidthSpace(char) === true) continue;
        const codepoint = char.codePointAt(0);
        if (codepoint === undefined) continue;
        const glyph = SdfFontHandler.getGlyph(fontFamily, codepoint);
        if (glyph === null) continue;

        if (prevGlyphId !== 0) {
          currentX += SdfFontHandler.getKerning(
            fontFamily,
            prevGlyphId,
            glyph.id,
          );
        }

        const x1 = currentX + glyph.xoffset;
        const y1 = currentY + glyph.yoffset;
        const x2 = x1 + glyph.width;
        const y2 = y1 + glyph.height;

        const u1 = glyph.x / atlasWidth;
        const v1 = glyph.y / atlasHeight;
        const u2 = u1 + glyph.width / atlasWidth;
        const v2 = v1 + glyph.height / atlasHeight;

        // Triangle 1: TL, TR, BL
        vertexBuffer[bi++] = x1;
        vertexBuffer[bi++] = y1;
        vertexBuffer[bi++] = u1;
        vertexBuffer[bi++] = v1;
        vertexBuffer[bi++] = x2;
        vertexBuffer[bi++] = y1;
        vertexBuffer[bi++] = u2;
        vertexBuffer[bi++] = v1;
        vertexBuffer[bi++] = x1;
        vertexBuffer[bi++] = y2;
        vertexBuffer[bi++] = u1;
        vertexBuffer[bi++] = v2;
        // Triangle 2: TR, BR, BL
        vertexBuffer[bi++] = x2;
        vertexBuffer[bi++] = y1;
        vertexBuffer[bi++] = u2;
        vertexBuffer[bi++] = v1;
        vertexBuffer[bi++] = x2;
        vertexBuffer[bi++] = y2;
        vertexBuffer[bi++] = u2;
        vertexBuffer[bi++] = v2;
        vertexBuffer[bi++] = x1;
        vertexBuffer[bi++] = y2;
        vertexBuffer[bi++] = u1;
        vertexBuffer[bi++] = v2;

        currentX += glyph.xadvance + letterSpacing;
        prevGlyphId = glyph.id;
      }
    }

    return {
      vertexBuffer,
      glyphCount,
      totalQuadCount: glyphCount,
      richText: false,
      distanceRange: fontScale * fontData.distanceField.distanceRange,
      width: effectiveWidth * fontScale,
      height: effectiveHeight,
      fontScale: fontScale,
      lineHeight: lineHeightPx,
      fontFamily,
      remainingLines,
      hasRemainingText,
    };
  }

  // --- RICH PATH (richText=true): 6 floats/vertex, two-pass ---
  let glyphCount = 0;
  let decoQuadCount = 0;
  let strippedPos = 0;
  let curSpanIdx = 0;

  for (let i = 0; i < lineAmount; i++) {
    const textLine = (lines[i] as TextLineStruct)[0];
    for (const char of textLine) {
      if (hasZeroWidthSpace(char) === true) {
        strippedPos++;
        continue;
      }
      const codepoint = char.codePointAt(0);
      if (codepoint === undefined) {
        strippedPos++;
        continue;
      }
      const glyph = SdfFontHandler.getGlyph(fontFamily, codepoint);
      if (glyph === null) {
        strippedPos++;
        continue;
      }
      glyphCount++;
      // Advance span cursor past any spans that ended before this position.
      // curSpanIdx is always < spanCount after the loop; non-null assertions are safe.
      while (
        curSpanIdx < _richTextResult.spanCount - 1 &&
        strippedPos >= _richTextResult.spans[curSpanIdx]!.end
      ) {
        curSpanIdx++;
      }
      const span = _richTextResult.spans[curSpanIdx]!;
      if (span.underline === true) decoQuadCount++;
      if (span.strikethrough === true) decoQuadCount++;
      strippedPos++;
    }
  }

  const totalQuadCount = glyphCount + decoQuadCount;

  // --- Single allocation for the entire vertex payload ---
  // Layout: [glyph quads (glyphCount × 36)] [deco quads (decoQuadCount × 36)]
  const vertexBuffer = new Float32Array(totalQuadCount * FLOATS_PER_QUAD_RICH);
  // Uint32Array view of the same ArrayBuffer for packed-color writes at slot 4 of each vertex.
  const u32Buffer = new Uint32Array(vertexBuffer.buffer);

  // Write cursors (float indices into vertexBuffer / u32Buffer).
  let gi = 0; // glyph region: 0 … glyphCount*36-1
  let di = glyphCount * FLOATS_PER_QUAD_RICH; // deco region: starts after all glyph quads

  // Reset rich-text tracking for pass 2.
  strippedPos = 0;
  curSpanIdx = 0;

  // --- PASS 2: write vertices ---
  let currentX = 0;
  let currentY = 0;

  for (let i = 0; i < lineAmount; i++) {
    const line = lines[i] as TextLineStruct;
    const textLine = line[0];
    let prevGlyphId = 0;
    currentX = line[3];
    // Convert pixel Y coordinate to design-unit space.
    currentY = line[4] / fontScale;
    // Alphabetic baseline in design-unit space for this line (used for italic shear).
    const baseline = currentY + base;

    for (const char of textLine) {
      if (hasZeroWidthSpace(char) === true) {
        strippedPos++;
        continue;
      }
      const codepoint = char.codePointAt(0);
      if (codepoint === undefined) {
        strippedPos++;
        continue;
      }
      const glyph = SdfFontHandler.getGlyph(fontFamily, codepoint);
      if (glyph === null) {
        strippedPos++;
        continue;
      }

      // --- Determine per-vertex color and style ---
      let packedColor = _PACKED_WHITE;
      let spanUnderline = false;
      let spanStrikethrough = false;
      let spanBold = false;
      let spanItalic = false;

      while (
        curSpanIdx < _richTextResult.spanCount - 1 &&
        strippedPos >= _richTextResult.spans[curSpanIdx]!.end
      ) {
        curSpanIdx++;
      }
      const span = _richTextResult.spans[curSpanIdx]!;
      packedColor = span.color !== 0 ? _packColor(span.color) : _PACKED_WHITE;
      spanUnderline = span.underline;
      spanStrikethrough = span.strikethrough;
      spanBold = span.bold;
      spanItalic = span.italic;

      // --- Kerning ---
      if (prevGlyphId !== 0) {
        currentX += SdfFontHandler.getKerning(
          fontFamily,
          prevGlyphId,
          glyph.id,
        );
      }

      // Glyph bounding box in design units.
      const x1 = currentX + glyph.xoffset;
      const y1 = currentY + glyph.yoffset;
      const x2 = x1 + glyph.width;
      const y2 = y1 + glyph.height;

      // Atlas UV coordinates.
      const u1 = glyph.x / atlasWidth;
      const v1 = glyph.y / atlasHeight;
      const u2 = u1 + glyph.width / atlasWidth;
      const v2 = v1 + glyph.height / atlasHeight;

      // Capture decoration X extents before advancing currentX.
      const decoX1 = currentX;
      const advance = glyph.xadvance + letterSpacing;

      // --- Italic horizontal shear: delta-x per vertex at y1 / y2 ---
      // shear = (baseline_y - vertex_y) * tan(14°)
      // Positive at y < baseline (above baseline → lean right at top).
      // Negative at y > baseline (below baseline → lean left at bottom).
      const shearTop = spanItalic ? (baseline - y1) * ITALIC_SHEAR : 0;
      const shearBot = spanItalic ? (baseline - y2) * ITALIC_SHEAR : 0;

      // Bold style flag passed to fragment shader for SDF threshold shift.
      const style = spanBold ? 1.0 : 0.0;

      // --- Write 6 glyph vertices (x, y, u, v, packed_color, style) ---
      // Triangle 1: TL, TR, BL
      vertexBuffer[gi] = x1 + shearTop;
      vertexBuffer[gi + 1] = y1;
      vertexBuffer[gi + 2] = u1;
      vertexBuffer[gi + 3] = v1;
      u32Buffer[gi + 4] = packedColor;
      vertexBuffer[gi + 5] = style;
      gi += 6;
      vertexBuffer[gi] = x2 + shearTop;
      vertexBuffer[gi + 1] = y1;
      vertexBuffer[gi + 2] = u2;
      vertexBuffer[gi + 3] = v1;
      u32Buffer[gi + 4] = packedColor;
      vertexBuffer[gi + 5] = style;
      gi += 6;
      vertexBuffer[gi] = x1 + shearBot;
      vertexBuffer[gi + 1] = y2;
      vertexBuffer[gi + 2] = u1;
      vertexBuffer[gi + 3] = v2;
      u32Buffer[gi + 4] = packedColor;
      vertexBuffer[gi + 5] = style;
      gi += 6;
      // Triangle 2: TR, BR, BL
      vertexBuffer[gi] = x2 + shearTop;
      vertexBuffer[gi + 1] = y1;
      vertexBuffer[gi + 2] = u2;
      vertexBuffer[gi + 3] = v1;
      u32Buffer[gi + 4] = packedColor;
      vertexBuffer[gi + 5] = style;
      gi += 6;
      vertexBuffer[gi] = x2 + shearBot;
      vertexBuffer[gi + 1] = y2;
      vertexBuffer[gi + 2] = u2;
      vertexBuffer[gi + 3] = v2;
      u32Buffer[gi + 4] = packedColor;
      vertexBuffer[gi + 5] = style;
      gi += 6;
      vertexBuffer[gi] = x1 + shearBot;
      vertexBuffer[gi + 1] = y2;
      vertexBuffer[gi + 2] = u1;
      vertexBuffer[gi + 3] = v2;
      u32Buffer[gi + 4] = packedColor;
      vertexBuffer[gi + 5] = style;
      gi += 6;

      // Advance the glyph cursor.
      currentX += advance;
      prevGlyphId = glyph.id;

      // --- Write decoration quads (richText only) ---
      if (spanUnderline === true) {
        const dy1 = currentY + decoUnderlineOffset;
        const dy2 = dy1 + decoThickness;
        const dShear1 = spanItalic ? (baseline - dy1) * ITALIC_SHEAR : 0;
        const dShear2 = spanItalic ? (baseline - dy2) * ITALIC_SHEAR : 0;
        di = _writeDecoQuad(
          vertexBuffer,
          u32Buffer,
          di,
          decoX1,
          decoX1 + advance,
          dy1,
          dy2,
          packedColor,
          dShear1,
          dShear2,
        );
      }
      if (spanStrikethrough === true) {
        const dy1 = currentY + decoStrikeOffset;
        const dy2 = dy1 + decoThickness;
        const dShear1 = spanItalic ? (baseline - dy1) * ITALIC_SHEAR : 0;
        const dShear2 = spanItalic ? (baseline - dy2) * ITALIC_SHEAR : 0;
        di = _writeDecoQuad(
          vertexBuffer,
          u32Buffer,
          di,
          decoX1,
          decoX1 + advance,
          dy1,
          dy2,
          packedColor,
          dShear1,
          dShear2,
        );
      }

      if (richText === true) strippedPos++;
    }
  }

  // Convert final dimensions to pixel space for the layout.
  return {
    vertexBuffer,
    glyphCount,
    totalQuadCount,
    richText: true,
    distanceRange: fontScale * fontData.distanceField.distanceRange,
    width: effectiveWidth * fontScale,
    height: effectiveHeight,
    fontScale: fontScale,
    lineHeight: lineHeightPx,
    fontFamily,
    remainingLines,
    hasRemainingText,
  };
};

const clearCache = (): void => {
  renderInfoCache.clear();
};

/**
 * SDF Text Renderer - implements TextRenderer interface
 */
const SdfTextRenderer = {
  type,
  font,
  renderText,
  renderQuads,
  init,
  clearCache,
};

export default SdfTextRenderer;
