/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2023 Comcast
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
  ShaderEffect,
  type DefaultEffectProps,
  type ShaderEffectUniforms,
} from './ShaderEffect.js';

/**
 * Properties of the {@link BorderBottomEffect} effect
 */
export interface BorderBottomEffectProps extends DefaultEffectProps {
  /**
   * Width of the border in pixels
   *
   * @default 10
   */
  width?: number;
  /**
   * Color of the border in 0xRRGGBBAA
   *
   * @default 0xffffffff
   */
  color?: number;
}

/**
 * The BorderBottomEffect renders a border on the bottom side of an element
 */
export class BorderBottomEffect extends ShaderEffect {
  static z$__type__Props: BorderBottomEffectProps;
  override readonly name = 'borderBottom';

  static override getEffectKey(): string {
    return `borderBottom`;
  }

  static override resolveDefaults(
    props: BorderBottomEffectProps,
  ): Required<BorderBottomEffectProps> {
    return {
      width: props.width ?? 10,
      color: props.color ?? 0xffffffff,
    };
  }

  static override uniforms: ShaderEffectUniforms = {
    width: {
      value: 0,
      method: 'uniform1f',
      type: 'float',
    },
    color: {
      value: 0xffffffff,
      validator: (rgba): number[] => getNormalizedRgbaComponents(rgba),
      method: 'uniform4fv',
      type: 'vec4',
    },
  };

  static override methods: Record<string, string> = {
    fillMask: `
      float function(float dist) {
        return clamp(-dist, 0.0, 1.0);
      }
    `,
    rectDist: `
      float function(vec2 p, vec2 size) {
        vec2 d = abs(p) - size;
        return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
      }
    `,
  };

  static override onEffectMask = `
  vec2 pos = vec2(0.0, u_dimensions.y - width * 0.5);
  float mask = $rectDist(v_textureCoordinate.xy * u_dimensions - pos, vec2(u_dimensions.x, width*0.5));
  return mix(shaderColor, maskColor, $fillMask(mask));
  `;

  static override onColorize = `
    return color;
  `;
}
