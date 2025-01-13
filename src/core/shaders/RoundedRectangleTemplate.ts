import type { CoreShaderType } from '../renderers/CoreShaderNode.js';
import { validateArrayLength4 } from './shaderUtils.js';

/**
 * Properties of the {@link RoundedRectangle} shader
 */
export interface RoundedRectangleProps {
  /**
   * Corner radius, in pixels, to cut out of the corners
   *
   * @defaultValue 0
   */
  radius: number | number[];
}

export const RoundedRectangleTemplate: CoreShaderType<RoundedRectangleProps> = {
  name: 'RoundedRectangle',
  props: {
    radius: {
      default: [0, 0, 0, 0],
      resolve: validateArrayLength4,
    },
  },
};
