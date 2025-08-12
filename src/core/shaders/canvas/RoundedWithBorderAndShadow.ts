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
  RoundedWithBorderAndShadowTemplate,
  type RoundedWithBorderAndShadowProps,
} from '../templates/RoundedWithBorderAndShadowTemplate.js';
import type { ComputedBorderValues } from './Border.js';
import type { ComputedRoundedValues } from './Rounded.js';
import type { ComputedShadowValues } from './Shadow.js';
import * as render from './utils/render.js';

type ComputedValues = ComputedRoundedValues &
  ComputedBorderValues &
  ComputedShadowValues;

export const RoundedWithBorderAndShadow: CanvasShaderType<
  RoundedWithBorderAndShadowProps,
  ComputedValues
> = {
  props: RoundedWithBorderAndShadowTemplate.props,
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
    const borderWidth = props['border-width'] as Vec4;
    this.computed.borderRadius = radius.map((value, index) =>
      Math.max(0, value - borderWidth[index]! * 0.5),
    ) as Vec4;

    this.computed.shadowColor = this.toColorString(props['shadow-color']);
    this.computed.shadowRadius = radius.map(
      (value) => value + props['shadow-blur'],
    ) as Vec4;
  },
  render(ctx, quad, renderContext) {
    const { tx, ty, width, height } = quad;
    const computed = this.computed as ComputedValues;
    render.shadow(
      ctx,
      tx,
      ty,
      height,
      width,
      computed.shadowColor,
      this.props!['shadow-projection'],
      computed.shadowRadius,
      this.stage.pixelRatio,
    );
    render.roundedRectWithBorder(
      ctx,
      quad.tx,
      quad.ty,
      quad.width,
      quad.height,
      computed.radius,
      this.props!['border-width'] as Vec4,
      computed.borderRadius,
      computed.borderColor,
      computed.borderAsym,
      renderContext,
    );
  },
};
