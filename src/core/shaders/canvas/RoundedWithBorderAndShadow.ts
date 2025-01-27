import { calcFactoredRadiusArray, valuesAreEqual } from '../../lib/utils.js';
import type { CanvasShaderType } from '../../renderers/canvas/CanvasShaderNode.js';
import type { Vec4 } from '../../renderers/webgl/internal/ShaderUtils.js';
import {
  RoundedWithBorderAndShadowTemplate,
  type RoundedWithBorderAndShadowProps,
} from '../templates/RoundedWithBorderAndShadowTemplate.js';
import * as render from './utils/render.js';

export const RoundedWithBorderAndShadow: CanvasShaderType<RoundedWithBorderAndShadowProps> =
  {
    name: RoundedWithBorderAndShadowTemplate.name,
    props: RoundedWithBorderAndShadowTemplate.props,
    update(node) {
      const radius = calcFactoredRadiusArray(
        this.props!.radius as Vec4,
        node.width,
        node.height,
      );
      this.precomputed.radius = radius;
      this.precomputed.borderColor = this.toColorString(
        this.props!['border-color'],
      );
      this.precomputed.borderAsym = !valuesAreEqual(
        this.props!['border-width'] as number[],
      );
      const borderWidth = this.props!['border-width'] as Vec4;
      this.precomputed.borderRadius = radius.map((value, index) =>
        Math.max(0, value - borderWidth[index]! * 0.5),
      );

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
        height,
        width,
        this.precomputed.shadowColor as string,
        this.props!['shadow-projection'],
        this.precomputed.shadowRadius as Vec4,
        this.stage.pixelRatio,
      );
      render.roundedRectWithBorder(
        ctx,
        quad.tx,
        quad.ty,
        quad.width,
        quad.height,
        this.precomputed.radius as Vec4,
        this.props!['border-width'] as Vec4,
        this.precomputed.borderRadius as Vec4,
        this.precomputed.borderColor as string,
        this.precomputed.borderAsym as boolean,
        renderContext,
      );
    },
  };
