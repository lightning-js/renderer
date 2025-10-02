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
import {
  convertUrlToAbsolute,
  dataURIToBlob,
  isBase64Image,
} from '../lib/utils.js';
import { isSvgImage, loadSvg } from '../lib/textureSvg.js';
import { fetchJson } from '../text-rendering/font-face-types/utils.js';

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

  /**
   * Maximum number of times to retry loading the image if it fails.
   *
   * @default 5
   */
  maxRetryCount?: number | null;
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
  override readonly type = TextureType.image as const;
  public props: Required<ImageTextureProps>;

  constructor(txManager: CoreTextureManager, props: ImageTextureProps) {
    const resolvedProps = ImageTexture.resolveDefaults(props);
    super(txManager);
    this.props = resolvedProps;
    this.maxRetryCount = resolvedProps.maxRetryCount ?? 5;
  }

  hasAlphaChannel(mimeType: string) {
    return mimeType.indexOf('image/png') !== -1;
  }

  async loadImageFallback(src: string | Blob, hasAlpha: boolean) {
    const img = new Image();

    if (typeof src === 'string' && isBase64Image(src) === false) {
      img.crossOrigin = 'anonymous';
    }

    return new Promise<{
      data: HTMLImageElement | null;
      premultiplyAlpha: boolean;
    }>((resolve, reject) => {
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

      if (src instanceof Blob) {
        img.src = URL.createObjectURL(src);
      } else {
        img.src = src;
      }
    });
  }

  async createImageBitmap(
    blob: Blob,
    premultiplyAlpha: boolean | null,
    sx: number | null,
    sy: number | null,
    sw: number | null,
    sh: number | null,
  ): Promise<{
    data: ImageBitmap | HTMLImageElement;
    premultiplyAlpha: boolean;
  }> {
    const hasAlphaChannel = premultiplyAlpha ?? blob.type.includes('image/png');
    const imageBitmapSupported = this.txManager.imageBitmapSupported;

    if (imageBitmapSupported.full === true && sw !== null && sh !== null) {
      // createImageBitmap with crop
      try {
        const bitmap = await createImageBitmap(blob, sx || 0, sy || 0, sw, sh, {
          premultiplyAlpha: hasAlphaChannel ? 'premultiply' : 'none',
          colorSpaceConversion: 'none',
          imageOrientation: 'none',
        });
        return { data: bitmap, premultiplyAlpha: hasAlphaChannel };
      } catch (error) {
        throw new Error(`Failed to create image bitmap with crop: ${error}`);
      }
    } else if (imageBitmapSupported.basic === true) {
      // basic createImageBitmap without options or crop
      // this is supported for Chrome v50 to v52/54 that doesn't support options
      try {
        return {
          data: await createImageBitmap(blob),
          premultiplyAlpha: hasAlphaChannel,
        };
      } catch (error) {
        throw new Error(`Failed to create basic image bitmap: ${error}`);
      }
    }

    // default createImageBitmap without crop but with options
    try {
      const bitmap = await createImageBitmap(blob, {
        premultiplyAlpha: hasAlphaChannel ? 'premultiply' : 'none',
        colorSpaceConversion: 'none',
        imageOrientation: 'none',
      });
      return { data: bitmap, premultiplyAlpha: hasAlphaChannel };
    } catch (error) {
      throw new Error(`Failed to create image bitmap with options: ${error}`);
    }
  }

  async loadImage(src: string) {
    const { premultiplyAlpha, sx, sy, sw, sh } = this.props;

    if (this.txManager.hasCreateImageBitmap === true) {
      if (
        isBase64Image(src) === false &&
        this.txManager.hasWorker === true &&
        this.txManager.imageWorkerManager !== null
      ) {
        try {
          return this.txManager.imageWorkerManager.getImage(
            src,
            premultiplyAlpha,
            sx,
            sy,
            sw,
            sh,
          );
        } catch (error) {
          throw new Error(`Failed to load image via worker: ${error}`);
        }
      }

      let blob;

      if (isBase64Image(src) === true) {
        blob = dataURIToBlob(src);
      } else {
        try {
          blob = (await fetchJson(src, 'blob')) as Blob;
        } catch (error) {
          throw new Error(`Failed to fetch image blob from ${src}: ${error}`);
        }
      }

      return this.createImageBitmap(blob, premultiplyAlpha, sx, sy, sw, sh);
    }

    return this.loadImageFallback(src, premultiplyAlpha ?? true);
  }

  override async getTextureSource(): Promise<TextureData> {
    let resp;
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
    if (src === null) {
      return {
        data: null,
      };
    }

    if (typeof src !== 'string') {
      if (src instanceof Blob) {
        if (this.txManager.hasCreateImageBitmap === true) {
          const { sx, sy, sw, sh } = this.props;
          return this.createImageBitmap(src, premultiplyAlpha, sx, sy, sw, sh);
        } else {
          return this.loadImageFallback(src, premultiplyAlpha ?? true);
        }
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
      maxRetryCount: props.maxRetryCount ?? 5,
    };
  }

  static z$__type__Props: ImageTextureProps;
}
