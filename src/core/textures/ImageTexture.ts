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
import { isSvgImage, loadSvg } from '../lib/textureSvg.js';

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
  src?: string | ImageData | (() => ImageData | null);
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
  /**
   * Type, indicate an image type for overriding type detection
   *
   * @default null
   */
  type?: 'regular' | 'compressed' | 'svg' | null;
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

  async loadImage(src: string, premultiplyAlpha: boolean | null) {
    if (this.txManager.imageWorkerManager !== null) {
      return await this.txManager.imageWorkerManager.getImage(
        src,
        premultiplyAlpha,
      );
    } else if (this.txManager.hasCreateImageBitmap === true) {
      const response = await fetch(src);
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
      img.src = src;
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

  override async getTextureData(): Promise<TextureData> {
    const { src, premultiplyAlpha, type } = this.props;
    if (src === null) {
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

    const absoluteSrc = convertUrlToAbsolute(src);
    if (type === 'regular') {
      return this.loadImage(absoluteSrc, premultiplyAlpha);
    }

    if (type === 'svg') {
      return loadSvg(absoluteSrc);
    }

    if (isSvgImage(src) === true) {
      return loadSvg(absoluteSrc);
    }

    if (type === 'compressed') {
      return loadCompressedTexture(absoluteSrc);
    }

    if (isCompressedTextureContainer(src) === true) {
      return loadCompressedTexture(absoluteSrc);
    }

    // default
    return this.loadImage(absoluteSrc, premultiplyAlpha);
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
      type: props.type ?? null,
    };
  }

  static z$__type__Props: ImageTextureProps;
}
