import type { CoreShaderType } from '../../renderers/CoreShaderNode.js';

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
  pivot: [number, number];
}

export const RadialGradientTemplate: CoreShaderType<RadialGradientProps> = {
  name: 'RadialGradient',
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
    width: 50,
    height: 50,
    pivot: [0.5, 0.5],
  },
};
