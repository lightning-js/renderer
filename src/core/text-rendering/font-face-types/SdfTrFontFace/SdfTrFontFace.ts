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

// import type { Renderer } from '../../../Renderer';
import { assertTruthy } from '../../../../utils.js';
import type { Stage } from '../../../Stage.js';
import { WebGlCoreRenderer } from '../../../renderers/webgl/WebGlCoreRenderer.js';
import { ImageTexture } from '../../../textures/ImageTexture.js';
import { TrFontFace, type TrFontFaceDescriptors } from '../TrFontFace.js';
import type { FontShaper } from './internal/FontShaper.js';
import { SdfFontShaper, type SdfFontData } from './internal/SdfFontShaper.js';

type SdfFontType = 'ssdf' | 'msdf';

declare module '../TrFontFace.js' {
  interface TrFontFaceMap {
    ssdf: SdfTrFontFace<'ssdf'>;
    msdf: SdfTrFontFace<'msdf'>;
  }
}

interface GlyphAtlasEntry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class SdfTrFontFace<
  FontTypeT extends SdfFontType = SdfFontType,
> extends TrFontFace {
  public readonly type: FontTypeT;
  public readonly texture: ImageTexture;
  public readonly data: SdfFontData | undefined;
  public readonly shaper: FontShaper | undefined;
  public readonly glyphMap: Map<number, SdfFontData['chars'][0]> = new Map();

  constructor(
    fontFamily: string,
    descriptors: Partial<TrFontFaceDescriptors>,
    type: FontTypeT,
    stage: Stage,
    atlasUrl: string,
    atlasDataUrl: string,
  ) {
    super(fontFamily, descriptors);
    this.type = type;
    const renderer = stage.renderer;
    assertTruthy(
      renderer instanceof WebGlCoreRenderer,
      'SDF Font Faces can only be used with the WebGL Renderer',
    );

    this.texture = stage.txManager.loadTexture(
      'ImageTexture',
      {
        src: atlasUrl,
        // IMPORTANT: The SDF shader requires the alpha channel to NOT be
        // premultiplied on the atlas texture. If it is premultiplied, the
        // rendering of SDF glyphs (especially single-channel SDF fonts) will
        // be very jagged.
        premultiplyAlpha: false,
      },
      {
        preload: true,
      },
    );

    this.texture.on('loaded', () => {
      this.checkLoaded();
    });

    // Set this.data to the fetched data from dataUrl
    fetch(atlasDataUrl)
      .then(async (response) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        (this.data as SdfFontData) = await response.json();
        // Add all the glyphs to the glyph map
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.data!.chars.forEach((glyph) => {
          this.glyphMap.set(glyph.id, glyph);
        });
        // We know `data` is defined here, because we just set it
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        (this.shaper as FontShaper) = new SdfFontShaper(
          this.data!,
          this.glyphMap,
        );
        this.checkLoaded();
      })
      .catch(console.error);
  }

  getAtlasEntry(glyphId: number): GlyphAtlasEntry {
    const glyph = this.glyphMap.get(glyphId);
    if (glyph === undefined) {
      throw new Error(`Glyph ${glyphId} not found in font ${this.fontFamily}`);
    }
    return {
      x: glyph.x,
      y: glyph.y,
      width: glyph.width,
      height: glyph.height,
    };
  }

  private checkLoaded(): void {
    if (this.loaded) return;
    if (this.texture.state === 'loaded' && this.data) {
      (this.loaded as boolean) = true;
      this.emit('loaded');
    }
  }
}
