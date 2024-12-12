import type { CoreShaderConfig } from '../renderers/CoreShaderNode.js';

/**
 * Properties of the {@link BorderTop} shader
 */
export interface BorderTopProps {
  /**
   * Width of the BorderTop in pixels
   *
   * @default 10
   */
  width: number;
  /**
   * Color of the BorderTop in 0xRRGGBBAA
   *
   * @default 0xffffffff
   */
  color: number;
}

export const BorderTopTemplate: CoreShaderConfig<BorderTopProps> = {
  name: 'BorderTop',
  props: {
    width: 10,
    color: 0xffffffff,
  },
};
