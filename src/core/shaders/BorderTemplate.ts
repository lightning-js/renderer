import type { CoreShaderConfig } from '../renderers/CoreShaderProgram.js';

/**
 * Properties of the {@link Border} shader
 */
export interface BorderProps {
  /**
   * Width of the border in pixels
   *
   * @default 10
   */
  width: number;
  /**
   * Color of the border in 0xRRGGBBAA
   *
   * @default 0xffffffff
   */
  color: number;
}

export const BorderTemplate: CoreShaderConfig<BorderProps> = {
  name: 'Border',
  props: {
    width: 10,
    color: 0xffffffff,
  },
};
