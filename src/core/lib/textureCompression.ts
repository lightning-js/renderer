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

import { type TextureData } from '../textures/Texture.js';

/**
 * Checks if the texture at the given URL is in a compressed format (KTX or PVR).
 *
 * @param url - The URL of the texture to check.
 * @returns A promise that resolves to the ArrayBuffer of the texture if it is in a compressed format, or null otherwise.
 */
export async function isCompressedTextureContainer(
  url: string,
): Promise<ArrayBuffer | null> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const compressedFormat = getCompressedFormat(arrayBuffer);
  if (compressedFormat === 'KTX' || compressedFormat === 'PVR') {
    return arrayBuffer;
  }
  return null;
}

/**
 * Determines the compressed texture format of the given ArrayBuffer.
 *
 * This function checks the magic numbers of the buffer to identify if it is
 * in KTX or PVR format. If neither format is detected, it returns "UNKNOWN".
 *
 * @param buffer - The ArrayBuffer containing the texture data.
 * @returns A string representing the compressed format: "KTX", "PVR", or "UNKNOWN".
 */
function getCompressedFormat(buffer: ArrayBuffer): string {
  const dataView = new DataView(buffer);
  // Check for KTX magic number
  const KTX_MAGIC = [
    0xab, 0x4b, 0x54, 0x58, 0x20, 0x31, 0x31, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a,
  ];
  let isKTX = true;
  for (let i = 0; i < KTX_MAGIC.length; i++) {
    if (dataView.getUint8(i) !== KTX_MAGIC[i]) {
      isKTX = false;
      break;
    }
  }
  if (isKTX) return 'KTX';

  // Check for PVR magic number (first 4 bytes should be 0x03525650 in little-endian)
  const PVR_MAGIC = 0x03525650;
  const magic = dataView.getUint32(0, true); // little-endian
  if (magic === PVR_MAGIC) return 'PVR';

  return 'UNKNOWN';
}

/**
 * Loads a compressed texture from the given buffer.
 *
 * This function determines the compressed format of the texture data
 * and loads it accordingly. Currently, it supports KTX and PVR formats.
 *
 * @param buffer - The ArrayBuffer containing the compressed texture data.
 * @returns A promise that resolves to the loaded TextureData.
 * @throws Will throw an error if the texture format is unsupported.
 */
export const loadCompressedTexture = async (
  buffer: ArrayBuffer,
): Promise<TextureData> => {
  const compressedFormat = getCompressedFormat(buffer);
  if (compressedFormat === 'KTX') {
    return loadKTXData(buffer);
  }
  if (compressedFormat === 'PVR') {
    return loadPVRData(buffer);
  }
  throw new Error('Unsupported texture format');
};

/**
 * Loads a KTX texture container and returns the texture data
 * @param buffer
 * @returns
 */
const loadKTXData = async (buffer: ArrayBuffer): Promise<TextureData> => {
  const view = new DataView(buffer);
  const littleEndian = view.getUint32(12) === 16909060 ? true : false;
  const mipmaps: ArrayBuffer[] = [];

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
  const mipmaps: Uint8Array[] = [];
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
};
