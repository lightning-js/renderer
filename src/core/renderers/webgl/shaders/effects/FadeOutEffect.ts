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
  updateFloat32ArrayLength4,
  validateArrayLength4,
} from './EffectUtils.js';
import {
  ShaderEffect,
  type DefaultEffectProps,
  type ShaderEffectUniforms,
  type ShaderEffectValueMap,
} from './ShaderEffect.js';

/**
 * Properties of the {@link FadeOutEffect}
 *
 */
export interface FadeOutEffectProps extends DefaultEffectProps {
  /**
   * Fade around the edges of the node
   *
   * @remarks
   * You can input an array with a length of up to four or a number.
   *
   * array length 4:
   * [top, right, bottom, left]
   *
   * array length 2:
   * [20, 40] -> [20(top), 40(right), 20(bottom), 40(left)]
   *
   * array length 3:
   * [20, 40, 60] -> [20(top), 40(right), 60(bottom), 20(left)]
   *
   * number:
   * 30 -> [30, 30, 30, 30]
   *
   * @default 10
   */
  fade?: number | number[];
}

export class FadeOutEffect extends ShaderEffect {
  static z$__type__Props: FadeOutEffectProps;
  override readonly name = 'fadeOut';

  static override getEffectKey(): string {
    return `fadeOut`;
  }

  static override uniforms: ShaderEffectUniforms = {
    fade: {
      value: 0,
      method: 'uniform4fv',
      type: 'vec4',
      validator: validateArrayLength4,
      updateProgramValue: updateFloat32ArrayLength4,
    },
  };

  static override resolveDefaults(
    props: FadeOutEffectProps,
  ): Required<FadeOutEffectProps> {
    return {
      fade: props.fade ?? 10,
    };
  }

  static override onColorize = `
  vec2 point = v_textureCoordinate.xy * u_dimensions.xy;
  vec2 pos1;
  vec2 pos2;
  vec2 d;
  float c;
  vec4 result = maskColor;


  if(fade[0] > 0.0) {
    pos1 = vec2(point.x, point.y);
    pos2 = vec2(point.x, point.y + fade[0]);
    d = pos2 - pos1;
    c = dot(pos1, d) / dot(d, d);
    result = mix(vec4(0.0), result, smoothstep(0.0, 1.0, clamp(c, 0.0, 1.0)));
  }

  if(fade[1] > 0.0) {
    pos1 = vec2(point.x - u_dimensions.x - fade[1], v_textureCoordinate.y);
    pos2 = vec2(point.x - u_dimensions.x, v_textureCoordinate.y);
    d = pos1 - pos2;
    c = dot(pos2, d) / dot(d, d);
    result = mix(vec4(0.0), result, smoothstep(0.0, 1.0, clamp(c, 0.0, 1.0)));
  }

  if(fade[2] > 0.0) {
    pos1 = vec2(v_textureCoordinate.x, point.y - u_dimensions.y - fade[2]);
    pos2 = vec2(v_textureCoordinate.x, point.y - u_dimensions.y);
    d = pos1 - pos2;
    c = dot(pos2, d) / dot(d, d);
    result = mix(vec4(0.0), result, smoothstep(0.0, 1.0, clamp(c, 0.0, 1.0)));
  }

  if(fade[3] > 0.0) {
    pos1 = vec2(point.x, point.y);
    pos2 = vec2(point.x + fade[3], point.y);
    d = pos2 - pos1;
    c = dot(pos1, d) / dot(d, d);
    result = mix(vec4(0.0), result, smoothstep(0.0, 1.0, clamp(c, 0.0, 1.0)));
  }

  return result;
  `;
}
