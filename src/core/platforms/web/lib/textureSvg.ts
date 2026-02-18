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

import { assertTruthy } from '../../../../utils.js';
import type { ImageResponse } from '../../../textures/ImageTexture.js';

/**
 * Loads a SVG image
 * @param url
 * @returns
 */
export const loadSvg = (
  url: string,
  width: number | null,
  height: number | null,
  sx: number | null,
  sy: number | null,
  sw: number | null,
  sh: number | null,
): Promise<ImageResponse> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    assertTruthy(ctx);

    ctx.imageSmoothingEnabled = true;
    const img = new Image();
    img.onload = () => {
      const x = sx ?? 0;
      const y = sy ?? 0;
      const w = width || img.width;
      const h = height || img.height;

      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);

      resolve({
        data: ctx.getImageData(x, y, sw ?? w, sh ?? h),
        premultiplyAlpha: false,
      });
    };

    img.onerror = (err) => {
      reject(err);
    };

    img.src = url;
  });
};
