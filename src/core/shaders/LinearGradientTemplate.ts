import type { CoreShaderConfig } from '../renderers/CoreShaderNode.js';

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
    colors: {
      default: [0x000000ff, 0xffffffff],
      resolve(value) {
        if (value.length > 0) {
          return value;
        }
        for (let i = 0; i < this.default.length; i++) {
          value[i] = this.default[i]!;
        }
        return value;
      },
    },
    stops: {
      default: [0, 1],
      resolve(value, props) {
        if (value.length === props.colors.length) {
          return value;
        }
        const len = props.colors.length;
        for (let i = 0; i < len; i++) {
          value[i] = i * (1 / (len - 1));
        }
        return value;
      },
    },
    angle: 0,
  },
};
