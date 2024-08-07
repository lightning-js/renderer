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

import { assertTruthy } from '../../utils.js';
import { type TextureData } from '../textures/Texture.js';

/**
 * Tests if the given location is a SVG
 * @param url
 * @remarks
 * This function is used to determine if the given image url is a SVG
 * image
 * @returns
 */
export function isSvgImage(url: string): boolean {
  return /\.(svg)$/.test(url);
}

/**
 * Loads a compressed texture container
 * @param url
 * @returns
 */
export const loadSvg = (url: string): Promise<TextureData> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    assertTruthy(ctx);

    ctx.imageSmoothingEnabled = true;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      resolve({
        data: ctx.getImageData(0, 0, canvas.width, canvas.height),
        premultiplyAlpha: false,
      });
    };

    img.onerror = (err) => {
      reject(err);
    };

    img.src = url;
  });
};
