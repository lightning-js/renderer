import type { CoreShaderConfig } from '../renderers/CoreShaderProgram.js';

/**
 * Properties of the {@link BorderBottom} shader
 */
export interface BorderBottomProps {
  /**
   * Width of the BorderBottom in pixels
   *
   * @default 10
   */
  width: number;
  /**
   * Color of the BorderBottom in 0xRRGGBBAA
   *
   * @default 0xffffffff
   */
  color: number;
}

export const BorderBottomTemplate: CoreShaderConfig<BorderBottomProps> = {
  name: 'BorderBottom',
  props: {
    width: 10,
    color: 0xffffffff,
  },
};
