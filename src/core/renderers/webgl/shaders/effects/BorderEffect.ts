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

export interface BorderEffectProps extends DefaultEffectProps {
  width?: number;
  color?: number;
}

export class BorderEffect extends ShaderEffect {
  static z$__type__Props: BorderEffectProps;
  override readonly name = 'border';

  static override getEffectKey(): string {
    return `border`;
  }

  static override resolveDefaults(
    props: BorderEffectProps,
  ): Required<BorderEffectProps> {
    return {
      width: props.width ?? 10,
      color: props.color ?? 10,
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

  static override onEffectMask = `
  float mask = clamp(shaderMask + width, 0.0, 1.0) - clamp(shaderMask, 0.0, 1.0);
  return mix(shaderColor, maskColor, mask);
  `;

  static override onColorize = `
    return color;
  `;
}
