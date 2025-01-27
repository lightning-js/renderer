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
  borderWidth: Vec4,
  borderRadius: Vec4,
  borderColor: string,
  borderAsym: boolean,
  renderContext: () => void,
) {
  if (borderAsym === false) {
    const bWidth = borderWidth[0];
    const bHalfWidth = bWidth * 0.5;
    const path = new Path2D();
    roundRect(path, x, y, width, height, radius);
    ctx.clip(path);

    renderContext();

    if (bWidth > 0) {
      ctx.beginPath();
      ctx.lineWidth = bWidth;
      ctx.strokeStyle = borderColor;
      roundRect(
        ctx,
        x + bHalfWidth,
        y + bHalfWidth,
        width - bWidth,
        height - bWidth,
        borderRadius,
      );
      ctx.stroke();
    }
    return;
  }

  ctx.beginPath();
  roundRect(ctx, x, y, width, height, radius as Vec4);
  ctx.fillStyle = borderColor;
  ctx.fill();
  const { 0: t, 1: r, 2: b, 3: l } = borderWidth as Vec4;

  const path = new Path2D();
  roundRect(
    path,
    x + l,
    y + t,
    width - (l + r),
    height - (t + b),
    borderRadius as Vec4,
  );
  ctx.clip(path);
  renderContext();
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
  ctx.shadowBlur = projection[2];
  ctx.shadowOffsetX = projection[0] + cw * pixelRatio;
  ctx.shadowOffsetY = projection[1] + ch * pixelRatio;

  const spreadFactor = projection[3] * (1 + pixelRatio);
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
