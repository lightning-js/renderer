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

import type { CoreTextureManager } from '../CoreTextureManager.js';
import { Texture, type TextureData } from './Texture.js';
import {
  isCompressedTextureContainer,
  loadCompressedTexture,
} from '../lib/textureCompression.js';
import { convertUrlToAbsolute } from '../lib/utils.js';

/**
 * Properties of the {@link ImageTexture}
 */
export interface ImageTextureProps {
  /**
   * Source URL or ImageData for the image to be used as a texture.
   *
   * @remarks
   * The ImageData type is currently only supported internally. End users should
   * only set this property to a URL string.
   *
   * @default ''
   */
  src?: string | ImageData | (() => TextureData['data'] | null);
  /**
   * Whether to premultiply the alpha channel into the color channels of the
   * image.
   *
   * @remarks
   * Generally this should be set to `true` (the default). However, if the
   * texture's associated Shader expects straight (non-premultiplied) colors,
   * this should be set to `false`.
   *
   * @default true
   */
  premultiplyAlpha?: boolean | null;
  /**
   * `ImageData` textures are not cached unless a `key` is provided
   */
  key?: string | null;
}

/**
 * Texture consisting of an image loaded from a URL
 *
 * @remarks
 * The ImageTexture's {@link ImageTextureProps.src} prop defines the image URL
 * to be downloaded.
 *
 * By default, the texture's alpha values will be premultiplied into its color
 * values which is generally the desired setting before they are sent to the
 * texture's associated {@link Shader}. However, in special cases you may want
 * the Shader to receive straight (non-premultiplied) values. In that case you
 * can disable the default behavior by setting the
 * {@link ImageTextureProps.premultiplyAlpha} prop to `false`.
 */
export class ImageTexture extends Texture {
  props: Required<ImageTextureProps>;

  constructor(txManager: CoreTextureManager, props: ImageTextureProps) {
    super(txManager);
    this.props = ImageTexture.resolveDefaults(props);
  }

  hasAlphaChannel(mimeType: string) {
    return mimeType.indexOf('image/png') !== -1;
  }

  override async getTextureData(): Promise<TextureData> {
    const { src, premultiplyAlpha } = this.props;
    if (!src) {
      return {
        data: null,
      };
    }

    if (typeof src !== 'string') {
      if (src instanceof ImageData) {
        return {
          data: src,
          premultiplyAlpha,
        };
      }
      return {
        data: src(),
        premultiplyAlpha,
      };
    }

    // Handle compressed textures
    if (isCompressedTextureContainer(src)) {
      return loadCompressedTexture(src);
    }

    // Convert relative URL to absolute URL
    const absoluteSrc = convertUrlToAbsolute(src);

    if (this.txManager.imageWorkerManager) {
      return await this.txManager.imageWorkerManager.getImage(
        absoluteSrc,
        premultiplyAlpha,
      );
    } else if (this.txManager.hasCreateImageBitmap) {
      const response = await fetch(absoluteSrc);
      const blob = await response.blob();
      const hasAlphaChannel =
        premultiplyAlpha ?? this.hasAlphaChannel(blob.type);
      return {
        data: await createImageBitmap(blob, {
          premultiplyAlpha: hasAlphaChannel ? 'premultiply' : 'none',
          colorSpaceConversion: 'none',
          imageOrientation: 'none',
        }),
        premultiplyAlpha: hasAlphaChannel,
      };
    } else {
      const img = new Image();
      if (!(src.substr(0, 5) === 'data:')) {
        img.crossOrigin = 'Anonymous';
      }
      img.src = absoluteSrc;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to load image`));
      }).catch((e) => {
        console.error(e);
      });

      return {
        data: img,
        premultiplyAlpha: premultiplyAlpha ?? true,
      };
    }
  }

  static override makeCacheKey(props: ImageTextureProps): string | false {
    const resolvedProps = ImageTexture.resolveDefaults(props);
    // Only cache key-able textures; prioritise key
    const key = resolvedProps.key || resolvedProps.src;
    if (typeof key !== 'string') {
      return false;
    }
    return `ImageTexture,${key},${resolvedProps.premultiplyAlpha ?? 'true'}`;
  }

  static override resolveDefaults(
    props: ImageTextureProps,
  ): Required<ImageTextureProps> {
    return {
      src: props.src ?? '',
      premultiplyAlpha: props.premultiplyAlpha ?? true, // null,
      key: props.key ?? null,
    };
  }

  static z$__type__Props: ImageTextureProps;
}
