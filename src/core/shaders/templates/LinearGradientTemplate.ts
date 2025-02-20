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

import type { CoreShaderType } from '../../renderers/CoreShaderNode.js';

/**
 * Properties of the {@link LinearGradient} shader
 */
export interface LinearGradientProps {
  /**
   * Array of colors to be used in the LinearGradient shader
   *
   * @default [0xff000000, 0xffffffff]
   */
  colors: number[];
  /**
   * Angle of the LinearGradient shader, Angle in Radians
   *
   * @default 0
   */
  angle: number;
  /**
   * Array of color stops
   */
  stops: number[];
}

export const LinearGradientTemplate: CoreShaderType<LinearGradientProps> = {
  props: {
    colors: {
      default: [0x000000ff, 0xffffffff],
      resolve(value) {
        if (value !== undefined && value.length > 0) {
          return value;
        }
        return ([] as number[]).concat(this.default);
      },
    },
    stops: {
      default: [0, 1],
      resolve(value, props) {
        if (value !== undefined && value.length === props.colors.length) {
          return value;
        }
        if (value === undefined) {
          value = [];
        }
        const len = props.colors.length;
        for (let i = 0; i < len; i++) {
          value[i] = i * (1 / (len - 1));
        }
        return value;
      },
    },
    angle: 0,
  },
};
