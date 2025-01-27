import { calcFactoredRadiusArray } from '../../lib/utils.js';
import type { CanvasShaderType } from '../../renderers/canvas/CanvasShaderNode.js';
import type { Vec4 } from '../../renderers/webgl/internal/ShaderUtils.js';
import {
  RoundedWithShadowTemplate,
  type RoundedWithShadowProps,
} from '../templates/RoundedWithShadowTemplate.js';
import * as render from './utils/render.js';

export const RoundedWithShadow: CanvasShaderType<RoundedWithShadowProps> = {
  name: RoundedWithShadowTemplate.name,
  props: RoundedWithShadowTemplate.props,
  saveAndRestore: true,
  update(node) {
    const radius = calcFactoredRadiusArray(
      this.props!.radius as Vec4,
      node.width,
      node.height,
    );
    this.precomputed.radius = radius;
    this.precomputed.shadowColor = this.toColorString(
      this.props!['shadow-color'],
    );
    this.precomputed.shadowRadius = radius.map(
      (value) => value + this.props!['shadow-blur'],
    );
  },
  render(ctx, quad, renderContext) {
    const { tx, ty, width, height } = quad;

    render.shadow(
      ctx,
      tx,
      ty,
      width,
      height,
      this.precomputed.shadowColor as string,
      this.props!['shadow-projection'],
      this.precomputed.shadowRadius as Vec4,
      this.stage.pixelRatio,
    );

    const path = new Path2D();
    render.roundRect(
      path,
      tx,
      ty,
      width,
      height,
      this.precomputed.radius as Vec4,
    );
    ctx.clip(path);
    renderContext();
  },
};
