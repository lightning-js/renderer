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
import type { Vec4 } from '../../renderers/webgl/internal/ShaderUtils.js';
import { validateArrayLength4 } from './shaderUtils.js';

/**
 * Properties of the {@link RoundedRectangle} shader
 */
export interface RoundedProps {
  /**
   * Corner radius, in pixels, to cut out of the corners
   *
   * @defaultValue 0
   */
  radius: number | number[];
  /**
   * sets top-left corner
   */
  'top-left': number;
  /**
   * sets top-right corner
   */
  'top-right': number;
  /**
   * sets bottom-right corner
   */
  'bottom-right': number;
  /**
   * sets bottom-left corner
   */
  'bottom-left': number;
}

export const RoundedTemplate: CoreShaderType<RoundedProps> = {
  name: 'Rounded',
  props: {
    radius: {
      default: [0, 0, 0, 0],
      resolve(value) {
        if (value !== undefined) {
          return validateArrayLength4(value);
        }
        return ([] as number[]).concat(this.default);
      },
    },
    'top-left': {
      default: 0,
      set(value, props) {
        (props.radius as Vec4)[0] = value;
      },
      get(props) {
        return (props.radius as Vec4)[0];
      },
    },
    'top-right': {
      default: 0,
      set(value, props) {
        (props.radius as Vec4)[1] = value;
      },
      get(props) {
        return (props.radius as Vec4)[1];
      },
    },
    'bottom-right': {
      default: 0,
      set(value, props) {
        (props.radius as Vec4)[2] = value;
      },
      get(props) {
        return (props.radius as Vec4)[2];
      },
    },
    'bottom-left': {
      default: 0,
      set(value, props) {
        (props.radius as Vec4)[3] = value;
      },
      get(props) {
        return (props.radius as Vec4)[3];
      },
    },
  },
};
