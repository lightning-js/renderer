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
import { Texture, TextureType, type TextureData } from './Texture.js';
import type { Platform } from '../platforms/Platform.js';
import type { CompressedImageData } from '../platforms/web/lib/textureCompression.js';

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
  src?: string | Blob | ImageData | (() => ImageData | null);
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
   * Width of the image to be used as a texture. If not provided, the image's
   * natural width will be used.
   */
  w?: number | null;
  /**
   * Height of the image to be used as a texture. If not provided, the image's
   * natural height will be used.
   */
  h?: number | null;
  /**
   * Type, indicate an image type for overriding type detection
   *
   * @default null
   */
  type?: 'regular' | 'compressed' | 'svg' | null;
  /**
   * The width of the rectangle from which the ImageBitmap will be extracted. This value
   * can be negative. Only works when createImageBitmap is supported on the browser.
   *
   * @default null
   */
  sw?: number | null;
  /**
   * The height of the rectangle from which the ImageBitmap will be extracted. This value
   * can be negative. Only works when createImageBitmap is supported on the browser.
   *
   * @default null
   */
  sh?: number | null;
  /**
   * The y coordinate of the reference point of the rectangle from which the ImageBitmap
   * will be extracted. Only used when `sw` and `sh` are provided. And only works when
   * createImageBitmap is available.
   *
   * @default null
   */
  sx?: number | null;
  /**
   * The x coordinate of the reference point of the rectangle from which the
   * ImageBitmap will be extracted. Only used when source `sw` width and `sh` height
   * are provided. Only works when createImageBitmap is supported on the browser.
   *
   * @default null
   */
  sy?: number | null;
  /**
   * Maximum number of times to retry loading the image if it fails.
   *
   * @default 5
   */
  maxRetryCount?: number;
}

export interface ImageResponse {
  data: ImageBitmap | ImageData | CompressedImageData | null;
  premultiplyAlpha: boolean | null;
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
  private platform: Platform;

  public props: Required<ImageTextureProps>;
  public override type: TextureType = TextureType.image;

  constructor(
    txManager: CoreTextureManager,
    props: Required<ImageTextureProps>,
  ) {
    super(txManager);

    this.platform = txManager.platform;
    this.props = props;
    this.maxRetryCount = props.maxRetryCount as number;
  }

  override async getTextureSource(): Promise<TextureData> {
    let resp: TextureData;
    try {
      resp = await this.determineImageTypeAndLoadImage();
    } catch (e) {
      this.setState('failed', e as Error);

      return {
        data: null,
      };
    }

    if (resp.data === null) {
      this.setState('failed', Error('ImageTexture: No image data'));
      return {
        data: null,
      };
    }

    return {
      data: resp.data,
      premultiplyAlpha: this.props.premultiplyAlpha ?? true,
    };
  }

  determineImageTypeAndLoadImage() {
    const { src, premultiplyAlpha, type } = this.props;
    const platform = this.platform;
    const premultiply = premultiplyAlpha ?? true;

    if (src === null) {
      return {
        data: null,
      };
    }

    if (typeof src !== 'string') {
      if (src instanceof Blob) {
        return platform.createImage(src, premultiply);
      }

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

    if (type === 'regular') {
      return platform.loadImage(src, premultiply);
    }

    if (type === 'svg') {
      return platform.loadSvg(
        src,
        this.props.w,
        this.props.h,
        this.props.sx,
        this.props.sy,
        this.props.sw,
        this.props.sh,
      );
    }

    if (isSvgImage(src) === true) {
      return platform.loadSvg(
        src,
        this.props.w,
        this.props.h,
        this.props.sx,
        this.props.sy,
        this.props.sw,
        this.props.sh,
      );
    }

    if (type === 'compressed') {
      return platform.loadCompressedTexture(src);
    }

    if (isCompressedTextureContainer(src) === true) {
      return platform.loadCompressedTexture(src);
    }

    // default
    return platform.loadImage(src, premultiply);
  }

  /**
   * Generates a cache key for the ImageTexture based on the provided props.
   * @param props - The props used to generate the cache key.
   * @returns The cache key as a string, or `false` if the key cannot be generated.
   */
  static override makeCacheKey(props: ImageTextureProps): string | false {
    // Only cache key-able textures; prioritise key
    const key = props.key || props.src;
    if (typeof key !== 'string') {
      return false;
    }

    let cacheKey = `ImageTexture,${key},${props.premultiplyAlpha ?? 'true'},${
      props.maxRetryCount
    }`;

    if (props.sh !== null && props.sw !== null) {
      cacheKey += ',';
      cacheKey += props.sx ?? '';
      cacheKey += props.sy ?? '';
      cacheKey += props.sw || '';
      cacheKey += props.sh || '';
    }

    return cacheKey;
  }

  static override resolveDefaults(
    props: ImageTextureProps,
  ): Required<ImageTextureProps> {
    return {
      src: props.src ?? '',
      premultiplyAlpha: props.premultiplyAlpha ?? true, // null,
      key: props.key ?? null,
      type: props.type ?? null,
      w: props.w ?? null,
      h: props.h ?? null,
      sx: props.sx ?? null,
      sy: props.sy ?? null,
      sw: props.sw ?? null,
      sh: props.sh ?? null,
      maxRetryCount: props.maxRetryCount ?? 5,
    };
  }

  static z$__type__Props: ImageTextureProps;
}

/**
 * Tests if the given location is a SVG
 * @param url
 * @remarks
 * This function is used to determine if the given image url is a SVG
 * image
 * @returns
 */
export function isSvgImage(url: string): boolean {
  return /\.(svg)(\?.*)?$/.test(url);
}

/**
 * Tests if the given location is a compressed texture container
 * @param url
 * @remarks
 * This function is used to determine if the given image url is a compressed
 * and only supports the following extensions: .ktx and .pvr
 * @returns
 */
export function isCompressedTextureContainer(src: string): boolean {
  return /\.(ktx|pvr)$/.test(src);
}
