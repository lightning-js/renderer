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
import type { ImageResponse } from '../../textures/ImageTexture.js';

/**
 * Chrome 50 Web Platform implementation with limited createImageBitmap support
 *
 * @remarks
 * This platform is designed for Chrome 50 and similar browsers that support
 * createImageBitmap but with a limited signature (no options or cropping parameters).
 *
 * Limitations:
 * - createImageBitmap is called without options (premultiplyAlpha, colorSpaceConversion, imageOrientation)
 * - Image cropping (sx, sy, sw, sh parameters) is not supported
 * - Image workers can still be used if enabled via settings
 */
export class WebPlatformChrome50 extends WebPlatform {
  override async createImage(
    blob: Blob,
    premultiplyAlpha: boolean | null,
    // Cropping parameters are not supported in Chrome 50
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sx: number | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sy: number | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sw: number | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sh: number | null,
  ): Promise<ImageResponse> {
    const hasAlphaChannel = premultiplyAlpha ?? blob.type.includes('image/png');

    // Chrome 50 createImageBitmap signature: createImageBitmap(blob)
    // No options or cropping parameters supported
    const bitmap = await createImageBitmap(blob);

    return { data: bitmap, premultiplyAlpha: hasAlphaChannel };
  }
}
