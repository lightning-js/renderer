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
import type { CoreRenderer } from './renderers/CoreRenderer.js';
import type { CoreShader, ShaderConfig } from './renderers/CoreShader.js';

import { DefaultShader } from './renderers/webgl/shaders/DefaultShader.js';
import { SdfShader } from './renderers/webgl/shaders/SdfShader.js';

import { RadiusEffect } from './renderers/webgl/shaders/effects/RadiusEffect.js';
import { BorderEffect } from './renderers/webgl/shaders/effects/BorderEffect.js';
import {
  LinearGradientEffect,
  type LinearGradientEffectProps,
} from './renderers/webgl/shaders/effects/LinearGradientEffect.js';
import {
  GrayscaleEffect,
  type GrayscaleEffectProps,
} from './renderers/webgl/shaders/effects/GrayscaleEffect.js';
import { BorderRightEffect } from './renderers/webgl/shaders/effects/BorderRightEffect.js';
import { BorderTopEffect } from './renderers/webgl/shaders/effects/BorderTopEffect.js';
import { BorderBottomEffect } from './renderers/webgl/shaders/effects/BorderBottomEffect.js';
import { BorderLeftEffect } from './renderers/webgl/shaders/effects/BorderLeftEffect.js';
import {
  GlitchEffect,
  type GlitchEffectProps,
} from './renderers/webgl/shaders/effects/GlitchEffect.js';
import {
  FadeOutEffect,
  type FadeOutEffectProps,
} from './renderers/webgl/shaders/effects/FadeOutEffect.js';
import {
  RadialGradientEffect,
  type RadialGradientEffectProps,
} from './renderers/webgl/shaders/effects/RadialGradientEffect.js';
import type { WebGlCoreRenderer } from './renderers/webgl/WebGlCoreRenderer.js';
import {
  RadialProgressEffect,
  type RadialProgressEffectProps,
} from './renderers/webgl/shaders/effects/RadialProgressEffect.js';
import {
  HolePunchEffect,
  type HolePunchEffectProps,
} from './renderers/webgl/shaders/effects/HolePunchEffect.js';
import {
  WebGlCoreShader,
  type WebGlShaderConfig,
} from './renderers/webgl/WebGlCoreShader.js';
import { RoundedRectangle } from './renderers/webgl/shaders/RoundedRectangle.js';

export type { FadeOutEffectProps };
export type { LinearGradientEffectProps };
export type { RadialGradientEffectProps };
export type { GrayscaleEffectProps };
export type { GlitchEffectProps };
export type { RadialProgressEffectProps };
export type { HolePunchEffectProps };

export type ExtractShaderProps<Type> = Type extends { props: infer P }
  ? P
  : never;

export interface ShaderMap {
  DefaultShader: typeof DefaultShader;
  // DefaultShaderBatched: typeof DefaultShaderBatched;
  RoundedRectangle: typeof RoundedRectangle;
  // DynamicShader: typeof DynamicShader;
  SdfShader: typeof SdfShader;
  // UnsupportedShader: typeof UnsupportedShader;
}

export interface EffectMap {
  radius: typeof RadiusEffect;
  border: typeof BorderEffect;
  borderBottom: typeof BorderBottomEffect;
  borderLeft: typeof BorderLeftEffect;
  borderRight: typeof BorderRightEffect;
  borderTop: typeof BorderTopEffect;
  fadeOut: typeof FadeOutEffect;
  linearGradient: typeof LinearGradientEffect;
  radialGradient: typeof RadialGradientEffect;
  grayscale: typeof GrayscaleEffect;
  glitch: typeof GlitchEffect;
  radialProgress: typeof RadialProgressEffect;
  holePunch: typeof HolePunchEffect;
}

export type EffectProps =
  | FadeOutEffectProps
  | LinearGradientEffectProps
  | RadialGradientEffectProps
  | GrayscaleEffectProps
  | GlitchEffectProps
  | RadialProgressEffectProps
  | HolePunchEffectProps;

export class CoreShaderManager {
  protected shCache: Map<string, WebGlCoreShader> = new Map();
  protected shConstructors: Record<string, ShaderConfig> = {};
  protected attachedShader: CoreShader | null = null;
  protected effectConstructors: Partial<EffectMap> = {};
  renderer!: CoreRenderer;

  constructor() {
    this.registerShaderType('DefaultShader', DefaultShader);
    // this.registerShaderType('DefaultShaderBatched', DefaultShaderBatched);
    this.registerShaderType('RoundedRectangle', RoundedRectangle);
    // this.registerShaderType('DynamicShader', DynamicShader);
    this.registerShaderType('SdfShader', SdfShader);
  }

  registerShaderType<Type extends keyof ShaderMap, Config extends ShaderConfig>(
    shType: Type,
    shClass: Config | (new () => Config),
  ): void {
    if (typeof shClass === 'function') {
      this.shConstructors[shType] = new shClass();
    } else {
      this.shConstructors[shType] = shClass;
    }
  }

  registerEffectType<Type extends keyof EffectMap>(
    effectType: Type,
    effectClass: EffectMap[Type],
  ): void {
    this.effectConstructors[effectType] = effectClass;
  }

  getRegisteredEffects(): Partial<EffectMap> {
    return this.effectConstructors;
  }

  getRegisteredShaders(): Partial<ShaderMap> {
    return this.shConstructors;
  }

  /**
   * Loads a shader (if not already loaded) and returns a controller for it.
   *
   * @param shType
   * @param props
   * @returns
   */
  loadShader(shType: string, props?: Record<string, unknown>) {
    if (!this.renderer) {
      throw new Error(`Renderer is not been defined`);
    }
    const ShaderConfig = this.shConstructors[shType];
    if (!ShaderConfig) {
      throw new Error(`Shader type "${shType}" is not registered`);
    }

    let cacheKey = shType;

    if (props !== undefined && ShaderConfig.props !== undefined) {
      for (const key in ShaderConfig.props) {
        props[key] = props[key] || ShaderConfig.props;
      }

      if (ShaderConfig.generateKey !== undefined) {
        cacheKey = ShaderConfig.generateKey(props);
      }
    }

    const cachedShader = this.shCache.get(cacheKey);
    if (cachedShader) {
      return {
        shader: cachedShader,
        props,
      };
    }
    const shader = new WebGlCoreShader(
      this.renderer as WebGlCoreRenderer,
      ShaderConfig as WebGlShaderConfig,
    );
    this.shCache.set(cacheKey, shader);
    return {
      shader,
      props,
    };
  }

  // loadDynamicShader<
  //   T extends DynamicEffects<[...{ name?: string; type: keyof EffectMap }[]]>,
  // >(props: DynamicShaderProps): DynamicShaderController<T> {
  //   if (!this.renderer) {
  //     throw new Error(`Renderer is not been defined`);
  //   }
  //   const resolvedProps = DynamicShader.resolveDefaults(
  //     props as Record<string, unknown>,
  //     this.effectConstructors,
  //   );
  //   const cacheKey = DynamicShader.makeCacheKey(
  //     resolvedProps,
  //     this.effectConstructors,
  //   );
  //   if (cacheKey && this.shCache.has(cacheKey)) {
  //     return this._createDynShaderCtr(
  //       this.shCache.get(cacheKey) as InstanceType<ShaderMap['DynamicShader']>,
  //       resolvedProps,
  //     );
  //   }
  //   const shader = new DynamicShader(
  //     this.renderer as WebGlCoreRenderer,
  //     props,
  //     this.effectConstructors,
  //   );
  //   if (cacheKey) {
  //     this.shCache.set(cacheKey, shader);
  //   }

  //   return this._createDynShaderCtr(shader, resolvedProps);
  // }

  // private _createShaderCtr(
  //   type: string,
  //   shader: WebGlCoreShader | UnsupportedShader,
  //   props?: Record<string, unknown>,
  // ) {
  //   return new ShaderController(type, shader, props, this.renderer.stage);
  // }

  // private _createDynShaderCtr<
  //   T extends DynamicEffects<[...{ name?: string; type: keyof EffectMap }[]]>,
  // >(
  //   shader: InstanceType<ShaderMap['DynamicShader']>,
  //   props: ExtractProps<ShaderMap['DynamicShader']>,
  // ): DynamicShaderController<T> {
  //   shader.bindUniformMethods(props);
  //   return new DynamicShaderController(shader, props, this);
  // }

  useShader(shader: CoreShader): void {
    if (this.attachedShader === shader) {
      return;
    }
    if (this.attachedShader) {
      this.attachedShader.detach();
    }
    shader.attach();
    this.attachedShader = shader;
  }
}
