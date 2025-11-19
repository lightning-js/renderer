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
import { type CompressedData, type TextureData } from '../textures/Texture.js';
import type { WebGlContextWrapper } from './WebGlContextWrapper.js';

export type UploadCompressedTextureFunction = (
  glw: WebGlContextWrapper,
  texture: WebGLTexture,
  data: CompressedData,
) => void;

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

const PVR_MAGIC = 0x03525650; // 'PVR3' in little-endian
const PVR_TO_GL_INTERNAL_FORMAT: Record<string, number> = {
  0: 0x8c01,
  1: 0x8c03,
  2: 0x8c00,
  3: 0x8c02, // PVRTC1
  6: 0x8d64, // ETC1
  7: 0x83f0,
  8: 0x83f2,
  9: 0x83f2,
  10: 0x83f3,
  11: 0x83f3, // DXT variants
};
const ASTC_MAGIC = 0x5ca1ab13;

const ASTC_TO_GL_INTERNAL_FORMAT: Record<string, number> = {
  '4x4': 0x93b0, // COMPRESSED_RGBA_ASTC_4x4_KHR
  '5x5': 0x93b1, // COMPRESSED_RGBA_ASTC_5x5_KHR
  '6x6': 0x93b2, // COMPRESSED_RGBA_ASTC_6x6_KHR
  '8x8': 0x93b3, // COMPRESSED_RGBA_ASTC_8x8_KHR
  '10x10': 0x93b4, // COMPRESSED_RGBA_ASTC_10x10_KHR
  '12x12': 0x93b5, // COMPRESSED_RGBA_ASTC_12x12_KHR
};

// KTX file identifier
const KTX_IDENTIFIER = [
  0xab, 0x4b, 0x54, 0x58, 0x20, 0x31, 0x31, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a,
];
/**
 * Loads a compressed texture container
 * @param url
 * @returns
 */
export const loadCompressedTexture = async (
  url: string,
): Promise<TextureData> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch compressed texture: ${response.status} ${response.statusText}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();

    // Ensure we have enough data to check magic numbers
    if (arrayBuffer.byteLength < 16) {
      throw new Error(
        `File too small to be a valid compressed texture (${arrayBuffer.byteLength} bytes). Expected at least 16 bytes for header inspection.`,
      );
    }

    const view = new DataView(arrayBuffer);
    const magic = view.getUint32(0, true);

    if (magic === PVR_MAGIC) {
      return loadPVR(view);
    }

    if (magic === ASTC_MAGIC) {
      return loadASTC(view);
    }

    let isKTX = true;

    for (let i = 0; i < KTX_IDENTIFIER.length; i++) {
      if (view.getUint8(i) !== KTX_IDENTIFIER[i]) {
        isKTX = false;
        break;
      }
    }

    if (isKTX === true) {
      return loadKTX(view);
    } else {
      throw new Error('Unrecognized compressed texture format');
    }
  } catch (error) {
    throw new Error(`Failed to load compressed texture from ${url}: ${error}`);
  }
};

function readUint24(view: DataView, offset: number) {
  return (
    view.getUint8(offset) +
    (view.getUint8(offset + 1) << 8) +
    (view.getUint8(offset + 2) << 16)
  );
}

/**
 * Loads an ASTC texture container and returns the texture data
 * @param view
 * @returns
 */
const loadASTC = async function (view: DataView): Promise<TextureData> {
  const blockX = view.getUint8(4);
  const blockY = view.getUint8(5);
  const sizeX = readUint24(view, 7);
  const sizeY = readUint24(view, 10);

  if (sizeX === 0 || sizeY === 0) {
    throw new Error(`Invalid ASTC texture dimensions: ${sizeX}x${sizeY}`);
  }
  const expected = Math.ceil(sizeX / blockX) * Math.ceil(sizeY / blockY) * 16;
  const dataSize = view.byteLength - 16;
  if (expected !== dataSize) {
    throw new Error(
      `Invalid ASTC texture data size: expected ${expected}, got ${dataSize}`,
    );
  }

  const internalFormat = ASTC_TO_GL_INTERNAL_FORMAT[`${blockX}x${blockY}`];
  if (internalFormat === undefined) {
    throw new Error(`Unsupported ASTC block size: ${blockX}x${blockY}`);
  }

  const buffer = view.buffer as ArrayBuffer;

  const mipmaps: ArrayBuffer[] = [];
  mipmaps.push(buffer.slice(16));

  return {
    data: {
      blockInfo: blockInfoMap[internalFormat]!,
      glInternalFormat: internalFormat,
      mipmaps,
      width: sizeX,
      height: sizeY,
      type: 'astc',
    },
    premultiplyAlpha: false,
  };
};

const uploadASTC = function (
  glw: WebGlContextWrapper,
  texture: WebGLTexture,
  data: CompressedData,
) {
  if (glw.getExtension('WEBGL_compressed_texture_astc') === null) {
    throw new Error('ASTC compressed textures not supported by this device');
  }

  glw.bindTexture(texture);

  const { glInternalFormat, mipmaps, width, height } = data;

  const view = new Uint8Array(mipmaps[0]!);

  glw.compressedTexImage2D(0, glInternalFormat, width, height, 0, view);

  // ASTC textures MUST use no mipmaps unless stored
  glw.texParameteri(glw.TEXTURE_WRAP_S, glw.CLAMP_TO_EDGE);
  glw.texParameteri(glw.TEXTURE_WRAP_T, glw.CLAMP_TO_EDGE);
  glw.texParameteri(glw.TEXTURE_MAG_FILTER, glw.LINEAR);
  glw.texParameteri(glw.TEXTURE_MIN_FILTER, glw.LINEAR);
};
/**
 * Loads a KTX texture container and returns the texture data
 * @param view
 * @returns
 */
const loadKTX = async function (view: DataView): Promise<TextureData> {
  const endianness = view.getUint32(12, true);
  const littleEndian = endianness === 0x04030201;
  if (littleEndian === false && endianness !== 0x01020304) {
    throw new Error('Invalid KTX endianness value');
  }

  const glType = view.getUint32(16, littleEndian);
  const glFormat = view.getUint32(24, littleEndian);
  if (glType !== 0 || glFormat !== 0) {
    throw new Error(
      `KTX texture is not compressed (glType: ${glType}, glFormat: ${glFormat})`,
    );
  }

  const glInternalFormat = view.getUint32(28, littleEndian);
  if (blockInfoMap[glInternalFormat] === undefined) {
    throw new Error(
      `Unsupported KTX compressed texture format: 0x${glInternalFormat.toString(
        16,
      )}`,
    );
  }

  const width = view.getUint32(36, littleEndian);
  const height = view.getUint32(40, littleEndian);
  if (width === 0 || height === 0) {
    throw new Error(`Invalid KTX texture dimensions: ${width}x${height}`);
  }

  const mipmapLevels = view.getUint32(56, littleEndian);
  if (mipmapLevels === 0) {
    throw new Error('KTX texture has no mipmap levels');
  }

  const bytesOfKeyValueData = view.getUint32(60, littleEndian);
  const mipmaps: ArrayBuffer[] = [];
  const buffer = view.buffer as ArrayBuffer;
  let offset = 64 + bytesOfKeyValueData;

  if (offset > view.byteLength) {
    throw new Error('Invalid KTX file: key/value data exceeds file size');
  }

  for (let i = 0; i < mipmapLevels; i++) {
    const imageSize = view.getUint32(offset, littleEndian);
    offset += 4;

    const end = offset + imageSize;

    mipmaps.push(buffer.slice(offset, end));
    offset = end;
    if (offset % 4 !== 0) {
      offset += 4 - (offset % 4);
    }
  }

  return {
    data: {
      blockInfo: blockInfoMap[glInternalFormat]!,
      glInternalFormat: glInternalFormat,
      mipmaps,
      width: width,
      height: height,
      type: 'ktx',
    },
    premultiplyAlpha: false,
  };
};

const uploadKTX = function (
  glw: WebGlContextWrapper,
  texture: WebGLTexture,
  data: CompressedData,
) {
  const { glInternalFormat, mipmaps, width, height, blockInfo } = data;

  glw.bindTexture(texture);

  const blockWidth = blockInfo.width;
  const blockHeight = blockInfo.height;
  let w = width;
  let h = height;

  for (let i = 0; i < mipmaps.length; i++) {
    let view = new Uint8Array(mipmaps[i]!);

    const uploadW = Math.ceil(w / blockWidth) * blockWidth;
    const uploadH = Math.ceil(h / blockHeight) * blockHeight;

    const expectedBytes =
      Math.ceil(w / blockWidth) * Math.ceil(h / blockHeight) * blockInfo.bytes;

    if (view.byteLength < expectedBytes) {
      const padded = new Uint8Array(expectedBytes);
      padded.set(view);
      view = padded;
    }

    glw.compressedTexImage2D(i, glInternalFormat, uploadW, uploadH, 0, view);

    w = Math.max(1, w >> 1);
    h = Math.max(1, h >> 1);
  }

  glw.texParameteri(glw.TEXTURE_WRAP_S, glw.CLAMP_TO_EDGE);
  glw.texParameteri(glw.TEXTURE_WRAP_T, glw.CLAMP_TO_EDGE);
  glw.texParameteri(glw.TEXTURE_MAG_FILTER, glw.LINEAR);
  glw.texParameteri(
    glw.TEXTURE_MIN_FILTER,
    mipmaps.length > 1 ? glw.LINEAR_MIPMAP_LINEAR : glw.LINEAR,
  );
};

function pvrtcMipSize(width: number, height: number, bpp: 2 | 4) {
  const minW = bpp === 2 ? 16 : 8;
  const minH = 8;
  const w = Math.max(width, minW);
  const h = Math.max(height, minH);
  return (w * h * bpp) / 8;
}

const loadPVR = async function (view: DataView): Promise<TextureData> {
  const pixelFormatLow = view.getUint32(8, true);
  const internalFormat = PVR_TO_GL_INTERNAL_FORMAT[pixelFormatLow];

  if (internalFormat === undefined) {
    throw new Error(
      `Unsupported PVR pixel format: 0x${pixelFormatLow.toString(16)}`,
    );
  }

  const height = view.getInt32(24, true);
  const width = view.getInt32(28, true);

  // validate dimensions
  if (width === 0 || height === 0) {
    throw new Error(`Invalid PVR texture dimensions: ${width}x${height}`);
  }
  const mipmapLevels = view.getInt32(44, true);
  const metadataSize = view.getUint32(48, true);
  const buffer = view.buffer as ArrayBuffer;

  let offset = 52 + metadataSize;
  if (offset > buffer.byteLength) {
    throw new Error('Invalid PVR file: metadata exceeds file size');
  }

  const mipmaps: ArrayBuffer[] = [];

  const block = blockInfoMap[internalFormat]!;

  for (let i = 0; i < mipmapLevels; i++) {
    const declaredSize = view.getUint32(offset, true);
    const max = buffer.byteLength - (offset + 4);

    if (declaredSize > 0 && declaredSize <= max) {
      offset += 4;
      const start = offset;
      const end = offset + declaredSize;

      mipmaps.push(buffer.slice(start, end));
      offset = end;
      offset = (offset + 3) & ~3; // align to 4 bytes
      continue;
    }

    if (
      pixelFormatLow === 0 ||
      pixelFormatLow === 1 ||
      pixelFormatLow === 2 ||
      pixelFormatLow === 3
    ) {
      const bpp = pixelFormatLow === 0 || pixelFormatLow === 1 ? 2 : 4;
      const computed = pvrtcMipSize(width >> i, height >> i, bpp);

      mipmaps.push(buffer.slice(offset, offset + computed));
      offset += computed;
      offset = (offset + 3) & ~3; // align to 4 bytes
      continue;
    }

    if (block !== undefined) {
      const blockW = Math.ceil((width >> i) / block.width);
      const blockH = Math.ceil((height >> i) / block.height);
      const computed = blockW * blockH * block.bytes;

      mipmaps.push(buffer.slice(offset, offset + computed));
      offset += computed;
      offset = (offset + 3) & ~3;
    }
  }

  return {
    data: {
      blockInfo: blockInfoMap[internalFormat]!,
      glInternalFormat: internalFormat,
      mipmaps,
      width: width,
      height: height,
      type: 'pvr',
    },
    premultiplyAlpha: false,
  };
};

const uploadPVR = function (
  glw: WebGlContextWrapper,
  texture: WebGLTexture,
  data: CompressedData,
) {
  const { glInternalFormat, mipmaps, width, height } = data;

  glw.bindTexture(texture);

  let w = width;
  let h = height;

  for (let i = 0; i < mipmaps.length; i++) {
    glw.compressedTexImage2D(
      i,
      glInternalFormat,
      w,
      h,
      0,
      new Uint8Array(mipmaps[i]!),
    );

    w = Math.max(1, w >> 1);
    h = Math.max(1, h >> 1);
  }

  glw.texParameteri(glw.TEXTURE_WRAP_S, glw.CLAMP_TO_EDGE);
  glw.texParameteri(glw.TEXTURE_WRAP_T, glw.CLAMP_TO_EDGE);
  glw.texParameteri(glw.TEXTURE_MAG_FILTER, glw.LINEAR);
  glw.texParameteri(
    glw.TEXTURE_MIN_FILTER,
    mipmaps.length > 1 ? glw.LINEAR_MIPMAP_LINEAR : glw.LINEAR,
  );
};

type BlockInfo = {
  width: number;
  height: number;
  bytes: number;
};

// Predefined block info for common compressed texture formats
const BLOCK_4x4x8: BlockInfo = { width: 4, height: 4, bytes: 8 };
const BLOCK_4x4x16: BlockInfo = { width: 4, height: 4, bytes: 16 };
const BLOCK_5x5x16: BlockInfo = { width: 5, height: 5, bytes: 16 };
const BLOCK_6x6x16: BlockInfo = { width: 6, height: 6, bytes: 16 };
const BLOCK_8x4x8: BlockInfo = { width: 8, height: 4, bytes: 8 };
const BLOCK_8x8x16: BlockInfo = { width: 8, height: 8, bytes: 16 };
const BLOCK_10x10x16: BlockInfo = { width: 10, height: 10, bytes: 16 };
const BLOCK_12x12x16: BlockInfo = { width: 12, height: 12, bytes: 16 };

// Map of GL internal formats to their corresponding block info
export const blockInfoMap: { [key: number]: BlockInfo } = {
  // S3TC / DXTn (WEBGL_compressed_texture_s3tc, sRGB variants)
  0x83f0: BLOCK_4x4x8, // COMPRESSED_RGB_S3TC_DXT1_EXT
  0x83f1: BLOCK_4x4x8, // COMPRESSED_RGBA_S3TC_DXT1_EXT
  0x83f2: BLOCK_4x4x16, // COMPRESSED_RGBA_S3TC_DXT3_EXT
  0x83f3: BLOCK_4x4x16, // COMPRESSED_RGBA_S3TC_DXT5_EXT

  // ETC1 / ETC2 / EAC
  0x8d64: BLOCK_4x4x8, // COMPRESSED_RGB_ETC1_WEBGL
  0x9274: BLOCK_4x4x8, // COMPRESSED_RGB8_ETC2
  0x9275: BLOCK_4x4x8, // COMPRESSED_SRGB8_ETC2
  0x9278: BLOCK_4x4x16, // COMPRESSED_RGBA8_ETC2_EAC
  0x9279: BLOCK_4x4x16, // COMPRESSED_SRGB8_ALPHA8_ETC2_EAC

  // PVRTC (WEBGL_compressed_texture_pvrtc)
  0x8c00: BLOCK_4x4x8, // COMPRESSED_RGB_PVRTC_4BPPV1_IMG
  0x8c02: BLOCK_4x4x8, // COMPRESSED_RGBA_PVRTC_4BPPV1_IMG
  0x8c01: BLOCK_8x4x8, // COMPRESSED_RGB_PVRTC_2BPPV1_IMG
  0x8c03: BLOCK_8x4x8,

  // ASTC (WEBGL_compressed_texture_astc)
  0x93b0: BLOCK_4x4x16, // COMPRESSED_RGBA_ASTC_4x4_KHR
  0x93d0: BLOCK_4x4x16, // COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR
  0x93b1: BLOCK_5x5x16, // 5x5
  0x93d1: BLOCK_5x5x16,
  0x93b2: BLOCK_6x6x16, // 6x6
  0x93d2: BLOCK_6x6x16,
  0x93b3: BLOCK_8x8x16, // 8x8
  0x93d3: BLOCK_8x8x16,
  0x93b4: BLOCK_10x10x16, // 10x10
  0x93d4: BLOCK_10x10x16,
  0x93b5: BLOCK_12x12x16, // 12x12
  0x93d5: BLOCK_12x12x16,
};

export const uploadCompressedTexture: Record<
  string,
  UploadCompressedTextureFunction
> = {
  ktx: uploadKTX,
  pvr: uploadPVR,
  astc: uploadASTC,
};
