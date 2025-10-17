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
import { updateFloat32ArrayLengthN } from './EffectUtils.js';
import {
  type DefaultEffectProps,
  ShaderEffect,
  type ShaderEffectUniforms,
  type ShaderEffectValueMap,
} from './ShaderEffect.js';

/**
 * Properties of the {@link LinearGradientEffect} effect
 */
export interface LinearGradientEffectProps extends DefaultEffectProps {
  /**
   * Array of colors to be used in the LinearGradientEffect
   *
   * @default [0xff000000, 0xffffffff]
   */
  colors?: number[];
  /**
   * Angle of the LinearGradientEffect, Angle in Radians
   *
   * @default 0
   */
  angle?: number;
  /**
   * Array of color stops
   */
  stops?: number[];
}

/**
 * Linear Gradient effect over a effect mask
 */
export class LinearGradientEffect extends ShaderEffect {
  static z$__type__Props: LinearGradientEffectProps;
  override readonly name = 'linearGradient';

  static override getEffectKey(props: LinearGradientEffectProps): string {
    if ((props.colors as unknown as ShaderEffectValueMap).value as number[]) {
      return `linearGradient${
        ((props.colors as unknown as ShaderEffectValueMap).value as number[])
          .length
      }`;
    }
    return `linearGradient${props.colors!.length}`;
  }

  static override resolveDefaults(
    props: LinearGradientEffectProps,
  ): Required<LinearGradientEffectProps> {
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
      angle: props.angle ?? 0,
    };
  }

  static override uniforms: ShaderEffectUniforms = {
    angle: {
      value: 0,
      method: 'uniform1f',
      type: 'float',
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
      size: (props: LinearGradientEffectProps) => props.colors!.length,
      method: 'uniform4fv',
      type: 'vec4',
    },
    stops: {
      value: [],
      size: (props: LinearGradientEffectProps) => props.colors!.length,
      method: 'uniform1fv',
      type: 'float',
    },
  };

  static override methods: Record<string, string> = {
    calcPoint: `
      vec2 function(float d, float angle) {
        return d * vec2(cos(angle), sin(angle)) + (u_dimensions * 0.5);
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

  static override onColorize = (props: LinearGradientEffectProps) => {
    const colors = props.colors!.length || 1;
    return `
      float a = angle - (PI / 180.0 * 90.0);
      float lineDist = abs(u_dimensions.x * cos(a)) + abs(u_dimensions.y * sin(a));
      vec2 f = $calcPoint(lineDist * 0.5, a);
      vec2 t = $calcPoint(lineDist * 0.5, a + PI);
      vec2 gradVec = t - f;
      float dist = dot(v_textureCoordinate.xy * u_dimensions - f, gradVec) / dot(gradVec, gradVec);

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
