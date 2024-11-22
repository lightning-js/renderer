import type { CoreShaderConfig } from '../renderers/CoreShaderProgram.js';

/**
 * Properties of the {@link BorderRight} shader
 */
export interface BorderRightProps {
  /**
   * Width of the BorderRight in pixels
   *
   * @default 10
   */
  width: number;
  /**
   * Color of the BorderRight in 0xRRGGBBAA
   *
   * @default 0xffffffff
   */
  color: number;
}

export const BorderRightTemplate: CoreShaderConfig<BorderRightProps> = {
  name: 'BorderRight',
  props: {
    width: 10,
    color: 0xffffffff,
  },
};
