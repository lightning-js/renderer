import { calcFactoredRadiusArray, valuesAreEqual } from '../../lib/utils.js';
import type { CanvasShaderType } from '../../renderers/canvas/CanvasShaderNode.js';
import type { Vec4 } from '../../renderers/webgl/internal/ShaderUtils.js';
import {
  RoundedWithBorderTemplate,
  type RoundedWithBorderProps,
} from '../templates/RoundedWithBorderTemplate.js';
import { roundedRectWithBorder } from './utils/render.js';

export const RoundedWithBorder: CanvasShaderType<RoundedWithBorderProps> = {
  name: RoundedWithBorderTemplate.name,
  props: RoundedWithBorderTemplate.props,
  saveAndRestore: true,
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
  },
  render(ctx, quad, renderContext) {
    roundedRectWithBorder(
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
