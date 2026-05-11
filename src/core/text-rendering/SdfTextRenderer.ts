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
import { Sdf } from '../shaders/webgl/SdfShader.js';
import type { WebGlShaderNode } from '../renderers/webgl/WebGlShaderNode.js';
import type { TextLayout } from './TextRenderer.js';
import { mapTextLayout } from './TextLayoutEngine.js';
import type { WebGlCtxTexture } from '../renderers/webgl/WebGlCtxTexture.js';

// Each glyph requires 6 vertices (2 triangles) with 4 floats each (x, y, u, v)
const FLOATS_PER_VERTEX = 4;
const VERTICES_PER_GLYPH = 6;

// Type definition to match interface
const type = 'sdf' as const;

let sdfShader: WebGlShaderNode | null = null;
let renderer: WebGlRenderer | null = null;

// Initialize the SDF text renderer
const init = (stage: Stage): void => {
  SdfFontHandler.init();

  // Register SDF shader with the shader manager
  stage.shManager.registerShaderType('Sdf', Sdf);
  sdfShader = stage.shManager.createShader('Sdf') as WebGlShaderNode;
  renderer = stage.renderer as WebGlRenderer;
};

const font: FontHandler = SdfFontHandler;
const renderInfoCache = new Map<string, SdfRenderInfo>();

/**
 * SDF text renderer using MSDF/SDF fonts with WebGL
 *
 * @param stage - Stage instance for font resolution
 * @param props - Text rendering properties
 * @returns Object containing ImageData and dimensions
 */
const renderText = (props: CoreTextNodeProps): TextRenderInfo | null => {
  // Early return if no text
  if (props.text.length === 0) {
    return null;
  }

  const cacheKey = getLayoutCacheKey(props);

  let renderInfo = renderInfoCache.get(cacheKey);
  if (renderInfo !== undefined) {
    return renderInfo;
  }

  // Get font cache for this font family
  const fontData = SdfFontHandler.getFontData(props.fontFamily);
  if (fontData === undefined) {
    // Font not loaded, return empty result
    return null;
  }

  // Calculate text layout and generate glyph data for caching
  const layout = generateTextLayout(props, fontData);
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
 * Create and submit WebGL render operations for SDF text
 * This is called from CoreTextNode during rendering to add SDF text to the render pipeline
 */
const renderQuads = (textNode: CoreTextNode): void => {
  textNode.props.shader = sdfShader;
  renderer!.addRenderOp(textNode);
};

/**
 * Generate complete text layout with glyph positioning for caching
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

  // Calculate the pixel scale from design units to pixels
  const fontScale = fontSize / designFontSize;
  const letterSpacing = props.letterSpacing / fontScale;

  const maxWidth = props.maxWidth / fontScale;
  const maxHeight = props.maxHeight;
  const [
    lines,
    remainingLines,
    hasRemainingText,
    bareLineHeight,
    lineHeightPx,
    effectiveWidth,
    effectiveHeight,
  ] = mapTextLayout(
    SdfFontHandler.measureText,
    metrics,
    props.text,
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

  const lineAmount = lines.length;
  let bufferIndex = 0;
  let glyphCount = 0;
  // Count total glyphs (excluding spaces) for buffer allocation
  for (let i = 0; i < lineAmount; i++) {
    const textLine = (lines[i] as TextLineStruct)[0];
    for (const char of textLine) {
      if (hasZeroWidthSpace(char) === true) {
        continue;
      }
      const codepoint = char.codePointAt(0);
      if (codepoint === undefined) {
        continue;
      }
      glyphCount++;
    }
  }

  const vertexBuffer = new Float32Array(
    glyphCount * VERTICES_PER_GLYPH * FLOATS_PER_VERTEX,
  );

  let currentX = 0;
  let currentY = 0;
  for (let i = 0; i < lineAmount; i++) {
    const line = lines[i] as TextLineStruct;
    const textLine = line[0];
    let prevGlyphId = 0;
    currentX = line[3];
    //convert Y coord to vertex value
    currentY = line[4] / fontScale;

    for (const char of textLine) {
      if (hasZeroWidthSpace(char) === true) {
        continue;
      }
      const codepoint = char.codePointAt(0);
      if (codepoint === undefined) {
        continue;
      }
      // Get glyph data from font handler
      const glyph = SdfFontHandler.getGlyph(fontFamily, codepoint);
      if (glyph === null) {
        continue;
      }
      // Kerning offsets the current glyph relative to the previous glyph.
      let kerning = 0;

      // Add kerning if there's a previous character
      if (prevGlyphId !== 0) {
        kerning = SdfFontHandler.getKerning(fontFamily, prevGlyphId, glyph.id);
      }

      // Apply pair kerning before placing this glyph.
      currentX += kerning;

      const x1 = currentX + glyph.xoffset;
      const y1 = currentY + glyph.yoffset;
      const x2 = x1 + glyph.width;
      const y2 = y1 + glyph.height;
      const u1 = glyph.x / atlasWidth;
      const v1 = glyph.y / atlasHeight;
      const u2 = u1 + glyph.width / atlasWidth;
      const v2 = v1 + glyph.height / atlasHeight;

      // Triangle 1: Top-left, top-right, bottom-left
      // Vertex 1: Top-left
      vertexBuffer[bufferIndex++] = x1;
      vertexBuffer[bufferIndex++] = y1;
      vertexBuffer[bufferIndex++] = u1;
      vertexBuffer[bufferIndex++] = v1;

      // Vertex 2: Top-right
      vertexBuffer[bufferIndex++] = x2;
      vertexBuffer[bufferIndex++] = y1;
      vertexBuffer[bufferIndex++] = u2;
      vertexBuffer[bufferIndex++] = v1;

      // Vertex 3: Bottom-left
      vertexBuffer[bufferIndex++] = x1;
      vertexBuffer[bufferIndex++] = y2;
      vertexBuffer[bufferIndex++] = u1;
      vertexBuffer[bufferIndex++] = v2;

      // Triangle 2: Top-right, bottom-right, bottom-left
      // Vertex 4: Top-right (duplicate)
      vertexBuffer[bufferIndex++] = x2;
      vertexBuffer[bufferIndex++] = y1;
      vertexBuffer[bufferIndex++] = u2;
      vertexBuffer[bufferIndex++] = v1;

      // Vertex 5: Bottom-right
      vertexBuffer[bufferIndex++] = x2;
      vertexBuffer[bufferIndex++] = y2;
      vertexBuffer[bufferIndex++] = u2;
      vertexBuffer[bufferIndex++] = v2;

      // Vertex 6: Bottom-left (duplicate)
      vertexBuffer[bufferIndex++] = x1;
      vertexBuffer[bufferIndex++] = y2;
      vertexBuffer[bufferIndex++] = u1;
      vertexBuffer[bufferIndex++] = v2;

      // Advance position with letter spacing (in design units)
      currentX += glyph.xadvance + letterSpacing;
      prevGlyphId = glyph.id;
    }
    currentY += lineHeightPx;
  }

  // Convert final dimensions to pixel space for the layout
  return {
    vertexBuffer,
    glyphCount,
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
