import type { CoreShaderConfig } from '../renderers/CoreShaderNode.js';

/**
 * Properties of the {@link RoundedRectangle} shader
 */
export interface RoundedRectangleProps {
  /**
   * Corner radius, in pixels, to cut out of the corners
   *
   * @defaultValue 10
   */
  radius: number | number[];
}

export const RoundedRectangleTemplate: CoreShaderConfig<RoundedRectangleProps> =
  {
    name: 'RoundedRectangle',
    props: {
      radius: 10,
    },
  };
