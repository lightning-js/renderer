import { assertTruthy } from '../../../utils.js';
import type { Vec4 } from '../../renderers/webgl/internal/ShaderUtils.js';

export const validateArrayLength4 = (value: number | number[]): Vec4 => {
  if (!Array.isArray(value)) {
    return [value, value, value, value];
  }
  assertTruthy(value);
  if (value.length === 4) {
    return value as Vec4;
  }
  if (value.length === 3) {
    value[3] = value[0]!;
    return value as Vec4;
  }
  if (value.length === 2) {
    value[2] = value[0]!;
    value[3] = value[1]!;
    return value as Vec4;
  }
  value[0] = value[0] || 0;
  value[1] = value[0];
  value[2] = value[0];
  value[3] = value[0];
  return value as Vec4;
};

export type PrefixedType<T, P extends string | undefined = undefined> = {
  [Key in keyof T as P extends string ? `${P}-${string & Key}` : Key]: T[Key];
};
