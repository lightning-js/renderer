import { calcFactoredRadiusArray } from '../../lib/utils.js';
import type { CanvasShaderType } from '../../renderers/canvas/CanvasShaderNode.js';
import type { Vec4 } from '../../renderers/webgl/internal/ShaderUtils.js';
import {
  RoundedTemplate,
  type RoundedProps,
} from '../templates/RoundedTemplate.js';
import { roundRect } from './utils/render.js';

export const Rounded: CanvasShaderType<RoundedProps> = {
  name: RoundedTemplate.name,
  props: RoundedTemplate.props,
  saveAndRestore: true,
  update(node) {
    this.precomputed.radius = calcFactoredRadiusArray(
      this.props!.radius as Vec4,
      node.width,
      node.height,
    );
  },
  render(ctx, quad, renderContext) {
    const path = new Path2D();
    roundRect(
      path,
      quad.tx,
      quad.ty,
      quad.width,
      quad.height,
      this.precomputed.radius as Vec4,
    );
    ctx.clip(path);

    renderContext();
  },
};
