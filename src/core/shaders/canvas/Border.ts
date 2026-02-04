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

import { formatRgba, parseColorRgba } from '../../lib/colorParser.js';
import { valuesAreEqual } from '../../lib/utils.js';
import type { CanvasShaderType } from '../../renderers/canvas/CanvasShaderNode.js';
import type { Vec4 } from '../../renderers/webgl/internal/ShaderUtils.js';
import {
  BorderTemplate,
  type BorderProps,
} from '../templates/BorderTemplate.js';

export interface ComputedBorderValues {
  borderColor: string;
  borderAsym: boolean;
  innerX: number;
  innerY: number;
  innerW: number;
  innerH: number;
  outerX: number;
  outerY: number;
  outerW: number;
  outerH: number;
}

export const Border: CanvasShaderType<BorderProps, ComputedBorderValues> = {
  props: BorderTemplate.props,
  update() {
    this.computed.borderColor = formatRgba(parseColorRgba(this.props!.color));
    this.computed.borderAsym = !valuesAreEqual(this.props!.w as number[]);
    const borderAlign = this.props!.align as number;
    const borderGap = this.props!.gap as number;

    const borderW = this.props!.w as Vec4;

    if (this.computed.borderAsym === false) {
      const bWidth = borderW[0] * 0.5;
      //inside
      const baseline = bWidth - borderW[0] * borderAlign - borderGap;
      this.computed.outerX = baseline;
      this.computed.outerY = baseline;

      this.computed.outerW = -baseline * 2;
      this.computed.outerH = -baseline * 2;
      return;
    }

    // Calculate outer and inner rectangle dimensions
    const [t, r, b, l] = this.props!.w as Vec4;

    const outerX = (this.computed.outerX = -l * borderAlign - borderGap);
    const outerY = (this.computed.outerY = -t * borderAlign - borderGap);
    let outerW = 0;
    let outerH = 0;

    if (r > 0) {
      outerW += r * borderAlign + borderGap;
    }
    if (l > 0) {
      outerW += l * borderAlign + borderGap;
    }

    if (b > 0) {
      outerH += b * borderAlign + borderGap;
    }
    if (t > 0) {
      outerH += t * borderAlign + borderGap;
    }

    this.computed.outerW = outerW;
    this.computed.outerH = outerH;

    this.computed.innerX = outerX + l;
    this.computed.innerY = outerY + t;
    this.computed.innerW = outerW - l - r;
    this.computed.innerH = outerH - t - b;
  },
  render(ctx, node, renderContext) {
    renderContext();
    const computed = this.computed as ComputedBorderValues;
    const { tx, ty } = node.globalTransform!;
    const { w, h } = node.props;
    ctx.strokeStyle = computed.borderColor!;
    if (computed.borderAsym === false && this.props!.w[0] > 0) {
      ctx.lineWidth = this.props!.w[0];
      ctx.beginPath();
      ctx.strokeRect(
        tx + computed.outerX,
        ty + computed.outerY,
        w + computed.outerW,
        h + computed.outerH,
      );
      return;
    }

    // Calculate outer rectangle (including border)
    const outerX = tx + computed.outerX;
    const outerY = ty + computed.outerY;
    const outerW = w + computed.outerW;
    const outerH = h + computed.outerH;

    // Calculate inner rectangle (excluding border)
    const innerX = tx + computed.innerX;
    const innerY = ty + computed.innerY;
    const innerW = w + computed.innerW;
    const innerH = h + computed.innerH;

    // Use clip to subtract inner from outer
    ctx.save();
    ctx.beginPath();
    ctx.rect(outerX, outerY, outerW, outerH);
    ctx.rect(innerX, innerY, innerW, innerH);
    ctx.clip('evenodd');
    ctx.fillStyle = this.computed.borderColor!;
    ctx.fillRect(outerX, outerY, outerW, outerH);
    ctx.restore();
  },
};
