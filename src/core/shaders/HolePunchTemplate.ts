import type { CoreShaderConfig } from '../renderers/CoreShaderNode.js';

/**
 * Properties of the {@link HolePunch} shader
 */
export interface HolePunchProps {
  /**
   * X position where the hole punch starts
   */
  x: number;
  /**
   * Y position where the hole punch starts
   */
  y: number;
  /**
   * Width of the hole punch
   */
  width: number;
  /**
   * height of the hole punch
   *
   * @remarks if not defined uses the width value
   */
  height: number;
  /**
   * Corner radius in pixels, to cut out of the corners of the hole punch
   *
   * @remarks
   * You can input an array with a length of up to four or a number.
   *
   * array length 4:
   * [topLeft, topRight, bottomRight, bottomLeft]
   *
   * array length 2:
   * [20, 40] -> [20(topLeft), 40(topRight), 20(bottomRight), 40(bottomLeft)]
   *
   * array length 3:
   * [20, 40, 60] -> [20(topLeft), 40(topRight), 60(bottomRight), 20(bottomLeft)]
   *
   * number:
   * 30 -> [30, 30, 30, 30]
   *
   * @default -1
   */
  radius: number | number[];
}

export const HolePunchTemplate: CoreShaderConfig<HolePunchProps> = {
  name: 'HolePunch',
  props: {
    x: 0,
    y: 0,
    width: 50,
    height: 50,
    radius: 0,
  },
};
