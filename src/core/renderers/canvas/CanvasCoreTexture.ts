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

import type { Dimensions } from "../../../common/CommonTypes.js";
import { assertTruthy } from "../../../utils.js";
import { CoreContextTexture } from "../CoreContextTexture.js";
import { formatRgba, type IParsedColor } from "./internal/ColorUtils.js";

export class CanvasCoreTexture extends CoreContextTexture {

  protected image: ImageBitmap | HTMLCanvasElement | undefined;
  protected tintCache: {
    key: string;
    image: HTMLCanvasElement
  } | undefined;

  load(): void {
    if (this.textureSource.state !== 'freed') return;
    this.textureSource.setState('loading');
    this.onLoadRequest().then((size) => {
      this.textureSource.setState('loaded', size);
      this.memManager.setTextureMemUse(this, size.width * size.height * 4);
    }).catch((err) => {
      this.textureSource.setState('failed', err as Error);
    });
  }

  free(): void {
    this.image = undefined;
    this.tintCache = undefined;
    this.textureSource.setState('freed');
    this.memManager.setTextureMemUse(this, 0);
  }

  hasImage(): boolean {
    return this.image !== undefined;
  }

  getImage(color: IParsedColor): ImageBitmap | HTMLCanvasElement {
    const image = this.image;
    assertTruthy(image, 'Attempt to get unloaded image texture');

    if (color.isWhite) {
      return image;
    }
    const key = formatRgba(color);
    if (this.tintCache?.key === key) {
      return this.tintCache.image;
    }

    this.tintCache = {
      key,
      image: this.tintTexture(image, key)
    }
    return this.tintCache.image;
  }

  protected tintTexture(source: ImageBitmap | HTMLCanvasElement, color: string) {
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

  get renderable(): boolean {
    return this.textureSource.renderable;
  }

  private async onLoadRequest(): Promise<Dimensions> {
    const { data } = await this.textureSource.getTextureData();
    if (data instanceof ImageData) {
      const canvas = document.createElement('canvas');
      canvas.width = data.width;
      canvas.height = data.height;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.putImageData(data, 0, 0);
      this.image = canvas;
      return { width: data.width, height: data.height };
    } else if (data instanceof ImageBitmap) {
      this.image = data;
      return { width: data.width, height: data.height };
    }
    return { width: 0, height: 0 };
  }
}
