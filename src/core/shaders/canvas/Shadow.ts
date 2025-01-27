import type { CanvasShaderType } from '../../renderers/canvas/CanvasShaderNode.js';
import type { Vec4 } from '../../renderers/webgl/internal/ShaderUtils.js';
import {
  ShadowTemplate,
  type ShadowProps,
} from '../templates/ShadowTemplate.js';
import { shadow } from './utils/render.js';

export const Shadow: CanvasShaderType<ShadowProps> = {
  name: ShadowTemplate.name,
  props: ShadowTemplate.props,
  update() {
    this.precomputed.shadowColor = this.toColorString(this.props!['color']);
    const blur = this.props!['blur'];
    this.precomputed.shadowRadius = [blur, blur, blur, blur];
  },
  render(ctx, quad, renderContext) {
    shadow(
      ctx,
      quad.tx,
      quad.ty,
      quad.width,
      quad.height,
      this.precomputed.shadowColor as string,
      this.props!['projection'],
      this.precomputed.shadowRadius as Vec4,
      this.stage.pixelRatio,
    );
    renderContext();
  },
};
