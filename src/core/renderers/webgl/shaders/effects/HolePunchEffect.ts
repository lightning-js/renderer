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
export interface HolePunchEffectProps extends DefaultEffectProps {
  /**
   * X position where the hole punch starts
   */
  x?: number;
  /**
   * Y position where the hole punch starts
   */
  y?: number;
  /**
   * Width of the hole punch
   */
  width?: number;
  /**
   * height of the hole punch
   *
   * @remarks if not defined uses the width value
   */
  height?: number;
  /**
   * Corner radius in pixels, to cut out of the corners of the hole punch
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
 * Masks the current maskcolor a holepunch effect with rounded corners similar to {@link RoundedRectangle}
 */
export class HolePunchEffect extends ShaderEffect {
  static z$__type__Props: HolePunchEffectProps;
  override readonly name = 'holePunch';

  static override getEffectKey(): string {
    return `holePunch`;
  }

  static override uniforms: ShaderEffectUniforms = {
    x: {
      value: 0,
      method: 'uniform1f',
      type: 'float',
    },
    y: {
      value: 0,
      method: 'uniform1f',
      type: 'float',
    },
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

  static override resolveDefaults(
    props: HolePunchEffectProps,
  ): Required<HolePunchEffectProps> {
    return {
      x: props.x || 0,
      y: props.y || 0,
      width: props.width || 50,
      height: props.height || 50,
      radius: props.radius ?? 10,
    };
  }

  static override methods: Record<string, string> = {
    fillMask: `
      float function(float dist) {
        return clamp(-dist, 0.0, 1.0);
      }
    `,
    boxDist: `
      float function(vec2 p, vec2 size, float radius) {
        size -= vec2(radius);
        vec2 d = abs(p) - size;
        return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - radius;
      }
    `,
  };

  static override onShaderMask = `
  vec2 halfDimensions = u_dimensions * 0.5;
  vec2 size = vec2(width, height) * 0.5;
  vec2 basePos = v_textureCoordinate.xy * u_dimensions.xy - vec2(x, y);
  vec2 pos = basePos - size;
  float r = radius[0] * step(pos.x, 0.5) * step(pos.y, 0.5);
  r = r + radius[1] * step(0.5, pos.x) * step(pos.y, 0.5);
  r = r + radius[2] * step(0.5, pos.x) * step(0.5, pos.y);
  r = r + radius[3] * step(pos.x, 0.5) * step(0.5, pos.y);
  return $boxDist(pos, size, r);
  `;

  static override onEffectMask = `
  return mix(maskColor, vec4(0.0), $fillMask(shaderMask));
  `;
}
