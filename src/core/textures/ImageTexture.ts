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
   * Width of the image to be used as a texture. If not provided, the image's
   * natural width will be used.
   */
  width?: number | null;
  /**
   * Height of the image to be used as a texture. If not provided, the image's
   * natural height will be used.
   */
  height?: number | null;
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

  public override type: TextureType = TextureType.image;

  constructor(txManager: CoreTextureManager, props: ImageTextureProps) {
    super(txManager);
    this.props = ImageTexture.resolveDefaults(props);
  }

  hasAlphaChannel(mimeType: string) {
    return mimeType.indexOf('image/png') !== -1;
  }

  async loadImage(src: string) {
    const { premultiplyAlpha, sx, sy, sw, sh } = this.props;

    if (this.txManager.imageWorkerManager !== null) {
      return await this.txManager.imageWorkerManager.getImage(
        src,
        premultiplyAlpha,
        sx,
        sy,
        sw,
        sh,
      );
    } else if (this.txManager.hasCreateImageBitmap === true) {
      const response = await fetch(src);
      const blob = await response.blob();
      const hasAlphaChannel =
        premultiplyAlpha ?? this.hasAlphaChannel(blob.type);

      let data;

      if (sw !== null && sh !== null) {
        data = await createImageBitmap(blob, sx ?? 0, sy ?? 0, sw, sh, {
          premultiplyAlpha: hasAlphaChannel ? 'premultiply' : 'none',
          colorSpaceConversion: 'none',
          imageOrientation: 'none',
        });
      }

      if (this.txManager.createImageBitmapNotSupportsOptions) {
        data = await createImageBitmap(blob);
      } else {
        data = await createImageBitmap(blob, {
          premultiplyAlpha: hasAlphaChannel ? 'premultiply' : 'none',
          colorSpaceConversion: 'none',
          imageOrientation: 'none',
        }).catch(() => createImageBitmap(blob));
      }

      return {
        data: data,
        premultiplyAlpha: hasAlphaChannel,
      };
    } else {
      const img = new Image();
      if (!src.startsWith('data:')) {
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
      return this.loadImage(absoluteSrc);
    }

    if (type === 'svg') {
      return loadSvg(
        absoluteSrc,
        this.props.width,
        this.props.height,
        this.props.sx,
        this.props.sy,
        this.props.sw,
        this.props.sh,
      );
    }

    if (isSvgImage(src) === true) {
      return loadSvg(
        absoluteSrc,
        this.props.width,
        this.props.height,
        this.props.sx,
        this.props.sy,
        this.props.sw,
        this.props.sh,
      );
    }

    if (type === 'compressed') {
      return loadCompressedTexture(absoluteSrc);
    }

    if (isCompressedTextureContainer(src) === true) {
      return loadCompressedTexture(absoluteSrc);
    }

    // default
    return this.loadImage(absoluteSrc);
  }

  /**
   * Generates a cache key for the ImageTexture based on the provided props.
   * @param props - The props used to generate the cache key.
   * @returns The cache key as a string, or `false` if the key cannot be generated.
   */
  static override makeCacheKey(props: ImageTextureProps): string | false {
    const resolvedProps = ImageTexture.resolveDefaults(props);
    // Only cache key-able textures; prioritise key
    const key = resolvedProps.key || resolvedProps.src;
    if (typeof key !== 'string') {
      return false;
    }

    // if we have source dimensions, cache the texture separately
    let dimensionProps = '';
    if (resolvedProps.sh !== null && resolvedProps.sw !== null) {
      dimensionProps += ',';
      dimensionProps += resolvedProps.sx ?? '';
      dimensionProps += resolvedProps.sy ?? '';
      dimensionProps += resolvedProps.sw || '';
      dimensionProps += resolvedProps.sh || '';
    }

    return `ImageTexture,${key},${
      resolvedProps.premultiplyAlpha ?? 'true'
    }${dimensionProps}`;
  }

  static override resolveDefaults(
    props: ImageTextureProps,
  ): Required<ImageTextureProps> {
    return {
      src: props.src ?? '',
      premultiplyAlpha: props.premultiplyAlpha ?? true, // null,
      key: props.key ?? null,
      type: props.type ?? null,
      width: props.width ?? null,
      height: props.height ?? null,
      sx: props.sx ?? null,
      sy: props.sy ?? null,
      sw: props.sw ?? null,
      sh: props.sh ?? null,
    };
  }

  static z$__type__Props: ImageTextureProps;
}
