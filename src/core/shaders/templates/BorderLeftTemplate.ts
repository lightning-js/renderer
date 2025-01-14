import type { CoreShaderType } from '../../renderers/CoreShaderNode.js';

/**
 * Properties of the {@link BorderLeft} shader
 */
export interface BorderLeftProps {
  /**
   * Width of the BorderLeft in pixels
   *
   * @default 10
   */
  width: number;
  /**
   * Color of the BorderLeft in 0xRRGGBBAA
   *
   * @default 0xffffffff
   */
  color: number;
}

export const BorderLeftTemplate: CoreShaderType<BorderLeftProps> = {
  name: 'BorderLeft',
  props: {
    width: 10,
    color: 0xffffffff,
  },
};
