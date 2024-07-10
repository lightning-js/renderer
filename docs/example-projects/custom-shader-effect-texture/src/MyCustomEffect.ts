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
  type DefaultEffectProps,
  ShaderEffect,
  type ShaderEffectUniforms,
} from '@lightningjs/renderer';

/**
 * Augment the EffectMap interface to include the CustomEffect
 */
declare module '@lightningjs/renderer' {
  interface EffectMap {
    MyCustomEffect: typeof MyCustomEffect;
  }
}

/**
 * Properties of the {@link MyCustomEffect} effect
 */
export interface MyCustomEffectProps extends DefaultEffectProps {
  /**
   * Grey scale amount between 0 - 1.
   *
   * @default 1
   */
  amount?: number;
}

/**
 * Grayscale effect grayscales the color values of the current mask color
 */
export class MyCustomEffect extends ShaderEffect {
  static z$__type__Props: MyCustomEffectProps;
  override readonly name = 'MyCustomEffect';

  static override getEffectKey(): string {
    return `MyCustomEffect`;
  }

  static override resolveDefaults(
    props: MyCustomEffectProps,
  ): Required<MyCustomEffectProps> {
    return {
      amount: props.amount ?? 1,
    };
  }

  static override uniforms: ShaderEffectUniforms = {
    amount: {
      value: 1,
      method: 'uniform1f',
      type: 'float',
    },
  };

  static override onColorize = `
    float grayness = 0.2 * maskColor.r + 0.6 * maskColor.g + 0.2 * maskColor.b;
    return vec4(amount * vec3(grayness) + (1.0 - amount) * maskColor.rgb, maskColor.a);
  `;
}
