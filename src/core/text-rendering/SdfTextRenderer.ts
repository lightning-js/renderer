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
  TextRenderInfo,
  TextRenderProps,
} from './TextRenderer.js';
import type { CoreTextNodeProps } from '../CoreTextNode.js';
import { isZeroWidthSpace } from './Utils.js';
import * as SdfFontHandler from './SdfFontHandler.js';
import type { CoreRenderer } from '../renderers/CoreRenderer.js';
import { WebGlRenderer } from '../renderers/webgl/WebGlRenderer.js';
import { WebGlRenderOp } from '../renderers/webgl/WebGlRenderOp.js';
import { Sdf, type SdfShaderProps } from '../shaders/webgl/SdfShader.js';
import { BufferCollection } from '../renderers/webgl/internal/BufferCollection.js';
import type { WebGlCtxTexture } from '../renderers/webgl/WebGlCtxTexture.js';
import type { WebGlShaderNode } from '../renderers/webgl/WebGlShaderNode.js';
import { mergeColorAlpha } from '../../utils.js';
import type { TextLayout, GlyphLayout } from './TextRenderer.js';
import { wrapText, measureText } from './sdf/index.js';

// Each glyph requires 6 vertices (2 triangles) with 4 floats each (x, y, u, v)
const FLOATS_PER_VERTEX = 4;
const VERTICES_PER_GLYPH = 6;

// Type definition to match interface
const type = 'sdf';

let sdfShader: WebGlShaderNode | null = null;

// Initialize the SDF text renderer
const init = (stage: Stage): void => {
  SdfFontHandler.init();

  // Register SDF shader with the shader manager
  stage.shManager.registerShaderType('Sdf', Sdf);
  sdfShader = stage.shManager.createShader('Sdf') as WebGlShaderNode;
};

const font: FontHandler = SdfFontHandler;

/**
 * SDF text renderer using MSDF/SDF fonts with WebGL
 *
 * @param stage - Stage instance for font resolution
 * @param props - Text rendering properties
 * @returns Object containing ImageData and dimensions
 */
const renderText = (stage: Stage, props: CoreTextNodeProps): TextRenderInfo => {
  // Early return if no text
  if (props.text.length === 0) {
    return {
      width: 0,
      height: 0,
    };
  }

  // Get font cache for this font family
  const fontData = SdfFontHandler.getFontData(props.fontFamily);
  if (fontData === null) {
    // Font not loaded, return empty result
    return {
      width: 0,
      height: 0,
    };
  }

  // Calculate text layout and generate glyph data for caching
  const layout = generateTextLayout(props, fontData);

  // For SDF renderer, ImageData is null since we render via WebGL
  return {
    width: layout.width,
    height: layout.height,
    layout, // Cache layout for addQuads
  };
};

/**
 * Add quads for rendering using cached layout data
 */
const addQuads = (layout?: TextLayout): Float32Array | null => {
  if (layout === undefined) {
    return null; // No layout data available
  }

  const glyphs = layout.glyphs;
  const glyphsLength = glyphs.length;

  if (glyphsLength === 0) {
    return null;
  }

  const vertexBuffer = new Float32Array(
    glyphsLength * VERTICES_PER_GLYPH * FLOATS_PER_VERTEX,
  );

  let bufferIndex = 0;
  let glyphIndex = 0;

  while (glyphIndex < glyphsLength) {
    const glyph = glyphs[glyphIndex];
    glyphIndex++;
    if (glyph === undefined) {
      continue;
    }

    const x1 = glyph.x;
    const y1 = glyph.y;
    const x2 = x1 + glyph.width;
    const y2 = y1 + glyph.height;

    const u1 = glyph.atlasX;
    const v1 = glyph.atlasY;
    const u2 = u1 + glyph.atlasWidth;
    const v2 = v1 + glyph.atlasHeight;

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
  }

  return vertexBuffer;
};

/**
 * Create and submit WebGL render operations for SDF text
 * This is called from CoreTextNode during rendering to add SDF text to the render pipeline
 */
const renderQuads = (
  renderer: CoreRenderer,
  layout: TextLayout,
  vertexBuffer: Float32Array,
  renderProps: TextRenderProps,
): void => {
  const fontFamily = renderProps.fontFamily;
  const fontSize = renderProps.fontSize;
  const color = renderProps.color;
  const offsetY = renderProps.offsetY;
  const worldAlpha = renderProps.worldAlpha;
  const globalTransform = renderProps.globalTransform;

  const atlasTexture = SdfFontHandler.getAtlas(fontFamily);
  if (atlasTexture === null) {
    console.warn(`SDF atlas texture not found for font: ${fontFamily}`);
    return;
  }

  const fontData = SdfFontHandler.getFontData(fontFamily);
  if (fontData === null) {
    console.warn(`SDF font data not found for font: ${fontFamily}`);
    return;
  }

  // We can safely assume this is a WebGL renderer else this wouldn't be called
  const glw = (renderer as WebGlRenderer).glw;
  const stride = 4 * Float32Array.BYTES_PER_ELEMENT;
  const webGlBuffer = glw.createBuffer();

  if (!webGlBuffer) {
    console.warn('Failed to create WebGL buffer for SDF text');
    return;
  }

  const webGlBuffers = new BufferCollection([
    {
      buffer: webGlBuffer,
      attributes: {
        a_position: {
          name: 'a_position',
          size: 2,
          type: glw.FLOAT as number,
          normalized: false,
          stride,
          offset: 0,
        },
        a_textureCoords: {
          name: 'a_textureCoords',
          size: 2,
          type: glw.FLOAT as number,
          normalized: false,
          stride,
          offset: 2 * Float32Array.BYTES_PER_ELEMENT,
        },
      },
    },
  ]);

  const buffer = webGlBuffers.getBuffer('a_position');
  if (buffer !== undefined) {
    glw.arrayBufferData(buffer, vertexBuffer, glw.STATIC_DRAW as number);
  }
  const renderOp = new WebGlRenderOp(
    renderer as WebGlRenderer,
    {
      sdfShaderProps: {
        transform: globalTransform,
        color: mergeColorAlpha(color || 0xffffffff, worldAlpha),
        size: fontSize / (fontData.info?.size || fontData.common.lineHeight), // Use proper font scaling in shader
        scrollY: offsetY || 0,
        distanceRange: layout.distanceRange,
        debug: false, // Disable debug mode
      } satisfies SdfShaderProps,
      sdfBuffers: webGlBuffers,
      shader: sdfShader,
      alpha: worldAlpha,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      clippingRect: renderProps.clippingRect as any,
      height: layout.height,
      width: layout.width,
      rtt: false,
      parentHasRenderTexture: renderProps.parentHasRenderTexture,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      framebufferDimensions: renderProps.framebufferDimensions as any,
    },
    0,
  );

  // Add atlas texture and set quad count
  renderOp.addTexture(atlasTexture.ctxTexture as WebGlCtxTexture);
  renderOp.numQuads = layout.glyphs.length;

  (renderer as WebGlRenderer).addRenderOp(renderOp);
};

/**
 * Generate complete text layout with glyph positioning for caching
 */
const generateTextLayout = (
  props: CoreTextNodeProps,
  fontData: SdfFontHandler.SdfFontData,
): TextLayout => {
  const commonFontData = fontData.common;
  const text = props.text;
  const fontSize = props.fontSize;
  const letterSpacing = props.letterSpacing;
  const fontFamily = props.fontFamily;
  const textAlign = props.textAlign;
  const maxWidth = props.maxWidth;
  const maxHeight = props.maxHeight;
  const maxLines = props.maxLines;
  const overflowSuffix = props.overflowSuffix;

  // Use the font's design size for proper scaling
  const designLineHeight = commonFontData.lineHeight;

  const designFontSize = fontData.info.size;

  const lineHeight =
    props.lineHeight || (designLineHeight * fontSize) / designFontSize;
  const atlasWidth = commonFontData.scaleW;
  const atlasHeight = commonFontData.scaleH;

  // Calculate the pixel scale from design units to pixels
  const finalScale = fontSize / designFontSize;

  // Calculate design letter spacing
  const designLetterSpacing = (letterSpacing * designFontSize) / fontSize;

  // Determine text wrapping behavior based on contain mode
  const shouldWrapText = maxWidth > 0;
  const heightConstraint = maxHeight > 0;

  // Calculate maximum lines constraint from height if needed
  let effectiveMaxLines = maxLines;
  if (heightConstraint === true) {
    const maxLinesFromHeight = Math.floor(
      maxHeight / (lineHeight * finalScale),
    );
    if (effectiveMaxLines === 0 || maxLinesFromHeight < effectiveMaxLines) {
      effectiveMaxLines = maxLinesFromHeight;
    }
  }

  // Split text into lines based on wrapping constraints
  const lines = shouldWrapText
    ? wrapText(
        text,
        fontFamily,
        fontData,
        fontSize,
        finalScale,
        maxWidth,
        letterSpacing,
        overflowSuffix,
        effectiveMaxLines,
      )
    : text.split('\n');

  // Apply maxLines constraint if wrapping wasn't done
  const finalLines =
    effectiveMaxLines > 0 && lines.length > effectiveMaxLines
      ? lines.slice(0, effectiveMaxLines)
      : lines;

  const glyphs: GlyphLayout[] = [];
  let maxWidthFound = 0;
  let currentY = 0;

  // First pass: Calculate line widths for text alignment
  const lineWidths: number[] = [];
  for (let i = 0; i < finalLines.length; i++) {
    const line = finalLines[i];
    if (!line) {
      lineWidths.push(0);
      continue;
    }

    const lineWidth = measureText(
      line,
      fontFamily,
      fontData,
      designLetterSpacing,
    );
    lineWidths.push(lineWidth);
    if (lineWidth > maxWidthFound) {
      maxWidthFound = lineWidth;
    }
  }

  // Second pass: Generate glyph layouts with proper alignment
  let lineIndex = 0;
  const linesLength = finalLines.length;

  while (lineIndex < linesLength) {
    const line = finalLines[lineIndex];
    const lineWidth = lineWidths[lineIndex] || 0;
    lineIndex++;
    if (line === undefined) {
      currentY += designLineHeight;
      continue;
    }

    // Calculate line X offset based on text alignment
    let lineXOffset = 0;
    if (textAlign === 'center') {
      const availableWidth = shouldWrapText
        ? maxWidth / finalScale
        : maxWidthFound;
      lineXOffset = (availableWidth - lineWidth) / 2;
    } else if (textAlign === 'right') {
      const availableWidth = shouldWrapText
        ? maxWidth / finalScale
        : maxWidthFound;
      lineXOffset = availableWidth - lineWidth;
    }

    let currentX = lineXOffset;
    let charIndex = 0;
    const lineLength = line.length;
    let prevCodepoint = 0;

    while (charIndex < lineLength) {
      const char = line.charAt(charIndex);
      const codepoint = char.codePointAt(0);
      charIndex++;

      if (codepoint === undefined) {
        continue;
      }

      // Skip zero-width spaces for rendering but keep them in the text flow
      if (isZeroWidthSpace(char)) {
        continue;
      }

      // Get glyph data from font handler
      const glyph = SdfFontHandler.getGlyph(fontFamily, codepoint);
      if (glyph === null) {
        continue;
      }

      // Calculate advance with kerning (in design units)
      let advance = glyph.xadvance;

      // Add kerning if there's a previous character
      if (prevCodepoint !== 0) {
        const kerning = SdfFontHandler.getKerning(
          fontFamily,
          prevCodepoint,
          codepoint,
        );
        advance += kerning;
      }

      // Calculate glyph position and atlas coordinates (in design units)
      const glyphLayout: GlyphLayout = {
        codepoint,
        glyphId: glyph.id,
        x: currentX + glyph.xoffset,
        y: currentY + glyph.yoffset,
        width: glyph.width,
        height: glyph.height,
        xOffset: glyph.xoffset,
        yOffset: glyph.yoffset,
        atlasX: glyph.x / atlasWidth,
        atlasY: glyph.y / atlasHeight,
        atlasWidth: glyph.width / atlasWidth,
        atlasHeight: glyph.height / atlasHeight,
      };

      glyphs.push(glyphLayout);

      // Advance position with letter spacing (in design units)
      currentX += advance + designLetterSpacing;
      prevCodepoint = codepoint;
    }

    currentY += designLineHeight;
  }

  // Convert final dimensions to pixel space for the layout
  return {
    glyphs,
    distanceRange: finalScale * fontData.distanceField.distanceRange,
    width: Math.ceil(maxWidthFound * finalScale),
    height: Math.ceil(designLineHeight * finalLines.length * finalScale),
    fontScale: finalScale,
    lineHeight,
    fontFamily,
  };
};

/**
 * SDF Text Renderer - implements TextRenderer interface
 */
const SdfTextRenderer = {
  type,
  font,
  renderText,
  addQuads,
  renderQuads,
  init,
};

export default SdfTextRenderer;
