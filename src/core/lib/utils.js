export const normalizeARGB = (argb) => {
  let r = ((argb / 65536) | 0) % 256;
  let g = ((argb / 256) | 0) % 256;
  let b = argb % 256;
  let a = (argb / 16777216) | 0;
  return [r / 255, g / 255, b / 255, a / 255];
};

export const getRgbaComponents = (argb) => {
  let r = ((argb / 65536) | 0) % 256;
  let g = ((argb / 256) | 0) % 256;
  let b = argb % 256;
  let a = (argb / 16777216) | 0;
  return [r, g, b, a];
};

export const norm = (argb) => {
  let r = ((argb / 65536) | 0) % 256;
  let g = ((argb / 256) | 0) % 256;
  let b = argb % 256;
  let a = (argb / 16777216) | 0;
  const rgba = [r / 255, g / 255, b / 255, a / 255];

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

export const getArgbNumber = (rgba) => {
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

export const EPSILON = 0.000001;
export let ARRAY_TYPE =
  typeof Float32Array !== 'undefined' ? Float32Array : Array;
export const RANDOM = Math.random;
export const ANGLE_ORDER = 'zyx';
const degree = Math.PI / 180;

export const setMatrixArrayType = (type) => {
  ARRAY_TYPE = type;
};

export const toRadian = (a) => {
  return a * degree;
};

export const equals = (a, b) => {
  return Math.abs(a - b) <= EPSILON * Math.max(1.0, Math.abs(a), Math.abs(b));
};

export const rand = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

if (!Math.hypot)
  Math.hypot = () => {
    let y = 0,
      i = arguments.length;
    while (i--) {
      y += arguments[i] * arguments[i];
    }
    return Math.sqrt(y);
  };
