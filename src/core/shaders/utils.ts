/*
 * Copyright 2023 Comcast Cable Communications Management, LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
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
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { assertTruthy } from '../../utils.js';
import type { Vec4 } from '../renderers/webgl/internal/ShaderUtils.js';

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
