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
import {
  ShaderEffect,
  type DefaultEffectProps,
  type ShaderEffectUniforms,
} from './ShaderEffect.js';

/**
 * Properties of the {@link RadiusEffect} shader
 */
export interface RadiusEffectProps extends DefaultEffectProps {
  /**
   * Corner radius, in pixels, to cut out of the corners
   *
   * @remarks
   * You can input an array with a length of up to four or a number.
   *
   * array length 4:
   * [topLeft, topRight, bottomRight, bottomLeft]
   *
   * array length 2:
   * [20, 40] -> [20(topLeft), 40(topRight), 20(bottomRight), 40(bottomLeft)]
   *
   * array length 3:
   * [20, 40, 60] -> [20(topLeft), 40(topRight), 60(bottomRight), 20(bottomLeft)]
   *
   * number:
   * 30 -> [30, 30, 30, 30]
   *
   * @default 10
   */
  radius?: number | number[];
}

/**
 * Masks the current maskcolor with rounded corners similar to {@link RoundedRectangle}
 */
export class RadiusEffect extends ShaderEffect {
  static z$__type__Props: RadiusEffectProps;
  override readonly name = 'radius';

  static override getEffectKey(): string {
    return `radius`;
  }

  static override uniforms: ShaderEffectUniforms = {
    radius: {
      value: 0,
      method: 'uniform4fv',
      type: 'vec4',
      validator: (value: number | number[]) => {
        let r = value;
        if (Array.isArray(r)) {
          if (r.length === 2) {
            r = [r[0], r[1], r[0], r[1]] as number[];
          } else if (r.length === 3) {
            r = [r[0], r[1], r[2], r[0]] as number[];
          } else if (r.length !== 4) {
            r = [r[0], r[0], r[0], r[0]] as number[];
          }
        } else if (typeof r === 'number') {
          r = [r, r, r, r];
        }
        return r;
      },
    },
  };

  static override methods: Record<string, string> = {
    fillMask: `
      float function(float dist) {
        return clamp(-dist, 0.0, 1.0);
      }
    `,
    boxDist: `
      float function(vec2 p, vec2 size, float radius) {
        size -= vec2(radius);
        vec2 d = (abs(p) - size);
        float dist = (min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - radius) * u_pixelRatio;
        return dist;
      }
    `,
  };

  static override resolveDefaults(
    props: RadiusEffectProps,
  ): Required<RadiusEffectProps> {
    return {
      radius: props.radius ?? 10,
    };
  }

  static override onShaderMask = `
  vec2 halfDimensions = u_dimensions * 0.5;
  float r = radius[0] * step(v_textureCoordinate.x, 0.5) * step(v_textureCoordinate.y, 0.5);
  r = r + radius[1] * step(0.5, v_textureCoordinate.x) * step(v_textureCoordinate.y, 0.5);
  r = r + radius[2] * step(0.5, v_textureCoordinate.x) * step(0.5, v_textureCoordinate.y);
  r = r + radius[3] * step(v_textureCoordinate.x, 0.5) * step(0.5, v_textureCoordinate.y);
  return $boxDist(v_textureCoordinate.xy * u_dimensions - halfDimensions, halfDimensions, r);
  `;

  static override onEffectMask = `
  return mix(vec4(0.0), maskColor, $fillMask(shaderMask));
  `;
}
