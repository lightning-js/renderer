import { calcFactoredRadiusArray } from '../../lib/utils.js';
import type { CanvasShaderType } from '../../renderers/canvas/CanvasShaderNode.js';
import type { Vec4 } from '../../renderers/webgl/internal/ShaderUtils.js';
import {
  RoundedWithShadowTemplate,
  type RoundedWithShadowProps,
} from '../templates/RoundedWithShadowTemplate.js';
import type { ComputedRoundedValues } from './Rounded.js';
import type { ComputedShadowValues } from './Shadow.js';
import * as render from './utils/render.js';

type ComputedValues = ComputedRoundedValues & ComputedShadowValues;

export const RoundedWithShadow: CanvasShaderType<
  RoundedWithShadowProps,
  ComputedValues
> = {
  name: RoundedWithShadowTemplate.name,
  props: RoundedWithShadowTemplate.props,
  saveAndRestore: true,
  update(node) {
    const radius = calcFactoredRadiusArray(
      this.props!.radius as Vec4,
      node.width,
      node.height,
    );
    this.computed.radius = radius;
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
      width,
      height,
      this.computed.shadowColor!,
      this.props!['shadow-projection'],
      this.computed.shadowRadius!,
      this.stage.pixelRatio,
    );

    const path = new Path2D();
    render.roundRect(path, tx, ty, width, height, this.computed.radius!);
    ctx.clip(path);
    renderContext();
  },
};
