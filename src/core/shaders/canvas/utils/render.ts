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

import type { Vec4 } from '../../../renderers/webgl/internal/ShaderUtils.js';

export function roundRect(
  ctx: CanvasRenderingContext2D | Path2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: Vec4,
) {
  if (ctx.roundRect !== undefined) {
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
  const { 0: tl, 1: tr, 2: br, 3: bl } = radius;
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + width - tr, y);
  ctx.ellipse(x + width - tr, y + tr, tr, tr, 0, 1.5 * Math.PI, 2 * Math.PI);
  ctx.lineTo(x + width, y - height - br);
  ctx.ellipse(x + width - br, y + height - br, br, br, 0, 0, 0.5 * Math.PI);
  ctx.lineTo(x + bl, y + height);
  ctx.ellipse(x + bl, y + height - bl, bl, bl, 0, 0.5 * Math.PI, Math.PI);
  ctx.lineTo(x, y + tl);
  ctx.ellipse(x + tl, y + tl, tl, tl, 0, Math.PI, 1.5 * Math.PI);
}

export function roundedRectWithBorder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: Vec4,
  borderGap: number,
  outerX: number,
  outerY: number,
  outerW: number,
  outerH: number,
  outerBorderRadius: Vec4,
  innerX: number,
  innerY: number,
  innerW: number,
  innerH: number,
  innerBorderRadius: Vec4,
  borderColor: string,
  renderContext: () => void,
) {
  outerX += x;
  outerY += y;
  outerW += width;
  outerH += height;

  innerX += x;
  innerY += y;
  innerW += width;
  innerH += height;

  // no gap render strategy - to avoid artifacts between border and node
  if (borderGap === 0) {
    //draw outer border rounded rect
    ctx.beginPath();
    roundRect(ctx, outerX, outerY, outerW, outerH, outerBorderRadius);
    ctx.fillStyle = borderColor;
    ctx.fill();
    ctx.closePath();

    const path = new Path2D();
    roundRect(path, innerX, innerY, innerW, innerH, innerBorderRadius as Vec4);
    ctx.clip(path);
    renderContext();
    return;
  }

  // with gap render strategy

  //draw node content first
  ctx.save();
  const path = new Path2D();
  roundRect(path, x, y, width, height, radius);
  ctx.clip(path);
  renderContext();
  ctx.restore();

  //draw border by clipping inner area from outer area
  ctx.save();
  const borderPath = new Path2D();
  roundRect(borderPath, outerX, outerY, outerW, outerH, outerBorderRadius);
  roundRect(borderPath, innerX, innerY, innerW, innerH, innerBorderRadius);
  ctx.fillStyle = borderColor;
  ctx.fill(borderPath, 'evenodd');
  ctx.restore();
}

export function shadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  projection: Vec4,
  radius: Vec4,
  pixelRatio: number,
) {
  ctx.save();
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const scaleFactor = (2 * projection[3] + width) / width;
  ctx.scale(scaleFactor, scaleFactor);
  ctx.shadowColor = color;
  ctx.shadowBlur = projection[2] * pixelRatio;
  ctx.shadowOffsetX = projection[0] + cw * pixelRatio - projection[3] * 0.5;
  ctx.shadowOffsetY = projection[1] + ch * pixelRatio - projection[3] * 0.5;

  const spreadFactor = projection[3];
  ctx.beginPath();
  roundRect(
    ctx,
    (x - spreadFactor - cw) / scaleFactor,
    (y - spreadFactor - ch) / scaleFactor,
    width + spreadFactor,
    height + spreadFactor,
    radius,
  );
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

export function strokeLine(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  x2: number,
  y2: number,
  lineWidth: number,
) {
  ctx.beginPath();
  ctx.lineWidth = lineWidth;
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
