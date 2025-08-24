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
import { wrapText, measureLines, parseBBCode } from './sdf/index.js';

// Each glyph requires 6 vertices (2 triangles) with 8 floats each (x, y, u, v, r, g, b, a)
const FLOATS_PER_VERTEX = 8;
const VERTICES_PER_GLYPH = 6;

// Type definition to match interface
const type = 'sdf' as const;

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
 * Helper function to add a quad for underline/strikethrough with proper color
 */
const addSegmentQuadToBuffer = (
  vertexBuffer: Float32Array,
  bufferIndex: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color?: number,
): number => {
  let r: number, g: number, b: number, a: number;

  if (color !== undefined) {
    // Use specific BBCode color for the segment
    r = ((color >> 16) & 0xff) / 255.0;
    g = ((color >> 8) & 0xff) / 255.0;
    b = (color & 0xff) / 255.0;
    a = 1.0;
  } else {
    // Use sentinel value (-1) to signal shader to use uniform color
    r = -1.0;
    g = -1.0;
    b = -1.0;
    a = -1.0;
  }

  return addQuadToBuffer(
    vertexBuffer,
    bufferIndex,
    x1,
    y1,
    x2,
    y2,
    0.0,
    0.0,
    0.0,
    0.0, // No texture coordinates for solid color quads
    r,
    g,
    b,
    a,
  );
};

const addQuadToBuffer = (
  vertexBuffer: Float32Array,
  bufferIndex: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  u1: number,
  v1: number,
  u2: number,
  v2: number,
  r: number,
  g: number,
  b: number,
  a: number,
): number => {
  let index = bufferIndex;

  // Triangle 1: Top-left, top-right, bottom-left
  // Vertex 1: Top-left
  vertexBuffer[index++] = x1;
  vertexBuffer[index++] = y1;
  vertexBuffer[index++] = u1;
  vertexBuffer[index++] = v1;
  vertexBuffer[index++] = r;
  vertexBuffer[index++] = g;
  vertexBuffer[index++] = b;
  vertexBuffer[index++] = a;

  // Vertex 2: Top-right
  vertexBuffer[index++] = x2;
  vertexBuffer[index++] = y1;
  vertexBuffer[index++] = u2;
  vertexBuffer[index++] = v1;
  vertexBuffer[index++] = r;
  vertexBuffer[index++] = g;
  vertexBuffer[index++] = b;
  vertexBuffer[index++] = a;

  // Vertex 3: Bottom-left
  vertexBuffer[index++] = x1;
  vertexBuffer[index++] = y2;
  vertexBuffer[index++] = u1;
  vertexBuffer[index++] = v2;
  vertexBuffer[index++] = r;
  vertexBuffer[index++] = g;
  vertexBuffer[index++] = b;
  vertexBuffer[index++] = a;

  // Triangle 2: Top-right, bottom-right, bottom-left
  // Vertex 4: Top-right (duplicate)
  vertexBuffer[index++] = x2;
  vertexBuffer[index++] = y1;
  vertexBuffer[index++] = u2;
  vertexBuffer[index++] = v1;
  vertexBuffer[index++] = r;
  vertexBuffer[index++] = g;
  vertexBuffer[index++] = b;
  vertexBuffer[index++] = a;

  // Vertex 5: Bottom-right
  vertexBuffer[index++] = x2;
  vertexBuffer[index++] = y2;
  vertexBuffer[index++] = u2;
  vertexBuffer[index++] = v2;
  vertexBuffer[index++] = r;
  vertexBuffer[index++] = g;
  vertexBuffer[index++] = b;
  vertexBuffer[index++] = a;

  // Vertex 6: Bottom-left (duplicate)
  vertexBuffer[index++] = x1;
  vertexBuffer[index++] = y2;
  vertexBuffer[index++] = u1;
  vertexBuffer[index++] = v2;
  vertexBuffer[index++] = r;
  vertexBuffer[index++] = g;
  vertexBuffer[index++] = b;
  vertexBuffer[index++] = a;

  return index;
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

  // Count underline and strikethrough segments for additional quads
  let decorationQuadCount = 0;

  // Count decoration segments by grouping consecutive decorated glyphs
  for (let i = 0; i < glyphsLength; i++) {
    const glyph = glyphs[i];
    const nextGlyph = glyphs[i + 1];

    // If this is the end of an underline segment, count it
    if (glyph?.underline === true && nextGlyph?.underline === false) {
      decorationQuadCount++;
    }

    // If this is the end of a strikethrough segment, count it
    if (glyph?.strikethrough === true && nextGlyph?.strikethrough === false) {
      decorationQuadCount++;
    }
  }

  const totalQuads = glyphsLength + decorationQuadCount;
  const vertexBuffer = new Float32Array(
    totalQuads * VERTICES_PER_GLYPH * FLOATS_PER_VERTEX,
  );

  let bufferIndex = 0;

  // Add glyph quads first
  for (let glyphIndex = 0; glyphIndex < glyphsLength; glyphIndex++) {
    const glyph = glyphs[glyphIndex];
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

    // Extract color from glyph formatting or use uniform color
    const glyphColor = glyph.color;
    let r: number, g: number, b: number, a: number;

    if (glyphColor !== undefined) {
      r = ((glyphColor >> 16) & 0xff) / 255.0;
      g = ((glyphColor >> 8) & 0xff) / 255.0;
      b = (glyphColor & 0xff) / 255.0;
      a = 1.0;
    } else {
      r = -1.0;
      g = -1.0;
      b = -1.0;
      a = -1.0;
    }

    bufferIndex = addQuadToBuffer(
      vertexBuffer,
      bufferIndex,
      x1,
      y1,
      x2,
      y2,
      u1,
      v1,
      u2,
      v2,
      r,
      g,
      b,
      a,
    );
  }

  // Add decoration segments
  for (let glyphIndex = 0; glyphIndex < glyphsLength; glyphIndex++) {
    const glyph = glyphs[glyphIndex];
    if (!glyph) continue;

    const nextGlyph = glyphs[glyphIndex + 1];

    // Handle underline segments
    if (
      glyph.underline === true &&
      (!nextGlyph || nextGlyph.underline === false)
    ) {
      let startIndex = glyphIndex;
      while (startIndex > 0 && glyphs[startIndex - 1]?.underline === true) {
        startIndex--;
      }

      const startGlyph = glyphs[startIndex];
      const endGlyph = glyph;
      if (!startGlyph) continue;

      const underlineY = glyph.y + glyph.height + 2; // Position slightly below text with small gap
      const underlineThickness = Math.max(2, layout.lineHeight * 0.05);

      bufferIndex = addSegmentQuadToBuffer(
        vertexBuffer,
        bufferIndex,
        startGlyph.x,
        underlineY,
        endGlyph.x + endGlyph.width,
        underlineY + underlineThickness,
        glyph.color,
      );
    }

    // Handle strikethrough segments
    if (
      glyph.strikethrough === true &&
      (!nextGlyph || nextGlyph.strikethrough === false)
    ) {
      let startIndex = glyphIndex;
      while (startIndex > 0 && glyphs[startIndex - 1]?.strikethrough === true) {
        startIndex--;
      }

      const startGlyph = glyphs[startIndex];
      const endGlyph = glyph;
      if (!startGlyph) continue;

      const strikethroughY = glyph.y + glyph.height * 0.45; // Position in middle of text
      const strikethroughThickness = Math.max(2, layout.lineHeight * 0.04);

      bufferIndex = addSegmentQuadToBuffer(
        vertexBuffer,
        bufferIndex,
        startGlyph.x,
        strikethroughY,
        endGlyph.x + endGlyph.width,
        strikethroughY + strikethroughThickness,
        glyph.color,
      );
    }
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
  const color = renderProps.color;
  const offsetY = renderProps.offsetY;
  const worldAlpha = renderProps.worldAlpha;
  const globalTransform = renderProps.globalTransform;

  const atlasTexture = SdfFontHandler.getAtlas(fontFamily);
  if (atlasTexture === null) {
    console.warn(`SDF atlas texture not found for font: ${fontFamily}`);
    return;
  }

  // We can safely assume this is a WebGL renderer else this wouldn't be called
  const glw = (renderer as WebGlRenderer).glw;
  const stride = 8 * Float32Array.BYTES_PER_ELEMENT; // 8 floats per vertex: x,y,u,v,r,g,b,a
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
        a_color: {
          name: 'a_color',
          size: 4,
          type: glw.FLOAT as number,
          normalized: false,
          stride,
          offset: 4 * Float32Array.BYTES_PER_ELEMENT,
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
        color: mergeColorAlpha(color, worldAlpha),
        size: layout.fontScale, // Use proper font scaling in shader
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

  let underlineSegmentCount = 0;
  let inUnderlineSegment = false;
  let strikethroughSegmentCount = 0;
  let inStrikethroughSegment = false;

  for (let i = 0; i < layout.glyphs.length; i++) {
    const glyph = layout.glyphs[i];
    if (glyph?.underline === true) {
      if (!inUnderlineSegment) {
        underlineSegmentCount++;
        inUnderlineSegment = true;
      }
    } else {
      inUnderlineSegment = false;
    }

    if (glyph?.strikethrough === true) {
      if (!inStrikethroughSegment) {
        strikethroughSegmentCount++;
        inStrikethroughSegment = true;
      }
    } else {
      inStrikethroughSegment = false;
    }
  }

  const totalQuads =
    layout.glyphs.length + underlineSegmentCount + strikethroughSegmentCount;
  renderOp.addTexture(atlasTexture.ctxTexture as WebGlCtxTexture);
  renderOp.numQuads = totalQuads;

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
  const wordBreak = props.wordBreak;

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

  const hasMaxLines = effectiveMaxLines > 0;

  // Parse BBCode and create a character map with formatting information
  const parsedText = parseBBCode(text);
  const plainText = parsedText.text;

  // Split text into lines based on wrapping constraints
  const [lines, remainingLines, remainingText] = shouldWrapText
    ? wrapText(
        plainText,
        fontFamily,
        finalScale,
        maxWidth,
        letterSpacing,
        overflowSuffix,
        wordBreak,
        effectiveMaxLines,
        hasMaxLines,
      )
    : measureLines(
        plainText.split('\n'),
        fontFamily,
        letterSpacing,
        finalScale,
        effectiveMaxLines,
        hasMaxLines,
      );

  const glyphs: GlyphLayout[] = [];
  let maxWidthFound = 0;
  let currentY = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line && line[1] > maxWidthFound) {
      maxWidthFound = line[1];
    }
  }

  // Second pass: Generate glyph layouts with proper alignment
  let lineIndex = 0;
  const linesLength = lines.length;
  let globalCharIndex = 0; // Track position in original plain text for formatting lookup

  while (lineIndex < linesLength) {
    const [line, lineWidth] = lines[lineIndex]!;
    lineIndex++;

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

      // Sync globalCharIndex with plainText by finding the next matching character
      while (
        globalCharIndex < plainText.length &&
        plainText[globalCharIndex] !== char
      ) {
        globalCharIndex++;
      }

      // Skip zero-width spaces for rendering but keep them in the text flow
      if (isZeroWidthSpace(char)) {
        globalCharIndex++;
        continue;
      }

      // Get glyph data from font handler
      const glyph = SdfFontHandler.getGlyph(fontFamily, codepoint);
      if (glyph === null) {
        globalCharIndex++;
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

      // Get formatting for this character position
      const formatting = parsedText.formatting[globalCharIndex];

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
        underline: formatting?.underline || false,
        strikethrough: formatting?.strikethrough || false,
        color: formatting?.color,
      };

      glyphs.push(glyphLayout);

      // Advance position with letter spacing (in design units)
      currentX += advance + designLetterSpacing;
      prevCodepoint = codepoint;
      globalCharIndex++;
    }

    currentY += designLineHeight;
  }

  // Convert final dimensions to pixel space for the layout
  return {
    glyphs,
    distanceRange: finalScale * fontData.distanceField.distanceRange,
    width: Math.ceil(maxWidthFound * finalScale),
    height: Math.ceil(designLineHeight * lines.length * finalScale),
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
