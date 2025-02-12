import { calcFactoredRadiusArray, valuesAreEqual } from '../../lib/utils.js';
import type { CanvasShaderType } from '../../renderers/canvas/CanvasShaderNode.js';
import type { Vec4 } from '../../renderers/webgl/internal/ShaderUtils.js';
import {
  RoundedWithBorderTemplate,
  type RoundedWithBorderProps,
} from '../templates/RoundedWithBorderTemplate.js';
import type { ComputedBorderValues } from './Border.js';
import type { ComputedRoundedValues } from './Rounded.js';
import { roundedRectWithBorder } from './utils/render.js';

type ComputedValues = ComputedRoundedValues & ComputedBorderValues;

export const RoundedWithBorder: CanvasShaderType<
  RoundedWithBorderProps,
  ComputedValues
> = {
  name: RoundedWithBorderTemplate.name,
  props: RoundedWithBorderTemplate.props,
  saveAndRestore: true,
  update(node) {
    const radius = calcFactoredRadiusArray(
      this.props!.radius as Vec4,
      node.width,
      node.height,
    );
    this.computed.radius = radius;
    this.computed.borderColor = this.toColorString(this.props!['border-color']);
    this.computed.borderAsym = !valuesAreEqual(
      this.props!['border-width'] as number[],
    );
    const borderWidth = this.props!['border-width'] as Vec4;
    this.computed.borderRadius = radius.map((value, index) =>
      Math.max(0, value - borderWidth[index]! * 0.5),
    ) as Vec4;
  },
  render(ctx, quad, renderContext) {
    roundedRectWithBorder(
      ctx,
      quad.tx,
      quad.ty,
      quad.width,
      quad.height,
      this.computed.radius!,
      this.props!['border-width'] as Vec4,
      this.computed.borderRadius!,
      this.computed.borderColor!,
      this.computed.borderAsym!,
      renderContext,
    );
  },
};
