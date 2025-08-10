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
  w: number,
  h: number,
  radius: Vec4,
) {
  if (ctx.roundRect !== undefined) {
    ctx.roundRect(x, y, w, h, radius);
    return;
  }
  const { 0: tl, 1: tr, 2: br, 3: bl } = radius;
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.ellipse(x + w - tr, y + tr, tr, tr, 0, 1.5 * Math.PI, 2 * Math.PI);
  ctx.lineTo(x + w, y - h - br);
  ctx.ellipse(x + w - br, y + h - br, br, br, 0, 0, 0.5 * Math.PI);
  ctx.lineTo(x + bl, y + h);
  ctx.ellipse(x + bl, y + h - bl, bl, bl, 0, 0.5 * Math.PI, Math.PI);
  ctx.lineTo(x, y + tl);
  ctx.ellipse(x + tl, y + tl, tl, tl, 0, Math.PI, 1.5 * Math.PI);
}

export function roundedRectWithBorder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: Vec4,
  borderw: Vec4,
  borderRadius: Vec4,
  borderColor: string,
  borderAsym: boolean,
  renderContext: () => void,
) {
  if (borderAsym === false) {
    const bw = borderw[0];
    const bHalfw = bw * 0.5;
    const path = new Path2D();
    roundRect(path, x, y, w, h, radius);
    ctx.clip(path);

    renderContext();

    if (bw > 0) {
      ctx.beginPath();
      ctx.lineWidth = bw;
      ctx.strokeStyle = borderColor;
      roundRect(ctx, x + bHalfw, y + bHalfw, w - bw, h - bw, borderRadius);
      ctx.stroke();
    }
    return;
  }

  ctx.beginPath();
  roundRect(ctx, x, y, w, h, radius as Vec4);
  ctx.fillStyle = borderColor;
  ctx.fill();
  const { 0: t, 1: r, 2: b, 3: l } = borderw as Vec4;

  const path = new Path2D();
  roundRect(path, x + l, y + t, w - (l + r), h - (t + b), borderRadius as Vec4);
  ctx.clip(path);
  renderContext();
}

export function shadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  projection: Vec4,
  radius: Vec4,
  pixelRatio: number,
) {
  ctx.save();
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const scaleFactor = (2 * projection[3] + w) / w;
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
    w + spreadFactor,
    h + spreadFactor,
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
  w: number,
) {
  ctx.beginPath();
  ctx.lineWidth = w;
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
