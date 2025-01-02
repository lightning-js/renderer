import type { CoreShaderType } from '../renderers/CoreShaderNode.js';

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

export const BorderBottomTemplate: CoreShaderType<BorderBottomProps> = {
  name: 'BorderBottom',
  props: {
    width: 10,
    color: 0xffffffff,
  },
};
