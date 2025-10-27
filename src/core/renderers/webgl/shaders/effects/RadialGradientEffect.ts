/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2023 Comcast Cable Communications Management, LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { getNormalizedRgbaComponents } from '../../../../lib/utils.js';
import {
  updateFloat32ArrayLength2,
  updateFloat32ArrayLengthN,
} from './EffectUtils.js';
import {
  type DefaultEffectProps,
  ShaderEffect,
  type ShaderEffectUniforms,
  type ShaderEffectValueMap,
} from './ShaderEffect.js';

/**
 * Properties of the {@link RadialGradientEffect} effect
 */
export interface RadialGradientEffectProps extends DefaultEffectProps {
  /**
   * Array of colors to be used in the RadialGradientEffect
   *
   * @default [0xff000000, 0xffffffff]
   */
  colors?: number[];
  /**
   * Array of color stops
   */
  stops?: number[];
  /**
   * Width of the RadialGradientEffect
   */
  width?: number;
  /**
   * height of the RadialGradientEffect
   *
   * @remarks if not defined uses the width value
   */
  height?: number;
  /**
   * center point of where the RadialGradientEffect is drawn
   */
  pivot?: number[];
}

export class RadialGradientEffect extends ShaderEffect {
  static z$__type__Props: RadialGradientEffectProps;
  override readonly name = 'radialGradient';

  static override getEffectKey(props: RadialGradientEffectProps): string {
    if ((props.colors as unknown as ShaderEffectValueMap).value as number[]) {
      return `radialGradient${
        ((props.colors as unknown as ShaderEffectValueMap).value as number[])
          .length
      }`;
    }
    return `radialGradient${props.colors!.length}`;
  }

  static override resolveDefaults(
    props: RadialGradientEffectProps,
  ): Required<RadialGradientEffectProps> {
    const colors = props.colors ?? [0xff000000, 0xffffffff];

    let stops = props.stops || [];
    if (stops.length === 0 || stops.length !== colors.length) {
      const colorsL = colors.length;
      let i = 0;
      const tmp = stops;
      for (; i < colorsL; i++) {
        if (stops[i]) {
          tmp[i] = stops[i]!;
          if (stops[i - 1] === undefined && tmp[i - 2] !== undefined) {
            tmp[i - 1] = tmp[i - 2]! + (stops[i]! - tmp[i - 2]!) / 2;
          }
        } else {
          tmp[i] = i * (1 / (colors.length - 1));
        }
      }
      stops = tmp;
    }
    return {
      colors,
      stops,
      width: props.width ?? 0,
      height: props.height ?? props.width ?? 0,
      pivot: props.pivot ?? [0.5, 0.5],
    };
  }

  static override uniforms: ShaderEffectUniforms = {
    width: {
      value: 0,
      method: 'uniform1f',
      type: 'float',
    },
    height: {
      value: 0,
      method: 'uniform1f',
      type: 'float',
    },
    pivot: {
      value: [0.5, 0.5],
      updateProgramValue: updateFloat32ArrayLength2,
      method: 'uniform2fv',
      type: 'vec2',
    },
    colors: {
      value: 0xffffffff,
      validator: (rgbas: number[]): number[] => {
        return rgbas.reduce(
          (acc, val) => acc.concat(getNormalizedRgbaComponents(val)),
          [] as number[],
        );
      },
      updateProgramValue: updateFloat32ArrayLengthN,
      size: (props: RadialGradientEffectProps) => props.colors!.length,
      method: 'uniform4fv',
      type: 'vec4',
    },
    stops: {
      value: [],
      size: (props: RadialGradientEffectProps) => props.colors!.length,
      method: 'uniform1fv',
      type: 'float',
    },
  };

  static override methods: Record<string, string> = {
    getGradientColor: `
      float function(float dist) {
        return clamp(-dist, 0.0, 1.0);
      }
    `,
  };

  static ColorLoop = (amount: number): string => {
    let loop = '';
    for (let i = 2; i < amount; i++) {
      loop += `colorOut = mix(colorOut, colors[${i}], clamp((dist - stops[${
        i - 1
      }]) / (stops[${i}] - stops[${i - 1}]), 0.0, 1.0));`;
    }
    return loop;
  };

  static override onColorize = (props: RadialGradientEffectProps) => {
    const colors = props.colors!.length || 1;
    return `
      vec2 point = v_nodeCoordinate.xy * u_dimensions;
      vec2 projection = vec2(pivot.x * u_dimensions.x, pivot.y * u_dimensions.y);

      float dist = length((point - projection) / vec2(width, height));

      dist = clamp(dist, 0.0, 1.0);
      //return early if dist is lower or equal to first stop
      if(dist <= stops[0]) {
        return mix(maskColor, colors[0], clamp(colors[0].a, 0.0, 1.0));
      }
      const int amount = ${colors};
      const int last = amount - 1;

      if(dist >= stops[last]) {
        return mix(maskColor, colors[last], clamp(colors[last].a, 0.0, 1.0));
      }

      for(int i = 0; i < last; i++) {
        float left = stops[i];
        float right = stops[i + 1];
        if(dist >= left && dist <= right) {
          float localDist = smoothstep(left, right, dist);
          vec4 colorOut = mix(colors[i], colors[i + 1], localDist);
          return mix(maskColor, colorOut, clamp(colorOut.a, 0.0, 1.0));
        }
      }

      //final fallback
      return mix(maskColor, colors[last], clamp(colors[last].a, 0.0, 1.0));
    `;
  };
}
