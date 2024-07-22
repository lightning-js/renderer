import type { DynamicShaderProps } from '../DynamicShader.js';
import type { ShaderEffectValueMap } from './ShaderEffect.js';

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
export const colorToFloat32Array = (argb: number) => {
  const col = getRgbaComponentsNormalized(argb);
  /* eslint-disable @typescript-eslint/no-non-null-assertion -- getRgbaComponentsNormalized has a constant array size */
  col[0]! *= col[3]!;
  col[1]! *= col[3]!;
  col[2]! *= col[3]!;
  /* eslint-enable */
  return col;
};

const getRgbaComponentsNormalized = (argb: number): number[] => {
  const r = ((argb / 65536) | 0) % 256;
  const g = ((argb / 256) | 0) % 256;
  const b = argb % 256;
  const a = (argb / 16777216) | 0;
  return [r / 255, g / 255, b / 255, a / 255];
};

export const updateShaderEffectColor = (values: ShaderEffectValueMap) => {
  if (values.programValue === undefined) {
    values.programValue = new Float32Array(4);
  }
  const rgba = values.value as number;
  const floatArray = values.programValue as Float32Array;
  floatArray[0] = (rgba >>> 24) / 255;
  floatArray[1] = ((rgba >>> 16) & 0xff) / 255;
  floatArray[2] = ((rgba >>> 8) & 0xff) / 255;
  floatArray[3] = (rgba & 0xff) / 255;
};

export const updateFloat32ArrayLength2 = (values: ShaderEffectValueMap) => {
  const validatedValue = (values.validatedValue || values.value) as number[];
  if (values.programValue instanceof Float32Array) {
    const floatArray = values.programValue;
    floatArray[0] = validatedValue[0]!;
    floatArray[1] = validatedValue[1]!;
  } else {
    values.programValue = new Float32Array(validatedValue);
  }
};

export const updateFloat32ArrayLength4 = (values: ShaderEffectValueMap) => {
  const validatedValue = (values.validatedValue || values.value) as number[];
  if (values.programValue instanceof Float32Array) {
    const floatArray = values.programValue;
    floatArray[0] = validatedValue[0]!;
    floatArray[1] = validatedValue[1]!;
    floatArray[2] = validatedValue[1]!;
    floatArray[3] = validatedValue[1]!;
  } else {
    values.programValue = new Float32Array(validatedValue);
  }
};

export const updateFloat32ArrayLengthN = (values: ShaderEffectValueMap) => {
  const validatedValue = (values.validatedValue || values.value) as number[];
  if (values.programValue instanceof Float32Array) {
    const len = validatedValue.length;
    const programValue = values.programValue;
    for (let i = 0; i < len; i++) {
      programValue[i] = validatedValue[i]!;
    }
  } else {
    values.programValue = new Float32Array(validatedValue);
  }
};

export const validateArrayLength4 = (value: number | number[]): number[] => {
  const isArray = Array.isArray(value);
  if (!isArray) {
    return [value, value, value, value];
  } else if (isArray && value.length === 4) {
    return value;
  } else if (isArray && value.length === 2) {
    return [value[0]!, value[1]!, value[0]!, value[1]!];
  } else if (isArray && value.length === 3) {
    return [value[0]!, value[1]!, value[2]!, value[0]!];
  }
  return [value[0]!, value[0]!, value[0]!, value[0]!];
};

export const updateWebSafeRadius = (
  values: ShaderEffectValueMap,
  shaderProps?: DynamicShaderProps,
) => {
  if (values.programValue === undefined) {
    values.programValue = new Float32Array(4);
  }
  const programValue = values.programValue as Float32Array;
  const validatedValue = (values.validatedValue || values.value) as number[];
  if (shaderProps === undefined && values.$dimensions === undefined) {
    programValue[0] = validatedValue[0]!;
    programValue[1] = validatedValue[1]!;
    programValue[2] = validatedValue[2]!;
    programValue[3] = validatedValue[3]!;
    return;
  }

  let storedDimensions = values.$dimensions;
  if (shaderProps !== undefined) {
    const { $dimensions } = shaderProps;
    if (
      storedDimensions !== undefined &&
      (storedDimensions.width === $dimensions!.width ||
        storedDimensions.height === $dimensions!.height)
    ) {
      return;
    }
    if (storedDimensions === undefined) {
      storedDimensions = {
        width: $dimensions?.width as number,
        height: $dimensions?.height as number,
      };
      values.$dimensions = storedDimensions;
    }
  }

  const { width, height } = storedDimensions!;
  const [r0, r1, r2, r3] = validatedValue;
  const factor = Math.min(
    Math.min(
      Math.min(
        width / Math.max(width, r0! + r1!),
        width / Math.max(width, r2! + r3!),
      ),
      Math.min(
        height / Math.max(height, r0! + r2!),
        height / Math.max(height, r1! + r3!),
      ),
    ),
    1,
  );

  programValue[0] = r0! * factor;
  programValue[1] = r1! * factor;
  programValue[2] = r2! * factor;
  programValue[3] = r3! * factor;
};
