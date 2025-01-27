import type { CoreShaderType } from '../../renderers/CoreShaderNode.js';

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

export const LinearGradientTemplate: CoreShaderType<LinearGradientProps> = {
  name: 'LinearGradient',
  props: {
    colors: {
      default: [0x000000ff, 0xffffffff],
      resolve(value) {
        if (value !== undefined && value.length > 0) {
          return value;
        }
        return ([] as number[]).concat(this.default);
      },
    },
    stops: {
      default: [0, 1],
      resolve(value, props) {
        if (value !== undefined && value.length === props.colors.length) {
          return value;
        }
        if (value === undefined) {
          value = [];
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
