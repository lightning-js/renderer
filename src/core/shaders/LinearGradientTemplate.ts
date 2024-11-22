import type { CoreShaderConfig } from '../renderers/CoreShaderProgram.js';

/**
 * Properties of the {@link LinearGradient} shader
 */
export interface LinearGradientProps {
  /**
   * Array of colors to be used in the LinearGradient shader
   *
   * @default [0xff000000, 0xffffffff]
   */
  colors: number[];
  /**
   * Angle of the LinearGradient shader, Angle in Radians
   *
   * @default 0
   */
  angle: number;
  /**
   * Array of color stops
   */
  stops: number[];
}

export const LinearGradientTemplate: CoreShaderConfig<LinearGradientProps> = {
  name: 'LinearGradient',
  props: {
    colors: [0x000000ff, 0xffffffff],
    stops: [0, 1],
    angle: 0,
  },
  validateProps(props) {
    const angle = props.angle || this.props!.angle;
    const colors = props.colors || [];
    const stops = props.stops || [];
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
        angle,
      };
    }
    for (let i = 0; i < colors.length; i++) {
      stops[i] = i * (1 / (colors.length - 1));
    }
    return {
      colors,
      stops,
      angle,
    };
  },
};
