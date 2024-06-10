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
  ShaderEffect,
  type DefaultEffectProps,
  type ShaderEffectUniforms,
} from './ShaderEffect.js';

/**
 * Properties of the {@link BorderEffect} effect
 */
export interface BorderEffectProps extends DefaultEffectProps {
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
 * The BorderEffect renders a border along all edges of an element
 */
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

  static override onEffectMask = `
  float intR = (shaderMask + 1.0 * u_pixelRatio);
  float mask =  clamp(intR + width, 0.0, 1.0) - clamp(intR, 0.0, 1.0);
  return mix(shaderColor, mix(shaderColor, maskColor, maskColor.a), mask);
  `;

  static override onColorize = `
    return color;
  `;
}
