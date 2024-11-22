import type { CoreShaderConfig } from '../renderers/CoreShaderProgram.js';

/**
 * Properties of the {@link RadialGradient} shader
 */
export interface RadialGradientProps {
  /**
   * Array of colors to be used in the RadialGradient shader
   *
   * @default [0xff000000, 0xffffffff]
   */
  colors: number[];
  /**
   * Array of color stops
   */
  stops: number[];
  /**
   * Width of the RadialGradientEffect
   */
  width: number;
  /**
   * height of the RadialGradientEffect
   *
   * @remarks if not defined uses the width value
   */
  height: number;
  /**
   * center point of where the RadialGradientEffect is drawn
   */
  pivot: number[];
}

export const RadialGradientTemplate: CoreShaderConfig<RadialGradientProps> = {
  name: 'RadialGradient',
  props: {
    colors: [0xff000000, 0xffffffff],
    stops: [0, 1],
    width: 50,
    height: 50,
    pivot: [0.5, 0.5],
  },
  validateProps(props) {
    const colors = props.colors || [];
    const stops = props.stops || [];
    const pivot = props.pivot || [];
    if (pivot.length === 0) {
      pivot[0] = this.props!.pivot[0]!;
      pivot[1] = this.props!.pivot[1]!;
    }
    let i = 0;
    if (colors.length === 0) {
      for (i = 0; i < this.props!.colors.length; i++) {
        colors[i] = this.props!.colors[i]!;
      }
    }
    if (colors.length === stops.length) {
      return {
        colors,
        stops,
        pivot,
        width: props.width || 50,
        height: props.height || 50,
      };
    }
    for (let i = 0; i < colors.length; i++) {
      stops[i] = i * (1 / (colors.length - 1));
    }
    return {
      colors,
      stops,
      pivot,
      width: props.width || 50,
      height: props.height || 50,
    };
  },
};
