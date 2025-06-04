import type { Platform } from '../platforms/Platform.js';

export interface CreateImageBitmapSupport {
  basic: boolean; // Supports createImageBitmap(image)
  options: boolean; // Supports createImageBitmap(image, options)
  full: boolean; // Supports createImageBitmap(image, sx, sy, sw, sh, options)
}

export async function validateCreateImageBitmap(
  platform: Platform,
): Promise<CreateImageBitmapSupport> {
  // Test if createImageBitmap is supported using a simple 1x1 PNG image
  // prettier-ignore
  const pngBinaryData = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47,
      0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
      0x00, 0x00, 0x00, 0x0d, // IHDR chunk length
      0x49, 0x48, 0x44, 0x52, // "IHDR" chunk type
      0x00, 0x00, 0x00, 0x01, // Width: 1
      0x00, 0x00, 0x00, 0x01, // Height: 1
      0x01,                   // Bit depth: 1
      0x03,                   // Color type: Indexed
      0x00,                   // Compression method: Deflate
      0x00,                   // Filter method: None
      0x00,                   // Interlace method: None
      0x25, 0xdb, 0x56, 0xca, // CRC for IHDR
      0x00, 0x00, 0x00, 0x03, // PLTE chunk length
      0x50, 0x4c, 0x54, 0x45, // "PLTE" chunk type
      0x00, 0x00, 0x00,       // Palette entry: Black
      0xa7, 0x7a, 0x3d, 0xda, // CRC for PLTE
      0x00, 0x00, 0x00, 0x01, // tRNS chunk length
      0x74, 0x52, 0x4e, 0x53, // "tRNS" chunk type
      0x00,                   // Transparency for black: Fully transparent
      0x40, 0xe6, 0xd8, 0x66, // CRC for tRNS
      0x00, 0x00, 0x00, 0x0a, // IDAT chunk length
      0x49, 0x44, 0x41, 0x54, // "IDAT" chunk type
      0x08, 0xd7,             // Deflate header
      0x63, 0x60, 0x00, 0x00,
      0x00, 0x02, 0x00, 0x01, // Zlib-compressed data
      0xe2, 0x21, 0xbc, 0x33, // CRC for IDAT
      0x00, 0x00, 0x00, 0x00, // IEND chunk length
      0x49, 0x45, 0x4e, 0x44, // "IEND" chunk type
      0xae, 0x42, 0x60, 0x82, // CRC for IEND
    ]);

  const support: CreateImageBitmapSupport = {
    basic: false,
    options: false,
    full: false,
  };

  // Test basic createImageBitmap support
  const blob = new Blob([pngBinaryData], { type: 'image/png' });
  const bitmap = await platform.createImageBitmap(blob);
  bitmap.close?.();
  support.basic = true;

  // Test createImageBitmap with options support
  try {
    const options = { premultiplyAlpha: 'none' as const };
    const bitmapWithOptions = await platform.createImageBitmap(blob, options);
    bitmapWithOptions.close?.();
    support.options = true;
  } catch (e) {
    /* ignore */
  }

  // Test createImageBitmap with full options support
  try {
    const bitmapWithFullOptions = await platform.createImageBitmap(
      blob,
      0,
      0,
      1,
      1,
      {
        premultiplyAlpha: 'none',
      },
    );
    bitmapWithFullOptions.close?.();
    support.full = true;
  } catch (e) {
    /* ignore */
  }

  return support;
}
