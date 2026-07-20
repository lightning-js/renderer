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
import { formatRgba, type IParsedColor } from '../../lib/colorParser.js';
import { CoreContextTexture } from '../CoreContextTexture.js';
import type { Texture } from '../../textures/Texture.js';

export class CanvasTexture extends CoreContextTexture {
  protected image:
    | ImageBitmap
    | HTMLCanvasElement
    | HTMLImageElement
    | undefined;
  protected tintCache:
    | {
        key: string;
        image: HTMLCanvasElement;
      }
    | undefined;

  async load(): Promise<void> {
    // Capture textureData synchronously before any await - a pending
    // freeTextureDataTask microtask could null textureSource.textureData
    // during the first async suspension, causing onLoadRequest to fail.
    const textureData = this.textureSource.textureData;
    assertTruthy(textureData?.data, 'Texture data is null before load');

    this.textureSource.setState('loading');

    try {
      const size = await this.onLoadRequest(textureData.data);

      // Guard against the texture being freed while the load was in flight
      if (this.textureSource.state === 'freed') {
        this.image = undefined;
        return;
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
    // - tinted image
    const mult = this.tintCache ? 8 : 4;
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
      if (this.tintCache) {
        this.tintCache = undefined;
        this.updateMemSize();
      }
      return image;
    }
    const key = formatRgba(color);
    if (this.tintCache?.key === key) {
      return this.tintCache.image;
    }

    const tintedImage = this.tintTexture(image, key);
    this.tintCache = {
      key,
      image: tintedImage,
    };
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

  private async onLoadRequest(
    data: NonNullable<NonNullable<Texture['textureData']>['data']>,
  ): Promise<Dimensions> {
    if (data instanceof ImageData) {
      const canvas = document.createElement('canvas');
      canvas.width = data.width;
      canvas.height = data.height;
      const ctx = canvas.getContext('2d');
      if (ctx !== null) ctx.putImageData(data, 0, 0);
      this.image = canvas;
      return { w: data.width, h: data.height };
    } else if (
      (typeof ImageBitmap !== 'undefined' && data instanceof ImageBitmap) ||
      (typeof HTMLCanvasElement !== 'undefined' &&
        data instanceof HTMLCanvasElement) ||
      data instanceof HTMLImageElement
    ) {
      this.image = data;
      return { w: data.width, h: data.height };
    }

    return { w: 0, h: 0 };
  }
}
