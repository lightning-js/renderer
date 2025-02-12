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

import { calcFactoredRadiusArray } from '../../lib/utils.js';
import type { CanvasShaderType } from '../../renderers/canvas/CanvasShaderNode.js';
import type { Vec4 } from '../../renderers/webgl/internal/ShaderUtils.js';
import {
  RoundedWithShadowTemplate,
  type RoundedWithShadowProps,
} from '../templates/RoundedWithShadowTemplate.js';
import type { ComputedRoundedValues } from './Rounded.js';
import type { ComputedShadowValues } from './Shadow.js';
import * as render from './utils/render.js';

type ComputedValues = ComputedRoundedValues & ComputedShadowValues;

export const RoundedWithShadow: CanvasShaderType<
  RoundedWithShadowProps,
  ComputedValues
> = {
  name: RoundedWithShadowTemplate.name,
  props: RoundedWithShadowTemplate.props,
  saveAndRestore: true,
  update(node) {
    const radius = calcFactoredRadiusArray(
      this.props!.radius as Vec4,
      node.width,
      node.height,
    );
    this.computed.radius = radius;
    this.computed.shadowColor = this.toColorString(this.props!['shadow-color']);
    this.computed.shadowRadius = radius.map(
      (value) => value + this.props!['shadow-blur'],
    ) as Vec4;
  },
  render(ctx, quad, renderContext) {
    const { tx, ty, width, height } = quad;

    render.shadow(
      ctx,
      tx,
      ty,
      width,
      height,
      this.computed.shadowColor!,
      this.props!['shadow-projection'],
      this.computed.shadowRadius!,
      this.stage.pixelRatio,
    );

    const path = new Path2D();
    render.roundRect(path, tx, ty, width, height, this.computed.radius!);
    ctx.clip(path);
    renderContext();
  },
};
