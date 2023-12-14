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
  src?: string | ImageData;
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
  premultiplyAlpha?: boolean;
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

  override async getTextureData(): Promise<TextureData> {
    const { src, premultiplyAlpha } = this.props;
    if (!src) {
      return {
        data: null,
      };
    }
    if (src instanceof ImageData) {
      return {
        data: src,
        premultiplyAlpha,
      };
    }

    // Handle compressed textures
    if (this.isCompressedTexture()) {
      return this.handleCompressedTexture();
    }

    const response = await fetch(src);
    const blob = await response.blob();
    return {
      data: await createImageBitmap(blob, {
        premultiplyAlpha: premultiplyAlpha ? 'premultiply' : 'none',
        colorSpaceConversion: 'none',
        imageOrientation: 'none',
      }),
    };
  }

  isCompressedTexture(): boolean {
    const { src } = this.props;
    // Test if we're not using ImageData
    if (src instanceof ImageData) {
      return false;
    }
    return /\.(ktx|pvr)$/.test(src);
  }

  async handleCompressedTexture(): Promise<TextureData> {
    const { src } = this.props;

    const response = await fetch(src as string);
    const arrayBuffer = await response.arrayBuffer();

    if ((src as string).indexOf('.ktx') !== -1) {
      return this.loadKTXData(arrayBuffer);
    }

    return this.loadPVRData(arrayBuffer);
  }

  async loadKTXData(buffer: ArrayBuffer): Promise<TextureData> {
    const view = new DataView(buffer);
    const littleEndian = view.getUint32(12) === 16909060 ? true : false;
    const mipmaps = [];

    const data = {
      glInternalFormat: view.getUint32(28, littleEndian),
      pixelWidth: view.getUint32(36, littleEndian),
      pixelHeight: view.getUint32(40, littleEndian),
      numberOfMipmapLevels: view.getUint32(56, littleEndian),
      bytesOfKeyValueData: view.getUint32(60, littleEndian),
    };

    let offset = 64;

    // Key Value Pairs of data start at byte offset 64
    // But the only known kvp is the API version, so skipping parsing.
    offset += data.bytesOfKeyValueData;

    for (let i = 0; i < data.numberOfMipmapLevels; i++) {
      const imageSize = view.getUint32(offset);
      offset += 4;

      mipmaps.push(view.buffer.slice(offset, imageSize));
      offset += imageSize;
    }

    return {
      data: {
        glInternalFormat: data.glInternalFormat,
        mipmaps,
        width: data.pixelWidth || 0,
        height: data.pixelHeight || 0,
        type: 'ktx',
      },
      premultiplyAlpha: false,
    };
  }

  async loadPVRData(buffer: ArrayBuffer): Promise<TextureData> {
    // pvr header length in 32 bits
    const pvrHeaderLength = 13;
    // for now only we only support: COMPRESSED_RGB_ETC1_WEBGL
    const pvrFormatEtc1 = 0x8d64;
    const pvrWidth = 7;
    const pvrHeight = 6;
    const pvrMipmapCount = 11;
    const pvrMetadata = 12;
    const arrayBuffer = buffer;
    const header = new Int32Array(arrayBuffer, 0, pvrHeaderLength);

    // @ts-expect-error Object possibly undefined
    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    const dataOffset = header[pvrMetadata] + 52;
    const pvrtcData = new Uint8Array(arrayBuffer, dataOffset);
    const mipmaps = [];
    const data = {
      pixelWidth: header[pvrWidth],
      pixelHeight: header[pvrHeight],
      numberOfMipmapLevels: header[pvrMipmapCount] || 0,
    };

    let offset = 0;
    let width = data.pixelWidth || 0;
    let height = data.pixelHeight || 0;

    for (let i = 0; i < data.numberOfMipmapLevels; i++) {
      const level = ((width + 3) >> 2) * ((height + 3) >> 2) * 8;
      const view = new Uint8Array(
        arrayBuffer,
        pvrtcData.byteOffset + offset,
        level,
      );

      mipmaps.push(view);
      offset += level;
      width = width >> 1;
      height = height >> 1;
    }

    return {
      data: {
        glInternalFormat: pvrFormatEtc1,
        mipmaps: mipmaps,
        width: data.pixelWidth || 0,
        height: data.pixelHeight || 0,
        type: 'pvr',
      },
      premultiplyAlpha: false,
    };
  }

  static override makeCacheKey(props: ImageTextureProps): string | false {
    const resolvedProps = ImageTexture.resolveDefaults(props);
    // ImageTextures sourced by ImageData are non-cacheable
    if (resolvedProps.src instanceof ImageData) {
      return false;
    }
    return `ImageTexture,${resolvedProps.src},${resolvedProps.premultiplyAlpha}`;
  }

  static override resolveDefaults(
    props: ImageTextureProps,
  ): Required<ImageTextureProps> {
    return {
      src: props.src ?? '',
      premultiplyAlpha: props.premultiplyAlpha ?? true,
    };
  }

  static z$__type__Props: ImageTextureProps;
}
