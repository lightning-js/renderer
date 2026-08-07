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
import type { CoreRenderer } from '../renderers/CoreRenderer.js';
import type {
  FontHandler,
  SdfRenderInfo,
  TextLineStruct,
  TextRenderInfo,
  TextLayout,
  TextRenderProps,
} from './TextRenderer.js';
import type { CoreTextNodeProps } from '../CoreTextNode.js';
import { getLayoutCacheKey, hasZeroWidthSpace } from './Utils.js';
import * as SdfFontHandler from './SdfFontHandler.js';
import { WebGlRenderer } from '../renderers/webgl/WebGlRenderer.js';
import { Sdf, SdfPlain } from '../shaders/webgl/SdfShader.js';
import type { WebGlShaderNode } from '../renderers/webgl/WebGlShaderNode.js';
import { mapTextLayout } from './TextLayoutEngine.js';
import type { WebGlCtxTexture } from '../renderers/webgl/WebGlCtxTexture.js';
import { parseRichText, ParseResult } from './RichTextParser.js';
import {
  SDF_PLAIN_GLYPH_STRIDE,
  SDF_RICH_GLYPH_STRIDE,
} from '../renderers/webgl/SdfBuffer.js';

// Design-unit glyph record strides consumed by WebGlRenderer.addSdfQuads.
// plain (8 floats): x, y, w, h, u, v, uw, vh
// rich  (12 floats): x, y, w, h, u, v, uw, vh, shearTop, shearBot, packed_span_color, style

// Horizontal shear factor for fake italic: tan(14°).
// Applied to glyph and decoration vertices in design-unit space.
const ITALIC_SHEAR = Math.tan((14 * Math.PI) / 180);

// White (0xFFFFFFFF as 0xRRGGBBAA) packed little-endian: all UNSIGNED_BYTE channels = 255 → 1.0
// When v_color = vec4(1,1,1,1) the span color has no effect; the node color passes through unchanged.
const _PACKED_WHITE = 0xffffffff;

// Module-level ParseResult singleton — safe because generateTextLayout is synchronous.
const _richTextResult = new ParseResult();

// Type definition to match interface
const type = 'sdf' as const;

let sdfShader: WebGlShaderNode | null = null;
let sdfPlainShader: WebGlShaderNode | null = null;

// Initialize the SDF text renderer
const init = (stage: Stage): void => {
  SdfFontHandler.init();

  // Register both SDF shader variants with the shader manager
  stage.shManager.registerShaderType('Sdf', Sdf);
  stage.shManager.registerShaderType('SdfPlain', SdfPlain);
  sdfShader = stage.shManager.createShader('Sdf') as WebGlShaderNode;
  sdfPlainShader = stage.shManager.createShader('SdfPlain') as WebGlShaderNode;
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
 * Submit SDF glyphs to the renderer's shared batched buffer.
 * Called from CoreTextNode during rendering.
 *
 * Three paths:
 * 1. **Exact cache hit** — layout, transform, color, and alpha haven't
 *    changed. The cached pre-transformed Float32Array is mem-copied directly
 *    into the shared SDF buffer (no per-glyph matrix math).
 * 2. **Translation hit** — only tx/ty changed (the scroll path). The cached
 *    vertices are copied with the position delta applied; the cache keeps its
 *    original base so nothing is re-snapshotted.
 * 3. **Cache miss** — re-computes per-glyph world-space vertices via
 *    `addSdfQuads`, then snapshots the result into the cache.
 */
const renderQuads = (
  renderer: CoreRenderer,
  layout: TextLayout,
  _vertexBuffer: Float32Array | null,
  renderProps: TextRenderProps,
): void => {
  const fontFamily = renderProps.fontFamily;

  const atlasTexture = SdfFontHandler.getAtlas(fontFamily);
  if (atlasTexture === null) {
    return;
  }

  const webGlRenderer = renderer as WebGlRenderer;
  const cache = renderProps.sdfCache;
  const ctxTexture = atlasTexture.ctxTexture as WebGlCtxTexture;
  // Select the shared buffer + shader variant for this layout. The two SDF
  // GPU layouts can never share a draw call (different strides), so each is
  // tracked in its own SdfBuffer with its own shader node.
  const isRich = layout.richText === true;
  const sdfBuffer = isRich
    ? webGlRenderer.sdfBufferRich
    : webGlRenderer.sdfBufferPlain;
  const shader = isRich ? sdfShader! : sdfPlainShader!;

  // --- Cache-hit fast paths -----------------------------------------------
  if (cache !== undefined && cache.vertices !== null) {
    const ct = cache.transform;
    const t = renderProps.globalTransform;
    if (
      cache.layoutRef === layout &&
      cache.color === renderProps.color &&
      cache.alpha === renderProps.worldAlpha &&
      ct[0] === t[0] &&
      ct[1] === t[1] &&
      ct[2] === t[3] &&
      ct[3] === t[4]
    ) {
      const dx = t[6]! - ct[4]!;
      const dy = t[7]! - ct[5]!;

      if (dx === 0 && dy === 0) {
        // Fully static: mem-copy the cached vertices as-is. The GPU copy is
        // only reusable when the bytes this node is about to write are
        // identical to what was last uploaded at these offsets. Two events
        // break that: a reorder that moves this node's quad range (offset
        // shift), or a prior translated write that placed non-identical bytes
        // at the current offset. Either forces a full buffer re-upload.
        const at = sdfBuffer.quadCount;
        if (at !== cache.lastStartQuad || cache.lastWriteDirty === true) {
          sdfBuffer.changed = true;
        }
        cache.lastStartQuad = at;
        cache.lastWriteDirty = false;
        webGlRenderer.addSdfCachedQuads(
          sdfBuffer,
          cache.vertices,
          cache.glyphCount,
          ctxTexture,
          renderProps.clippingRect,
          renderProps.worldAlpha,
          layout.width,
          layout.height,
          renderProps.parentHasRenderTexture,
          renderProps.framebufferDimensions,
          shader,
        );
        return;
      }

      // Pure translation (the scroll path): same glyphs, same scale/rotation,
      // only tx/ty moved. Copy the cached vertices shifted by the delta from
      // the cached base transform. The cache keeps its original base, so
      // every frame recomputes from the same reference — no drift and no
      // per-frame re-snapshot.
      cache.lastStartQuad = sdfBuffer.quadCount;
      cache.lastWriteDirty = true;
      webGlRenderer.addSdfTranslatedQuads(
        sdfBuffer,
        cache.vertices,
        cache.glyphCount,
        dx,
        dy,
        ctxTexture,
        renderProps.clippingRect,
        renderProps.worldAlpha,
        layout.width,
        layout.height,
        renderProps.parentHasRenderTexture,
        renderProps.framebufferDimensions,
        shader,
      );
      return;
    }
  }

  // --- Cache-miss slow path -----------------------------------------------
  const startIdx = sdfBuffer.idx;
  const startQuad = sdfBuffer.quadCount;
  webGlRenderer.addSdfQuads(
    sdfBuffer,
    layout.glyphs,
    layout.glyphCount,
    layout.fontScale,
    renderProps.globalTransform,
    renderProps.color,
    renderProps.worldAlpha,
    layout.distanceRange,
    ctxTexture,
    renderProps.clippingRect,
    layout.width,
    layout.height,
    renderProps.parentHasRenderTexture,
    renderProps.framebufferDimensions,
    shader,
  );

  // Snapshot the written vertex data into the cache for future frames
  if (cache !== undefined) {
    const endIdx = sdfBuffer.idx;
    const len = endIdx - startIdx;
    if (len > 0) {
      if (cache.vertices === null || cache.vertices.length !== len) {
        cache.vertices = new Float32Array(len);
      }
      cache.vertices.set(sdfBuffer.fBuffer.subarray(startIdx, endIdx));
      cache.glyphCount = layout.glyphCount;
      cache.color = renderProps.color;
      cache.alpha = renderProps.worldAlpha;
      cache.layoutRef = layout;
      // The snapshot lives at `startQuad` in the shared buffer; `addSdfQuads`
      // already forced a full re-upload, so the GPU is in sync with the fresh
      // bytes and the dirty marker is cleared.
      cache.lastStartQuad = startQuad;
      cache.lastWriteDirty = false;

      const t = renderProps.globalTransform;
      const ct = cache.transform;
      ct[0] = t[0]!;
      ct[1] = t[1]!;
      ct[2] = t[3]!;
      ct[3] = t[4]!;
      ct[4] = t[6]!;
      ct[5] = t[7]!;
    }
  }
};

/**
 * Write one 12-float decoration record (underline or strikethrough).
 *
 * Uses u = -1.0 as a UV sentinel so the fragment shader branches to solid fill
 * instead of the SDF glyph path (v_texcoord.x < 0.0). Decorations are never
 * bold (style = 0.0) but may carry an italic shear.
 *
 * `shear1` / `shear2` are the x-deltas to add at y1 / y2 respectively for
 * italic lean; pass 0 for both when the span is not italic.
 *
 * All positions are in design-unit space (the CPU transform scales by
 * fontScale and applies the node transform).
 */
const _writeDecoRecord = (
  glyphs: Float32Array,
  u32Glyphs: Uint32Array,
  di: number,
  x1: number,
  x2: number,
  y1: number,
  y2: number,
  color: number,
  shear1: number,
  shear2: number,
): number => {
  glyphs[di] = x1;
  glyphs[di + 1] = y1;
  glyphs[di + 2] = x2 - x1;
  glyphs[di + 3] = y2 - y1;
  glyphs[di + 4] = -1.0;
  glyphs[di + 5] = 0.0;
  glyphs[di + 6] = 0.0;
  glyphs[di + 7] = 0.0;
  glyphs[di + 8] = shear1;
  glyphs[di + 9] = shear2;
  u32Glyphs[di + 10] = color;
  glyphs[di + 11] = 0.0;
  return di + SDF_RICH_GLYPH_STRIDE;
};

/**
 * Generate complete text layout with glyph positioning for caching.
 *
 * Two-pass approach:
 *   Pass 1 — count exact glyphs (calling getGlyph to avoid degenerate quads) and
 *             decoration quads needed by richText spans.
 *   Pass 2 — write one design-unit record per glyph (8 or 12 floats) and, for
 *             richText, one record per decoration quad, into a single
 *             pre-allocated Float32Array / Uint32Array view pair.
 *
 * Glyph records are written first (in character order), then all decoration
 * records, preserving the legacy draw order so decorations always render on
 * top of glyphs.
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
    // --- PLAIN PATH (richText=false): 8 floats/record, single counting pass ---
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

    const glyphs = new Float32Array(glyphCount * SDF_PLAIN_GLYPH_STRIDE);
    let go = 0;
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

        const u1 = glyph.x / atlasWidth;
        const v1 = glyph.y / atlasHeight;

        // Design-unit glyph record (x, y, w, h, u, v, uw, vh)
        glyphs[go] = x1;
        glyphs[go + 1] = y1;
        glyphs[go + 2] = glyph.width;
        glyphs[go + 3] = glyph.height;
        glyphs[go + 4] = u1;
        glyphs[go + 5] = v1;
        glyphs[go + 6] = glyph.width / atlasWidth;
        glyphs[go + 7] = glyph.height / atlasHeight;
        go += SDF_PLAIN_GLYPH_STRIDE;

        currentX += glyph.xadvance + letterSpacing;
        prevGlyphId = glyph.id;
      }
    }

    return {
      glyphs,
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

  // --- RICH PATH (richText=true): 12 floats/record, two-pass ---
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

  // --- Single allocation for the entire record payload ---
  // Layout: [glyph records (glyphCount × 12)] [deco records (decoQuadCount × 12)]
  const glyphs = new Float32Array(totalQuadCount * SDF_RICH_GLYPH_STRIDE);
  // Uint32Array view of the same ArrayBuffer for packed-color writes at slot 10 of each record.
  const u32Glyphs = new Uint32Array(glyphs.buffer);

  // Write cursors (float indices into glyphs / u32Glyphs).
  let gi = 0; // glyph region: 0 … glyphCount*12-1
  let di = glyphCount * SDF_RICH_GLYPH_STRIDE; // deco region: starts after all glyph records

  // Reset rich-text tracking for pass 2.
  strippedPos = 0;
  curSpanIdx = 0;

  // --- PASS 2: write records ---
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

      // --- Determine per-record color and style ---
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
      const y2 = y1 + glyph.height;

      // Atlas UV coordinates.
      const u1 = glyph.x / atlasWidth;
      const v1 = glyph.y / atlasHeight;

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

      // --- Write 12-float glyph record (x, y, w, h, u, v, uw, vh, shearTop, shearBot, packedColor, style) ---
      glyphs[gi] = x1;
      glyphs[gi + 1] = y1;
      glyphs[gi + 2] = glyph.width;
      glyphs[gi + 3] = glyph.height;
      glyphs[gi + 4] = u1;
      glyphs[gi + 5] = v1;
      glyphs[gi + 6] = glyph.width / atlasWidth;
      glyphs[gi + 7] = glyph.height / atlasHeight;
      glyphs[gi + 8] = shearTop;
      glyphs[gi + 9] = shearBot;
      u32Glyphs[gi + 10] = packedColor;
      glyphs[gi + 11] = style;
      gi += SDF_RICH_GLYPH_STRIDE;

      // Advance the glyph cursor.
      currentX += advance;
      prevGlyphId = glyph.id;

      // --- Write decoration records (richText only) ---
      if (spanUnderline === true) {
        const dy1 = currentY + decoUnderlineOffset;
        const dy2 = dy1 + decoThickness;
        const dShear1 = spanItalic ? (baseline - dy1) * ITALIC_SHEAR : 0;
        const dShear2 = spanItalic ? (baseline - dy2) * ITALIC_SHEAR : 0;
        di = _writeDecoRecord(
          glyphs,
          u32Glyphs,
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
        di = _writeDecoRecord(
          glyphs,
          u32Glyphs,
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

      strippedPos++;
    }
  }

  // Convert final dimensions to pixel space for the layout.
  return {
    glyphs,
    glyphCount: totalQuadCount,
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
