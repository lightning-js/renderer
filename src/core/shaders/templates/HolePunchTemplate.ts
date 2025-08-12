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
import { validateArrayLength4 } from '../utils.js';

/**
 * Properties of the {@link HolePunch} shader
 */
export interface HolePunchProps {
  /**
   * X position where the hole punch starts
   */
  x: number;
  /**
   * Y position where the hole punch starts
   */
  y: number;
  /**
   * Width of the hole punch
   */
  w: number;
  /**
   * height of the hole punch
   *
   * @remarks if not defined uses the width value
   */
  h: number;
  /**
   * Corner radius in pixels, to cut out of the corners of the hole punch
   *
   * @remarks
   * You can input an array with a length of up to four or a number.
   *
   * array length 4:
   * [topLeft, topRight, bottomRight, bottomLeft]
   *
   * array length 2:
   * [20, 40] -> [20(topLeft), 40(topRight), 20(bottomRight), 40(bottomLeft)]
   *
   * array length 3:
   * [20, 40, 60] -> [20(topLeft), 40(topRight), 60(bottomRight), 20(bottomLeft)]
   *
   * number:
   * 30 -> [30, 30, 30, 30]
   *
   * @default -1
   */
  radius: number | number[];
}

export const HolePunchTemplate: CoreShaderType<HolePunchProps> = {
  props: {
    x: 0,
    y: 0,
    w: 50,
    h: 50,
    radius: {
      default: [0, 0, 0, 0],
      resolve(value) {
        if (value !== undefined) {
          return validateArrayLength4(value);
        }
        return ([] as number[]).concat(this.default);
      },
    },
  },
};
