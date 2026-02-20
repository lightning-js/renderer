/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2026 Comcast Cable Communications Management, LLC.
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

import { WebPlatform } from './WebPlatform.js';
import type { PlatformSettings } from '../Platform.js';
import type { ImageResponse } from '../../textures/ImageTexture.js';
import {
  isBase64Image,
  dataURIToBlob,
  convertUrlToAbsolute,
} from './lib/utils.js';

/**
 * Legacy Web Platform implementation that uses Image() instead of createImageBitmap
 *
 * @remarks
 * This platform is designed for environments that don't support createImageBitmap API,
 * or for compatibility with older browsers. It uses the traditional HTMLImageElement
 * approach for image loading.
 *
 */
export class WebPlatformLegacy extends WebPlatform {
  constructor(settings: PlatformSettings = {}) {
    // Force image workers to be disabled in legacy mode
    super({ ...settings, numImageWorkers: 0 });
  }

  override async loadImage(
    src: string,
    premultiplyAlpha: boolean | null,
    sx?: number | null,
    sy?: number | null,
    sw?: number | null,
    sh?: number | null,
  ): Promise<ImageResponse> {
    const isBase64 = isBase64Image(src);
    const absoluteSrc = convertUrlToAbsolute(src);

    // For base64 images, use blob conversion
    if (isBase64 === true) {
      const blob = dataURIToBlob(src);
      return this.createImage(
        blob,
        premultiplyAlpha,
        sx ?? null,
        sy ?? null,
        sw ?? null,
        sh ?? null,
      );
    }

    // For regular URLs, load directly without blob conversion
    const hasAlpha =
      premultiplyAlpha ?? absoluteSrc.toLowerCase().endsWith('.png');
    const img = new Image();
    img.crossOrigin = 'anonymous';

    return new Promise<ImageResponse>((resolve, reject) => {
      img.onload = () => {
        resolve({ data: img, premultiplyAlpha: hasAlpha });
      };

      img.onerror = (err) => {
        const errorMessage =
          err instanceof Error
            ? err.message
            : err instanceof Event
            ? `Image loading failed for ${img.src}`
            : 'Unknown image loading error';
        reject(new Error(`Image loading failed: ${errorMessage}`));
      };

      img.src = absoluteSrc;
    });
  }

  override async createImage(
    blob: Blob,
    premultiplyAlpha: boolean | null,
    // Cropping parameters are not supported in legacy mode
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sx: number | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sy: number | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sw: number | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sh: number | null,
  ): Promise<ImageResponse> {
    const hasAlpha = premultiplyAlpha ?? blob.type.includes('image/png');
    const src = URL.createObjectURL(blob);
    const img = new Image();

    if (typeof src === 'string' && isBase64Image(src) === false) {
      img.crossOrigin = 'anonymous';
    }

    return new Promise<ImageResponse>((resolve, reject) => {
      img.onload = () => {
        URL.revokeObjectURL(src);
        resolve({ data: img, premultiplyAlpha: hasAlpha });
      };

      img.onerror = (err) => {
        URL.revokeObjectURL(src);
        const errorMessage =
          err instanceof Error
            ? err.message
            : err instanceof Event
            ? `Image loading failed for ${img.src}`
            : 'Unknown image loading error';
        reject(new Error(`Image loading failed: ${errorMessage}`));
      };

      img.src = src;
    });
  }

  override async loadCompressedTexture(src: string): Promise<ImageResponse> {
    throw new Error(
      `Compressed textures are not supported in legacy mode. Attempted to load: ${src}`,
    );
  }
}
