import type { CanvasShaderType } from '../../renderers/canvas/CanvasShaderNode.js';
import {
  LinearGradientTemplate,
  type LinearGradientProps,
} from '../templates/LinearGradientTemplate.js';

export const LinearGradient: CanvasShaderType<LinearGradientProps> = {
  name: LinearGradientTemplate.name,
  props: LinearGradientTemplate.props,
  update(node) {
    const angle = this.props!.angle - (Math.PI / 180) * 90;
    const nWidth = node.width;
    const nHeight = node.height;
    const line =
      (Math.abs(nWidth * Math.sin(angle)) +
        Math.abs(nHeight * Math.cos(angle))) *
      0.5;

    this.precomputed = {
      x0: line * Math.cos(angle) + nWidth * 0.5,
      y0: line * Math.sin(angle) + nHeight * 0.5,
      x1: line * Math.cos(angle + Math.PI) + nWidth * 0.5,
      y1: line * Math.sin(angle + Math.PI) + nHeight * 0.5,
      colors: this.props!.colors.map((value) => this.toColorString(value)),
    };
  },
  render(ctx, quad, renderContext) {
    renderContext();
    const gradient = ctx.createLinearGradient(
      quad.tx + (this.precomputed.x0 as number),
      quad.ty + (this.precomputed.y0 as number),
      quad.tx + (this.precomputed.x1 as number),
      quad.ty + (this.precomputed.y1 as number),
    );
    const colors = this.precomputed.colors as string[];
    for (let i = 0; i < colors.length; i++) {
      gradient.addColorStop(this.props!['stops'][i]!, colors[i]!);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(quad.tx, quad.ty, quad.width, quad.height);
  },
};
