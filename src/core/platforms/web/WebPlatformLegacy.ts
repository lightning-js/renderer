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
import type { ImageWorkerFactory } from './lib/ImageWorker.js';
import { createImageWorkerLegacy } from './lib/ImageWorkerLegacy.js';
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
    super({ ...settings, numImageWorkers: settings.numImageWorkers ?? 0 });
  }

  protected override getImageWorkerFactory(): ImageWorkerFactory {
    return createImageWorkerLegacy;
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

    if (isBase64 === false && this.settings.numImageWorkers > 0) {
      return super.loadImage(src, premultiplyAlpha, sx, sy, sw, sh);
    }

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

  /**
   * Load a font using CSS `@font-face` injection.
   *
   * @remarks
   * The `FontFace` JavaScript constructor used by {@link WebPlatform} relies on
   * the CSS Font Loading API. While the API is nominally present on Chrome 35+,
   * embedded/legacy browsers (QtWebKit, older WPEWebKit builds, some set-top-box
   * browsers) either lack the API entirely or silently drop fonts loaded this way
   * before they reach the canvas 2D rasteriser.
   *
   * Injecting a `<style>` block with an `@font-face` rule is the universally
   * supported alternative: every browser that renders text supports it.  When
   * `document.fonts.load()` is available we also trigger an eager load so that
   * the font is available immediately rather than on first paint.
   */
  override async loadFontFace(
    fontFamily: string,
    fontUrl: string,
  ): Promise<FontFace | null> {
    // Determine the format hint so old browsers know how to decode the file.
    const lower = fontUrl.toLowerCase();
    const formatHint = lower.endsWith('.ttf')
      ? " format('truetype')"
      : lower.endsWith('.woff2')
      ? " format('woff2')"
      : lower.endsWith('.woff')
      ? " format('woff')"
      : lower.endsWith('.otf')
      ? " format('opentype')"
      : '';

    const style = document.createElement('style');
    style.textContent = `@font-face { font-family: '${fontFamily}'; src: url('${fontUrl}')${formatHint}; }`;
    document.head.appendChild(style);

    // Eagerly trigger font loading when the CSS Font Loading API is available
    // so callers can await full availability.  On browsers that lack the API
    // the font will be loaded lazily by the layout engine on first use.
    if (
      typeof document.fonts !== 'undefined' &&
      typeof document.fonts.load === 'function'
    ) {
      await document.fonts.load(`16px '${fontFamily}'`).catch(() => {
        // Swallow load errors – the @font-face rule is already injected and
        // the browser will retry when the font is actually needed.
      });
    }

    return null;
  }
}
