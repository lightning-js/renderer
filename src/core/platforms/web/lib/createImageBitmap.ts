export const createImageBitmap = (
  blob: ImageBitmapSource,
  sxOrOptions?: number | ImageBitmapOptions,
  sy?: number,
  sw?: number,
  sh?: number,
  options?: ImageBitmapOptions,
): Promise<ImageBitmap> => {
  if (typeof sxOrOptions === 'number') {
    return createImageBitmap(
      blob,
      sxOrOptions,
      sy ?? 0,
      sw ?? 0,
      sh ?? 0,
      options,
    );
  } else {
    return createImageBitmap(blob, sxOrOptions);
  }
};
