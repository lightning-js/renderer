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
import { strokeLine } from './utils/render.js';

export interface ComputedBorderValues {
  borderColor: string;
  borderAsym: boolean;
  borderRadius: Vec4;
}

export const Border: CanvasShaderType<BorderProps, ComputedBorderValues> = {
  props: BorderTemplate.props,
  update() {
    this.computed.borderColor = formatRgba(parseColorRgba(this.props!.color));
    this.computed.borderAsym = !valuesAreEqual(this.props!.w as number[]);
  },
  render(ctx, quad, renderContext) {
    renderContext();
    ctx.strokeStyle = this.computed.borderColor!;
    if (this.computed.borderAsym === false && this.props!.w[0] > 0) {
      const bWidth = this.props!.w[0];
      const bHalfWidth = bWidth * 0.5;
      ctx.lineWidth = bWidth;
      ctx.beginPath();
      ctx.strokeRect(
        quad.tx + bHalfWidth,
        quad.ty + bHalfWidth,
        quad.width - bWidth,
        quad.height - bWidth,
      );
      return;
    }

    const { 0: t, 1: r, 2: b, 3: l } = this.props!.w as Vec4;
    if (t > 0) {
      const y = quad.ty + t * 0.5;
      strokeLine(ctx, quad.tx, y, quad.tx + quad.width, y, t);
    }
    if (r > 0) {
      const x = quad.tx + quad.width - r * 0.5;
      strokeLine(ctx, x, quad.ty, x, quad.ty + quad.height, r);
    }
    if (b > 0) {
      const y = quad.ty + quad.height - b * 0.5;
      strokeLine(ctx, quad.tx, y, quad.tx + quad.width, y, b);
    }
    if (l > 0) {
      const x = quad.tx + l * 0.5;
      strokeLine(ctx, x, quad.ty, x, quad.ty + quad.height, l);
    }
  },
};
