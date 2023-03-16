export const normalizeARGB = (argb) => {
  const r = ((argb / 65536) | 0) % 256;
  const g = ((argb / 256) | 0) % 256;
  const b = argb % 256;
  const a = (argb / 16777216) | 0;
  return [r / 255, g / 255, b / 255, a / 255];
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
  Math.hypot = (...args: number[]) => {
    let y = 0,
      i = args.length;
    while (i--) {
      y += args[i] * args[i];
    }
    return Math.sqrt(y);
  };
