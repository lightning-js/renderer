import type { CoreShaderType } from '../../renderers/CoreShaderNode.js';
import type { PrefixedType } from './shaderUtils.js';

export interface ShadowProps {
  /**
   * Shadow Color
   *
   * @default 0x000000ff
   */
  color: number;
  /**
   * Shadow Projection [offsetX, offsetY, blur, spread]
   *
   * @default [0, 10, 5, 5]
   */
  projection: [number, number, number, number];
  /**
   * OffsetX of Shadow (center)
   */
  x: number;
  /**
   * OffsetY of Shadow (center)
   */
  y: number;
  /**
   * Blur along the edges of the Shadow
   */
  blur: number;
  /**
   * Spread of the shadow compared to node
   */
  spread: number;
}

export function getShadowProps<P extends string>(
  prefix?: P,
): PrefixedType<ShadowProps, P> {
  const pf = prefix && prefix.length > 0 ? `${prefix}-` : '';
  const projection = pf + 'projection';

  return {
    [pf + 'color']: 0x000000ff,
    [projection]: {
      default: [0, 0, 10, 5],
    },
    [pf + 'x']: {
      default: 0,
      set(value, props) {
        props[projection][0] = value;
      },
      get(props) {
        return props[projection][0];
      },
    },
    [pf + 'y']: {
      default: 0,
      set(value, props) {
        props[projection][1] = value;
      },
      get(props) {
        return props[projection][1];
      },
    },
    [pf + 'blur']: {
      default: 10,
      set(value, props) {
        props[projection][2] = value;
      },
      get(props) {
        return props[projection][2];
      },
    },
    [pf + 'spread']: {
      default: 10,
      set(value, props) {
        props[projection][3] = value;
      },
      get(props) {
        return props[projection][3];
      },
    },
  } as PrefixedType<ShadowProps, P>;
}

type PlainShadowProps = PrefixedType<ShadowProps>;

export const ShadowTemplate: CoreShaderType<ShadowProps> = {
  name: 'Shadow',
  props: getShadowProps() as PlainShadowProps,
};
