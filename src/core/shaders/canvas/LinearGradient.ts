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
  LinearGradientTemplate,
  type LinearGradientProps,
} from '../templates/LinearGradientTemplate.js';

export interface ComputedLinearGradientValues {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  colors: string[];
}

export const LinearGradient: CanvasShaderType<
  LinearGradientProps,
  ComputedLinearGradientValues
> = {
  name: LinearGradientTemplate.name,
  props: LinearGradientTemplate.props,
  update(node) {
    const angle = this.props!.angle - (Math.PI / 180) * 90;
    const nWidth = node.width;
    const nHeight = node.height;
    const line =
      (Math.abs(nWidth * Math.sin(angle)) +
        Math.abs(nHeight * Math.cos(angle))) *
      0.5;

    this.computed = {
      x0: line * Math.cos(angle) + nWidth * 0.5,
      y0: line * Math.sin(angle) + nHeight * 0.5,
      x1: line * Math.cos(angle + Math.PI) + nWidth * 0.5,
      y1: line * Math.sin(angle + Math.PI) + nHeight * 0.5,
      colors: this.props!.colors.map((value) => this.toColorString(value)),
    };
  },
  render(ctx, quad, renderContext) {
    renderContext();
    const gradient = ctx.createLinearGradient(
      quad.tx + this.computed.x0!,
      quad.ty + this.computed.y0!,
      quad.tx + this.computed.x1!,
      quad.ty + this.computed.y1!,
    );
    const colors = this.computed.colors!;
    for (let i = 0; i < colors.length; i++) {
      gradient.addColorStop(this.props!['stops'][i]!, colors[i]!);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(quad.tx, quad.ty, quad.width, quad.height);
  },
};
