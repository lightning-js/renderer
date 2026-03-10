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
import type { ImageTexture } from '../textures/ImageTexture.js';
import { CoreFont, FontState, type CoreFontProps } from './CoreFont.js';
import {
  buildGlyphMap,
  buildKerningTable,
  type KerningTable,
  type SdfFontData,
  type SdfGlyphMap,
} from './SdfFontHandler.js';
import { normalizeFontMetrics } from './TextLayoutEngine.js';
import type { NormalizedFontMetrics, TextRenderer } from './TextRenderer.js';
import { hasZeroWidthSpace } from './Utils.js';

export type SdfFontProps = CoreFontProps & {
  atlasUrl: string;
  atlasDataUrl: string;
};

export class SdfFont extends CoreFont {
  public type = 'sdf';
  public atlasUrl: string;
  public atlasDataUrl: string;
  public atlasTexture?: ImageTexture;

  private glyphMap?: SdfGlyphMap;
  private kerningTable?: KerningTable;
  private data?: SdfFontData;

  constructor(
    textRenderer: TextRenderer,
    props: SdfFontProps,
    private stage: Stage,
  ) {
    super(textRenderer, props);
    this.atlasUrl = props.atlasUrl;
    this.atlasDataUrl = props.atlasDataUrl;
  }

  load() {
    new Promise(async () => {
      const atlasData = await fetch(this.atlasDataUrl);
      if (atlasData.ok === false) {
        this.hardFail(`Failed to load font data: ${atlasData.statusText}`);
      }

      const fontData = (await atlasData.json()) as SdfFontData;
      if (fontData.chars === undefined) {
        this.hardFail('Invalid SDF font data format');
      }

      const atlasTexture = this.stage.txManager.createTexture('ImageTexture', {
        src: this.atlasUrl,
        premultiplyAlpha: false,
      });

      atlasTexture.setRenderableOwner(this.family, true);
      atlasTexture.preventCleanup = true;
      atlasTexture.on('loaded', () => {
        this.onLoaded();
      });
      atlasTexture.on('failed', (error: Error) => {
        console.error(`Failed to load SDF font: ${this.family}`, error);
        this.emit('failed');
      });

      this.atlasTexture = atlasTexture;
      this.processFontData(fontData);
    });
  }

  private hardFail(message: string) {
    this.state = FontState.Failed;
    throw new Error(message);
  }

  private processFontData(fontData: SdfFontData) {
    this.glyphMap = buildGlyphMap(fontData.chars);
    this.kerningTable = buildKerningTable(fontData.kernings);
    this.metrics = this.metrics ||
      fontData.lightningMetrics || {
        ascender: 800,
        descender: -200,
        lineGap: 200,
        unitsPerEm: 1000,
      };
    this.data = fontData;
  }

  measureText(text: string, letterSpacing: number) {
    if (text.length === 1) {
      const char = text.charAt(0);
      const codepoint = text.codePointAt(0);
      if (codepoint === undefined) return 0;
      if (hasZeroWidthSpace(char) === true) return 0;

      const glyph = this.getGlyph(codepoint);
      if (glyph === null) return 0;
      return glyph.xadvance + letterSpacing;
    }
    let width = 0;
    let prevCodepoint = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charAt(i);
      const codepoint = text.codePointAt(i);
      if (codepoint === undefined) continue;

      // Skip zero-width spaces in width calculations
      if (hasZeroWidthSpace(char)) {
        continue;
      }

      const glyph = this.getGlyph(codepoint);
      if (glyph === null) continue;

      let advance = glyph.xadvance;

      // Add kerning if there's a previous character
      if (prevCodepoint !== 0) {
        const kerning = this.getKerning(prevCodepoint, codepoint);
        advance += kerning;
      }

      width += advance + letterSpacing;
      prevCodepoint = codepoint;
    }

    return width;
  }

  getMetrics(fontSize: number): NormalizedFontMetrics {
    let m = this.normalizedMetrics![fontSize];
    if (m !== undefined) {
      return m;
    }
    m = this.normalizedMetrics![fontSize] = normalizeFontMetrics(
      this.metrics!,
      fontSize,
    );
    return m;
  }

  getGlyph(codepoint: number) {
    const gm = this.glyphMap as SdfGlyphMap;
    return gm[codepoint] || gm[63] || null;
  }

  getKerning(firstGlyph: number, secondGlyph: number) {
    const seconds = this.kerningTable![secondGlyph];
    return (seconds !== undefined && seconds[firstGlyph]) || 0;
  }

  getAtlas() {
    return this.atlasTexture!;
  }

  getData() {
    return this.data!;
  }
}
