import type { CoreShaderType } from '../renderers/CoreShaderNode.js';
import type { Vec4 } from '../renderers/webgl/internal/ShaderUtils.js';

/**
 * Properties of the {@link Border} shader
 */
export interface BorderProps {
  /**
   * Width of the border in pixels
   *
   * @default 10
   */
  width: number | [number, number, number, number];
  /**
   * Color of the border in 0xRRGGBBAA
   *
   * @default 0xffffffff
   */
  color: number;
  /**
   * Corner radius, in pixels, to cut out of the corners
   *
   * @defaultValue 0
   */
  radius: number | number[];
  /**
   * Top width
   */
  top: number;
  /**
   * Right width
   */
  right: number;
  /**
   * Bottom width
   */
  bottom: number;
  /**
   * Left width
   */
  left: number;
}

export const BorderTemplate: CoreShaderType<BorderProps> = {
  name: 'Border',
  props: {
    width: {
      default: [0, 0, 0, 0],
      resolve(value: number | Vec4) {
        if (!isNaN(value as number)) {
          return [value, value, value, value] as Vec4;
        }
        return value as Vec4;
      },
    },
    color: 0xffffffff,
    radius: 0,
    top: {
      default: 0,
      set(value, props) {
        (props.width as Vec4)[0] = value;
      },
      get(props) {
        return (props.width as Vec4)[0];
      },
    },
    right: {
      default: 0,
      set(value, props) {
        (props.width as Vec4)[1] = value;
      },
      get(props) {
        return (props.width as Vec4)[1];
      },
    },
    bottom: {
      default: 0,
      set(value, props) {
        (props.width as Vec4)[2] = value;
      },
      get(props) {
        return (props.width as Vec4)[2];
      },
    },
    left: {
      default: 0,
      set(value, props) {
        (props.width as Vec4)[3] = value;
      },
      get(props) {
        return (props.width as Vec4)[3];
      },
    },
  },
};
