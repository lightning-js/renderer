export type RGBA = [r: number, g: number, b: number, a: number];
export const normalizeARGB = (argb: number): RGBA => {
  let r = ((argb / 65536) | 0) % 256;
  let g = ((argb / 256) | 0) % 256;
  let b = argb % 256;
  let a = (argb / 16777216) | 0;
  return [r / 255, g / 255, b / 255, a / 255];
};

export const getRgbaComponents = (argb: number): RGBA => {
  let r = ((argb / 65536) | 0) % 256;
  let g = ((argb / 256) | 0) % 256;
  let b = argb % 256;
  let a = (argb / 16777216) | 0;
  return [r, g, b, a];
};

export const norm = (argb: number): number => {
  let r = ((argb / 65536) | 0) % 256;
  let g = ((argb / 256) | 0) % 256;
  let b = argb % 256;
  let a = (argb / 16777216) | 0;
  const rgba: RGBA = [r / 255, g / 255, b / 255, a / 255];

  rgba[0] = Math.max(0, Math.min(255, rgba[0]));
  rgba[1] = Math.max(0, Math.min(255, rgba[1]));
  rgba[2] = Math.max(0, Math.min(255, rgba[2]));
  rgba[3] = Math.max(0, Math.min(255, rgba[3]));
  let v =
    ((rgba[3] | 0) << 24) +
    ((rgba[0] | 0) << 16) +
    ((rgba[1] | 0) << 8) +
    (rgba[2] | 0);
  if (v < 0) {
    v = 0xffffffff + v + 1;
  }
  return v;
};

export const getArgbNumber = (rgba: RGBA): number => {
  rgba[0] = Math.max(0, Math.min(255, rgba[0]));
  rgba[1] = Math.max(0, Math.min(255, rgba[1]));
  rgba[2] = Math.max(0, Math.min(255, rgba[2]));
  rgba[3] = Math.max(0, Math.min(255, rgba[3]));
  let v =
    ((rgba[3] | 0) << 24) +
    ((rgba[0] | 0) << 16) +
    ((rgba[1] | 0) << 8) +
    (rgba[2] | 0);
  if (v < 0) {
    v = 0xffffffff + v + 1;
  }
  return v;
};
