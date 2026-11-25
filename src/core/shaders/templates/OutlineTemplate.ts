/*
 * Copyright 2026 Comcast Cable Communications, LLC
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
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CoreShaderType } from '../../renderers/CoreShaderNode.js';
import type { PrefixedType } from '../utils.js';

/**
 * Properties of the {@link Outline} shader
 */
export interface OutlineProps {
  /**
   * Uniform stroke width in node-local units (pixels at scale 1). The stroke
   * is drawn inside the node bounds with hard edges; under a scaled/rotated
   * node the stroke scales with the node transform.
   *
   * Values >= half the smaller node dimension fill the whole node with the
   * stroke color. 0 disables the stroke (fill only).
   *
   * @default 0
   */
  w: number;
  /**
   * Stroke color in 0xRRGGBBAA
   *
   * @default 0xffffffff
   */
  color: number;
}

export function getOutlineProps<P extends string>(
  prefix?: P,
): PrefixedType<OutlineProps, P> {
  const pf = prefix && prefix.length > 0 ? `${prefix}-` : '';
  return {
    [pf + 'w']: 0,
    [pf + 'color']: 0xffffffff,
  } as PrefixedType<OutlineProps, P>;
}

type PlainOutlineProps = PrefixedType<OutlineProps>;

export const OutlineTemplate: CoreShaderType<OutlineProps> = {
  props: getOutlineProps() as PlainOutlineProps,
};
