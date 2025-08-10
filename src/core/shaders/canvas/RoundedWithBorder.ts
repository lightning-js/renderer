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

import { calcFactoredRadiusArray, valuesAreEqual } from '../../lib/utils.js';
import type { CanvasShaderType } from '../../renderers/canvas/CanvasShaderNode.js';
import type { Vec4 } from '../../renderers/webgl/internal/ShaderUtils.js';
import {
  RoundedWithBorderTemplate,
  type RoundedWithBorderProps,
} from '../templates/RoundedWithBorderTemplate.js';
import type { ComputedBorderValues } from './Border.js';
import type { ComputedRoundedValues } from './Rounded.js';
import { roundedRectWithBorder } from './utils/render.js';

type ComputedValues = ComputedRoundedValues & ComputedBorderValues;

export const RoundedWithBorder: CanvasShaderType<
  RoundedWithBorderProps,
  ComputedValues
> = {
  props: RoundedWithBorderTemplate.props,
  saveAndRestore: true,
  update(node) {
    const props = this.props!;
    const radius = calcFactoredRadiusArray(
      props.radius as Vec4,
      node.w,
      node.h,
    );
    this.computed.radius = radius;
    this.computed.borderColor = this.toColorString(props['border-color']);
    this.computed.borderAsym = !valuesAreEqual(
      props['border-width'] as number[],
    );
    //following vec4 convention 0, 1, 2, 3 => x, y, z, w;
    const [x, y, z, w] = props['border-width'] as Vec4;
    this.computed.borderRadius = [
      Math.max(0.0, radius[0] - Math.max(x, w) * 0.5),
      Math.max(0.0, radius[1] - Math.max(x, y) * 0.5),
      Math.max(0.0, radius[2] - Math.max(z, y) * 0.5),
      Math.max(0.0, radius[3] - Math.max(z, w) * 0.5),
    ];
  },
  render(ctx, quad, renderContext) {
    const computed = this.computed as ComputedValues;
    roundedRectWithBorder(
      ctx,
      quad.tx,
      quad.ty,
      quad.w,
      quad.h,
      computed.radius,
      this.props!['border-width'] as Vec4,
      computed.borderRadius,
      computed.borderColor,
      computed.borderAsym,
      renderContext,
    );
  },
};
