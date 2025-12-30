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

import type { CanvasShaderType } from '../../renderers/canvas/CanvasShaderNode.js';
import {
  RadialGradientTemplate,
  type RadialGradientProps,
} from '../templates/RadialGradientTemplate.js';

export interface ComputedRadialGradientValues {
  pivotX: number;
  pivotY: number;
  scaleX: number;
  scaleY: number;
  size: number;
  colors: string[];
}

export const RadialGradient: CanvasShaderType<
  RadialGradientProps,
  ComputedRadialGradientValues
> = {
  props: RadialGradientTemplate.props,
  update(node) {
    let scaleX = 1;
    let scaleY = 1;
    const props = this.props as RadialGradientProps;
    const pWidth = props.w;
    const pHeight = props.h;
    if (pWidth > pHeight) {
      scaleX = pWidth / pHeight;
    } else if (pHeight > pWidth) {
      scaleY = pHeight / pWidth;
    }

    this.computed = {
      pivotX: props.pivot[0] * node.w,
      pivotY: props.pivot[1] * node.h,
      scaleX,
      scaleY,
      size: Math.min(pWidth, pHeight),
      colors: props.colors.map((value) => this.toColorString(value)),
    };
  },
  render(ctx, quad, renderContext) {
    renderContext();
    const { scaleX, scaleY, pivotX, pivotY, colors, size } = this
      .computed as ComputedRadialGradientValues;
    let x = quad.tx + pivotX;
    let y = quad.ty + pivotY;
    const stops = this.props!.stops;

    if (scaleX === scaleY) {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);

      for (let i = 0; i < colors.length; i++) {
        gradient.addColorStop(stops[i]!, colors[i]!);
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(quad.tx, quad.ty, quad.width, quad.height);
      return;
    }

    ctx.save();
    ctx.scale(scaleX, scaleY);
    x = x / scaleX;
    y = y / scaleY;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);

    for (let i = 0; i < colors.length; i++) {
      gradient.addColorStop(stops[i]!, colors[i]!);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(
      quad.tx / scaleX,
      quad.ty / scaleY,
      quad.width / scaleX,
      quad.height / scaleY,
    );

    ctx.restore();
  },
};
