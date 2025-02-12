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
import { validateArrayLength4, type PrefixedType } from './shaderUtils.js';

/**
 * Properties of the {@link Border} shader
 */
export interface BorderProps {
  /**
   * Width of the border in pixels
   *
   * @default 0
   */
  width: number | [number, number, number, number];
  /**
   * Color of the border in 0xRRGGBBAA
   *
   * @default 0xffffffff
   */
  color: number;
  /**
   * Top width
   */
  top: number;
  /**
   * Right width
   */
  right: number;
  /**
   * Bottom width
   */
  bottom: number;
  /**
   * Left width
   */
  left: number;
}

export function getBorderProps<P extends string>(
  prefix?: P,
): PrefixedType<BorderProps, P> {
  const pf = prefix && prefix.length > 0 ? `${prefix}-` : '';
  const width = pf + 'width';
  return {
    [width]: {
      default: [0, 0, 0, 0],
      resolve(value) {
        if (value !== undefined) {
          return validateArrayLength4(value);
        }
        return ([] as number[]).concat(this.default);
      },
    },
    [pf + 'color']: 0xffffffff,
    [pf + 'top']: {
      default: 0,
      set(value, props) {
        (props[width] as Vec4)[0] = value;
      },
      get(props) {
        return (props[width] as Vec4)[0];
      },
    },
    [pf + 'right']: {
      default: 0,
      set(value, props) {
        (props[width] as Vec4)[1] = value;
      },
      get(props) {
        return (props[width] as Vec4)[1];
      },
    },
    [pf + 'bottom']: {
      default: 0,
      set(value, props) {
        (props[width] as Vec4)[2] = value;
      },
      get(props) {
        return (props[width] as Vec4)[2];
      },
    },
    [pf + 'left']: {
      default: 0,
      set(value, props) {
        (props[width] as Vec4)[3] = value;
      },
      get(props) {
        return (props[width] as Vec4)[3];
      },
    },
  } as PrefixedType<BorderProps, P>;
}

type PlainBorderProps = PrefixedType<BorderProps>;

export const BorderTemplate: CoreShaderType<BorderProps> = {
  name: 'Border',
  props: getBorderProps() as PlainBorderProps,
};
