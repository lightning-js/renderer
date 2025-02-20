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
  HolePunchTemplate,
  type HolePunchProps,
} from '../templates/HolePunchTemplate.js';
import { roundRect } from './utils/render.js';

export interface ComputedHolePunchValues {
  radius: Vec4;
}

export const HolePunch: CanvasShaderType<
  HolePunchProps,
  ComputedHolePunchValues
> = {
  props: HolePunchTemplate.props,
  update() {
    this.computed.radius = calcFactoredRadiusArray(
      this.props!.radius as Vec4,
      this.props!.width,
      this.props!.height,
    );
  },
  render(ctx, quad, renderContext) {
    ctx.save();
    renderContext();
    const { x, y, width, height } = this.props!;
    ctx.beginPath();
    roundRect(
      ctx,
      quad.tx + x,
      quad.ty + y,
      width,
      height,
      this.computed.radius!,
    );
    ctx.closePath();
    ctx.fillStyle = 'black';
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fill();
    ctx.restore();
  },
};
