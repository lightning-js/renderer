import type { CoreShaderType } from '../../renderers/CoreShaderNode.js';
import type { Vec4 } from '../../renderers/webgl/internal/ShaderUtils.js';
import { validateArrayLength4, type PrefixedType } from './shaderUtils.js';

/**
 * Properties of the {@link Border} shader
 */
export interface BorderProps {
  /**
   * Width of the border in pixels
   *
   * @default 0
   */
  width: number | [number, number, number, number];
  /**
   * Color of the border in 0xRRGGBBAA
   *
   * @default 0xffffffff
   */
  color: number;
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

export function getBorderProps<P extends string>(
  prefix?: P,
): PrefixedType<BorderProps, P> {
  const pf = prefix && prefix.length > 0 ? `${prefix}-` : '';
  const width = pf + 'width';
  return {
    [width]: {
      default: [0, 0, 0, 0],
      resolve(value) {
        if (value !== undefined) {
          return validateArrayLength4(value);
        }
        return ([] as number[]).concat(this.default);
      },
    },
    [pf + 'color']: 0xffffffff,
    [pf + 'top']: {
      default: 0,
      set(value, props) {
        (props[width] as Vec4)[0] = value;
      },
      get(props) {
        return (props[width] as Vec4)[0];
      },
    },
    [pf + 'right']: {
      default: 0,
      set(value, props) {
        (props[width] as Vec4)[1] = value;
      },
      get(props) {
        return (props[width] as Vec4)[1];
      },
    },
    [pf + 'bottom']: {
      default: 0,
      set(value, props) {
        (props[width] as Vec4)[2] = value;
      },
      get(props) {
        return (props[width] as Vec4)[2];
      },
    },
    [pf + 'left']: {
      default: 0,
      set(value, props) {
        (props[width] as Vec4)[3] = value;
      },
      get(props) {
        return (props[width] as Vec4)[3];
      },
    },
  } as PrefixedType<BorderProps, P>;
}

type PlainBorderProps = PrefixedType<BorderProps>;

export const BorderTemplate: CoreShaderType<BorderProps> = {
  name: 'Border',
  props: getBorderProps() as PlainBorderProps,
};
