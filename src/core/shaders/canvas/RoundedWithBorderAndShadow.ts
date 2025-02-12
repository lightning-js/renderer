import { calcFactoredRadiusArray, valuesAreEqual } from '../../lib/utils.js';
import type { CanvasShaderType } from '../../renderers/canvas/CanvasShaderNode.js';
import type { Vec4 } from '../../renderers/webgl/internal/ShaderUtils.js';
import {
  RoundedWithBorderAndShadowTemplate,
  type RoundedWithBorderAndShadowProps,
} from '../templates/RoundedWithBorderAndShadowTemplate.js';
import type { ComputedBorderValues } from './Border.js';
import type { ComputedRoundedValues } from './Rounded.js';
import type { ComputedShadowValues } from './Shadow.js';
import * as render from './utils/render.js';

type ComputedValues = ComputedRoundedValues &
  ComputedBorderValues &
  ComputedShadowValues;

export const RoundedWithBorderAndShadow: CanvasShaderType<
  RoundedWithBorderAndShadowProps,
  ComputedValues
> = {
  name: RoundedWithBorderAndShadowTemplate.name,
  props: RoundedWithBorderAndShadowTemplate.props,
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

    this.computed.shadowColor = this.toColorString(this.props!['shadow-color']);
    this.computed.shadowRadius = radius.map(
      (value) => value + this.props!['shadow-blur'],
    ) as Vec4;
  },
  render(ctx, quad, renderContext) {
    const { tx, ty, width, height } = quad;
    render.shadow(
      ctx,
      tx,
      ty,
      height,
      width,
      this.computed.shadowColor!,
      this.props!['shadow-projection'],
      this.computed.shadowRadius!,
      this.stage.pixelRatio,
    );
    render.roundedRectWithBorder(
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
