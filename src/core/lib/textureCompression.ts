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

import type { ImageTextureProps } from '../textures/ImageTexture.js';
import { type TextureData } from '../textures/Texture.js';

/**
 * Tests if the given location is a compressed texture container
 * @param url
 * @remarks
 * This function is used to determine if the given image url is a compressed
 * and only supports the following extensions: .ktx and .pvr
 * @returns
 */
export function isCompressedTextureContainer(
  props: ImageTextureProps,
): boolean {
  if (props.type === 'ktx' || props.type === 'pvr') {
    return true;
  }
  return /\.(ktx|pvr)$/.test(props.src as string);
}

/**
 * Loads a compressed texture container
 * @param url
 * @returns
 */
export const loadCompressedTexture = async (
  url: string,
  props: ImageTextureProps,
): Promise<TextureData> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch compressed texture: ${response.status} ${response.statusText}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    if (props.type === 'ktx' || url.indexOf('.ktx') !== -1) {
      return loadKTXData(arrayBuffer);
    }

    return loadPVRData(arrayBuffer);
  } catch (error) {
    throw new Error(`Failed to load compressed texture from ${url}: ${error}`);
  }
};

/**
 * Loads a KTX texture container and returns the texture data
 * @param buffer
 * @returns
 */
const loadKTXData = async (buffer: ArrayBuffer): Promise<TextureData> => {
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
      blockInfo: getCompressedBlockInfo(data.glInternalFormat),
      glInternalFormat: data.glInternalFormat,
      mipmaps,
      width: data.pixelWidth || 0,
      height: data.pixelHeight || 0,
      type: 'ktx',
    },
    premultiplyAlpha: false,
  };
};

/**
 * Loads a PVR texture container and returns the texture data
 * @param buffer
 * @returns
 */
const loadPVRData = async (buffer: ArrayBuffer): Promise<TextureData> => {
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
      blockInfo: getCompressedBlockInfo(pvrFormatEtc1),
      glInternalFormat: pvrFormatEtc1,
      mipmaps: mipmaps as unknown as ArrayBuffer[],
      width: data.pixelWidth || 0,
      height: data.pixelHeight || 0,
      type: 'pvr',
    },
    premultiplyAlpha: false,
  };
};

/**
 * Get compressed texture block info for a numeric WebGL internalFormat value.
 * Returns { width, height, bytes } or null if unknown.
 */
function getCompressedBlockInfo(internalFormat: number) {
  switch (internalFormat) {
    // --- S3TC / DXTn (WEBGL_compressed_texture_s3tc, sRGB variants) ---
    case 0x83f0: // COMPRESSED_RGB_S3TC_DXT1_EXT
    case 0x83f1: // COMPRESSED_RGBA_S3TC_DXT1_EXT
    case 0x8c4c: // COMPRESSED_SRGB_S3TC_DXT1_EXT
    case 0x8c4d: // COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT
      return { width: 4, height: 4, bytes: 8 };

    case 0x83f2: // COMPRESSED_RGBA_S3TC_DXT3_EXT
    case 0x83f3: // COMPRESSED_RGBA_S3TC_DXT5_EXT
    case 0x8c4e: // COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT
    case 0x8c4f: // COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT
      return { width: 4, height: 4, bytes: 16 };

    // --- ETC1 / ETC2 / EAC ---
    case 0x8d64: // COMPRESSED_RGB_ETC1_WEBGL
    case 0x9274: // COMPRESSED_RGB8_ETC2
    case 0x9275: // COMPRESSED_SRGB8_ETC2
    case 0x9270: // COMPRESSED_R11_EAC
      return { width: 4, height: 4, bytes: 8 };

    case 0x9278: // COMPRESSED_RGBA8_ETC2_EAC
    case 0x9279: // COMPRESSED_SRGB8_ALPHA8_ETC2_EAC
    case 0x9272: // COMPRESSED_RG11_EAC
      return { width: 4, height: 4, bytes: 16 };

    // --- PVRTC (WEBGL_compressed_texture_pvrtc) ---
    case 0x8c00: // COMPRESSED_RGB_PVRTC_4BPPV1_IMG
    case 0x8c02: // COMPRESSED_RGBA_PVRTC_4BPPV1_IMG
      return { width: 4, height: 4, bytes: 8 };

    case 0x8c01: // COMPRESSED_RGB_PVRTC_2BPPV1_IMG
    case 0x8c03: // COMPRESSED_RGBA_PVRTC_2BPPV1_IMG
      return { width: 8, height: 4, bytes: 8 };

    // --- ASTC (WEBGL_compressed_texture_astc) ---
    case 0x93b0: // COMPRESSED_RGBA_ASTC_4x4_KHR
    case 0x93d0: // COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR
      return { width: 4, height: 4, bytes: 16 };

    case 0x93b1: // 5x5
    case 0x93d1:
      return { width: 5, height: 5, bytes: 16 };

    case 0x93b2: // 6x6
    case 0x93d2:
      return { width: 6, height: 6, bytes: 16 };

    case 0x93b3: // 8x8
    case 0x93d3:
      return { width: 8, height: 8, bytes: 16 };

    case 0x93b4: // 10x10
    case 0x93d4:
      return { width: 10, height: 10, bytes: 16 };

    case 0x93b5: // 12x12
    case 0x93d5:
      return { width: 12, height: 12, bytes: 16 };

    default:
      console.warn('Unknown or unsupported compressed format:', internalFormat);
      return { width: 1, height: 1, bytes: 4 };
  }
}
