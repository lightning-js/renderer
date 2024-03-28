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
  type DefaultEffectProps,
  ShaderEffect,
  type ShaderEffectUniforms,
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
      method: 'uniform2fv',
      type: 'vec2',
    },
    colors: {
      value: 0xffffffff,
      validator: (rgbas: number[]): number[] => {
        const cols = rgbas.map((rgbas) => getNormalizedRgbaComponents(rgbas));
        return cols.reduce((acc, val) => acc.concat(val), [] as number[]);
      },
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
      vec2 point = v_textureCoordinate.xy * u_dimensions;
      vec2 projection = vec2(pivot.x * u_dimensions.x, pivot.y * u_dimensions.y);

      float dist = length((point - projection) / vec2(width, height));

      float stopCalc = (dist - stops[0]) / (stops[1] - stops[0]);
      vec4 colorOut = mix(colors[0], colors[1], stopCalc);
      ${this.ColorLoop(colors)}
      return mix(maskColor, colorOut, clamp(colorOut.a, 0.0, 1.0));
    `;
  };
}
