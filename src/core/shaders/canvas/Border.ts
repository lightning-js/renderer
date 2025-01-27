import type { CoreNode } from '../../CoreNode.js';
import { valuesAreEqual } from '../../lib/utils.js';
import type { CanvasShaderType } from '../../renderers/canvas/CanvasShaderNode.js';
import {
  formatRgba,
  parseColorRgba,
} from '../../renderers/canvas/internal/ColorUtils.js';
import type { Vec4 } from '../../renderers/webgl/internal/ShaderUtils.js';
import {
  BorderTemplate,
  type BorderProps,
} from '../templates/BorderTemplate.js';
import { strokeLine } from './utils/render.js';

export const Border: CanvasShaderType<BorderProps> = {
  name: BorderTemplate.name,
  props: BorderTemplate.props,
  update(node: CoreNode) {
    this.precomputed.borderColor = formatRgba(
      parseColorRgba(this.props!.color),
    );
    this.precomputed.borderAsym = !valuesAreEqual(
      this.props!.width as number[],
    );
  },
  render(ctx, quad, renderContext) {
    renderContext();
    ctx.strokeStyle = this.precomputed.borderColor as string;
    if (this.precomputed.borderAsym === false && this.props!.width[0] > 0) {
      const bWidth = this.props!.width[0];
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

    const { 0: t, 1: r, 2: b, 3: l } = this.props!.width as Vec4;
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
