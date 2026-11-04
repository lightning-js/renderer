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

import type { Dimensions } from '../../../common/CommonTypes.js';
import { assertTruthy } from '../../../utils.js';
import { type IParsedColor } from '../../lib/colorParser.js';
import { CoreContextTexture } from '../CoreContextTexture.js';
import type { Texture } from '../../textures/Texture.js';
import { hasImageBitmap } from '../../platforms/capabilities.js';

/**
 * Maximum tinted variants kept per texture (see `CanvasTexture.tintCache`).
 *
 * @remarks
 * Bounds the extra canvases when many colors share one texture. The oldest
 * entry is evicted past the cap, so a texture cycling more colors than this
 * re-tints the evicted one — still strictly better than the previous
 * single-slot cache, which thrashed with just two alternating colors.
 */
const MAX_TINT_CACHE = 8;

export class CanvasTexture extends CoreContextTexture {
  protected image:
    ImageBitmap | HTMLCanvasElement | HTMLImageElement | undefined;
  /**
   * Tinted variants of {@link image}, keyed by CSS color string.
   *
   * @remarks
   * A single texture can be shared by many nodes with different colors
   * (e.g. deduplicated canvas text). `getImage` runs per node per frame, so
   * a single-slot cache would re-tint on every node (~1 canvas alloc +
   * fillRect + 2 drawImages each) whenever two nodes disagree on color.
   * The map keeps one entry per color actually in use; see
   * {@link MAX_TINT_CACHE} for the bound.
   */
  protected tintCache: Map<string, HTMLCanvasElement> | undefined;
  /**
   * {@link TextureData.release} of {@link image}, taken over from the
   * texture when the image is kept as the display source.
   */
  private releaseImage: (() => void) | undefined;

  load(): void {
    // Capture textureData synchronously - a pending
    // freeTextureDataTask microtask could null textureSource.textureData
    // during the first async suspension, causing onLoadRequest to fail.
    const textureData = this.textureSource.textureData;
    assertTruthy(textureData?.data, 'Texture data is null before load');

    this.textureSource.setState('loading');

    try {
      const size = this.onLoadRequest(textureData.data);

      // Guard against the texture being freed while the load was in flight
      if (this.textureSource.state === 'freed') {
        this.image = undefined;
        return;
      }

      // Canvas2D draws from the source itself, so freeing the texture data
      // below must not release it.
      if (this.image === textureData.data) {
        this.releaseImage = this.textureSource.takeTextureDataRelease();
      }
      this.textureSource.setState('loaded', size);
      this.textureSource.freeTextureData();
      this.updateMemSize();
    } catch (err) {
      this.textureSource.setState('failed', err as Error);
      this.textureSource.freeTextureData();
      throw err;
    }
  }

  release(): void {
    this.releaseImage?.();
    this.releaseImage = undefined;
    this.image = undefined;
    this.tintCache = undefined;
  }

  free(): void {
    this.release();
    this.textureSource.setState('freed');
    this.setTextureMemUse(0);
    this.textureSource.freeTextureData();
  }

  updateMemSize(): void {
    // Counting memory usage for:
    // - main image
    // - one tinted image per cached color
    const mult = 4 * (1 + (this.tintCache?.size ?? 0));
    if (this.textureSource.dimensions) {
      this.setTextureMemUse(
        this.textureSource.dimensions.w *
          this.textureSource.dimensions.h *
          mult,
      );
    }
  }

  hasImage(): boolean {
    return this.image !== undefined;
  }

  getImage(
    color: IParsedColor,
  ): ImageBitmap | HTMLCanvasElement | HTMLImageElement | null {
    const image = this.image;
    if (image === undefined) {
      return null;
    }

    if (color.isWhite) {
      // No tint needed. Unlike the previous single-slot cache, the per-color
      // map is left intact: other nodes sharing this texture may still need
      // their tints, and evicting them here would reintroduce per-frame
      // re-tinting for mixed white/colored usage.
      return image;
    }
    const key = `rgba(${color.r},${color.g},${color.b},${color.a})`;
    const cached = this.tintCache?.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const tintedImage = this.tintTexture(image, key);
    if (this.tintCache === undefined) {
      this.tintCache = new Map();
    }
    this.tintCache.set(key, tintedImage);
    if (this.tintCache.size > MAX_TINT_CACHE) {
      // Evict oldest insertion (Map preserves insertion order).
      const oldest = this.tintCache.keys().next();
      if (oldest.done === false) {
        this.tintCache.delete(oldest.value);
      }
    }
    this.updateMemSize();
    return tintedImage;
  }

  protected tintTexture(
    source: ImageBitmap | HTMLCanvasElement | HTMLImageElement,
    color: string,
  ) {
    const { width, height } = source;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // fill with target color
      ctx.fillStyle = color;
      ctx.globalCompositeOperation = 'copy';
      ctx.fillRect(0, 0, width, height);

      // multiply with image, resulting in non-transparent tinted image
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(source, 0, 0, width, height, 0, 0, width, height);

      // apply original image alpha
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(source, 0, 0, width, height, 0, 0, width, height);
    }
    return canvas;
  }

  private onLoadRequest(
    data: NonNullable<NonNullable<Texture['textureData']>['data']>,
  ): Dimensions {
    if (data instanceof ImageData) {
      const canvas = document.createElement('canvas');
      canvas.width = data.width;
      canvas.height = data.height;
      const ctx = canvas.getContext('2d');
      if (ctx !== null) ctx.putImageData(data, 0, 0);
      this.image = canvas;
      return { w: data.width, h: data.height };
    } else if (
      (hasImageBitmap === true && data instanceof ImageBitmap) ||
      data instanceof HTMLCanvasElement ||
      data instanceof HTMLImageElement
    ) {
      this.image = data;
      return { w: data.width, h: data.height };
    }

    return { w: 0, h: 0 };
  }
}
