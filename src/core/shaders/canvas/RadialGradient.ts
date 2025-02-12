import type { CanvasShaderType } from '../../renderers/canvas/CanvasShaderNode.js';
import {
  RadialGradientTemplate,
  type RadialGradientProps,
} from '../templates/RadialGradientTemplate.js';

export interface ComputedRadialGradientValues {
  pivotX: number;
  pivotY: number;
  scaleX: number;
  scaleY: number;
  size: number;
  colors: string[];
}

export const RadialGradient: CanvasShaderType<
  RadialGradientProps,
  ComputedRadialGradientValues
> = {
  name: RadialGradientTemplate.name,
  props: RadialGradientTemplate.props,
  update(node) {
    let scaleX = 1;
    let scaleY = 1;

    const pWidth = this.props!.width;
    const pHeight = this.props!.height;
    if (pWidth > pHeight) {
      scaleX = pWidth / pHeight;
    } else if (pHeight > pWidth) {
      scaleY = pHeight / pWidth;
    }

    this.computed = {
      pivotX: this.props!.pivot[0] * node.width,
      pivotY: this.props!.pivot[1] * node.height,
      scaleX,
      scaleY,
      size: Math.min(pWidth, pHeight) * 0.5,
      colors: this.props!.colors.map((value) => this.toColorString(value)),
    };
  },
  render(ctx, quad, renderContext) {
    renderContext();

    const { scaleX, scaleY, pivotX, pivotY } = this.computed!;
    const colors = this.computed.colors!;
    let x = quad.tx + pivotX!;
    let y = quad.ty + pivotY!;

    if (scaleX === scaleY) {
      const gradient = ctx.createRadialGradient(
        x,
        y,
        0,
        x,
        y,
        this.computed.size!,
      );

      for (let i = 0; i < colors.length; i++) {
        gradient.addColorStop(this.props!['stops'][i]!, colors[i]!);
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(quad.tx, quad.ty, quad.width, quad.height);
      return;
    }

    ctx.save();
    ctx.scale(scaleX!, scaleY!);
    x = x / scaleX!;
    y = y / scaleY!;
    const gradient = ctx.createRadialGradient(
      x,
      y,
      0,
      x,
      y,
      this.computed.size!,
    );

    for (let i = 0; i < colors.length; i++) {
      gradient.addColorStop(this.props!['stops'][i]!, colors[i]!);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(
      quad.tx / scaleX!,
      quad.ty / scaleY!,
      quad.width / scaleX!,
      quad.height / scaleY!,
    );

    ctx.restore();
  },
};
