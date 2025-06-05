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
import type { ExtractProps } from './CoreTextureManager.js';
import type { CoreRenderer } from './renderers/CoreRenderer.js';
import type { CoreShader } from './renderers/CoreShader.js';

import { DefaultShader } from './renderers/webgl/shaders/DefaultShader.js';
import { DefaultShaderBatched } from './renderers/webgl/shaders/DefaultShaderBatched.js';
import {
  DynamicShader,
  type DynamicShaderProps,
} from './renderers/webgl/shaders/DynamicShader.js';
import { RoundedRectangle } from './renderers/webgl/shaders/RoundedRectangle.js';
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
import { WebGlCoreShader } from './renderers/webgl/WebGlCoreShader.js';
import { UnsupportedShader } from './renderers/canvas/shaders/UnsupportedShader.js';
import { ShaderController } from '../main-api/ShaderController.js';
import {
  DynamicShaderController,
  type DynamicEffects,
} from '../main-api/DynamicShaderController.js';

export type { FadeOutEffectProps };
export type { LinearGradientEffectProps };
export type { RadialGradientEffectProps };
export type { GrayscaleEffectProps };
export type { GlitchEffectProps };
export type { RadialProgressEffectProps };
export type { HolePunchEffectProps };

export interface ShaderMap {
  DefaultShader: typeof DefaultShader;
  DefaultShaderBatched: typeof DefaultShaderBatched;
  RoundedRectangle: typeof RoundedRectangle;
  DynamicShader: typeof DynamicShader;
  SdfShader: typeof SdfShader;
  UnsupportedShader: typeof UnsupportedShader;
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
  protected shCache: Map<string, InstanceType<ShaderMap[keyof ShaderMap]>> =
    new Map();
  protected shConstructors: Partial<ShaderMap> = {};
  protected attachedShader: CoreShader | null = null;
  protected effectConstructors: Partial<EffectMap> = {};
  renderer!: CoreRenderer;

  constructor() {
    this.registerShaderType('DefaultShader', DefaultShader);
    this.registerShaderType('DefaultShaderBatched', DefaultShaderBatched);
    this.registerShaderType('RoundedRectangle', RoundedRectangle);
    this.registerShaderType('DynamicShader', DynamicShader);
    this.registerShaderType('SdfShader', SdfShader);

    this.registerEffectType('border', BorderEffect);
    this.registerEffectType('borderBottom', BorderBottomEffect);
    this.registerEffectType('borderLeft', BorderLeftEffect);
    this.registerEffectType('borderRight', BorderRightEffect);
    this.registerEffectType('borderTop', BorderTopEffect);
    this.registerEffectType('fadeOut', FadeOutEffect);
    this.registerEffectType('linearGradient', LinearGradientEffect);
    this.registerEffectType('radialGradient', RadialGradientEffect);
    this.registerEffectType('grayscale', GrayscaleEffect);
    this.registerEffectType('glitch', GlitchEffect);
    this.registerEffectType('radius', RadiusEffect);
    this.registerEffectType('radialProgress', RadialProgressEffect);
    this.registerEffectType('holePunch', HolePunchEffect);
  }

  registerShaderType<Type extends keyof ShaderMap>(
    shType: Type,
    shClass: ShaderMap[Type],
  ): void {
    this.shConstructors[shType] = shClass;
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
  loadShader<Type extends keyof ShaderMap>(
    shType: Type,
    props?: ExtractProps<ShaderMap[Type]>,
  ): ShaderController<Type> {
    if (!this.renderer) {
      throw new Error(`Renderer is not been defined`);
    }
    const ShaderClass = this.shConstructors[shType];
    if (!ShaderClass) {
      throw new Error(`Shader type "${shType as string}" is not registered`);
    }

    if (
      this.renderer.mode === 'canvas' &&
      ShaderClass.prototype instanceof WebGlCoreShader
    ) {
      return this._createShaderCtr(
        shType,
        new UnsupportedShader(shType) as InstanceType<ShaderMap[Type]>,
        props as ExtractProps<ShaderMap[Type]>,
      );
    }

    if (shType === 'DynamicShader') {
      return this.loadDynamicShader(
        props as DynamicShaderProps,
      ) as unknown as ShaderController<Type>;
    }

    const resolvedProps = ShaderClass.resolveDefaults(
      props as Record<string, unknown>,
    );
    const cacheKey =
      ShaderClass.makeCacheKey(resolvedProps) || ShaderClass.name;
    if (cacheKey && this.shCache.has(cacheKey)) {
      return this._createShaderCtr(
        shType,
        this.shCache.get(cacheKey) as InstanceType<ShaderMap[Type]>,
        resolvedProps as ExtractProps<ShaderMap[Type]>,
      );
    }

    // @ts-expect-error ShaderClass WILL accept a Renderer
    const shader = new ShaderClass(this.renderer, props) as InstanceType<
      ShaderMap[Type]
    >;
    if (cacheKey) {
      this.shCache.set(cacheKey, shader);
    }
    return this._createShaderCtr(
      shType,
      shader,
      resolvedProps as ExtractProps<ShaderMap[Type]>,
    );
  }

  loadDynamicShader<
    T extends DynamicEffects<[...{ name?: string; type: keyof EffectMap }[]]>,
  >(props: DynamicShaderProps): DynamicShaderController<T> {
    if (!this.renderer) {
      throw new Error(`Renderer is not been defined`);
    }
    const resolvedProps = DynamicShader.resolveDefaults(
      props as Record<string, unknown>,
      this.effectConstructors,
    );
    const cacheKey = DynamicShader.makeCacheKey(
      resolvedProps,
      this.effectConstructors,
    );
    if (cacheKey && this.shCache.has(cacheKey)) {
      return this._createDynShaderCtr(
        this.shCache.get(cacheKey) as InstanceType<ShaderMap['DynamicShader']>,
        resolvedProps,
      );
    }
    const shader = new DynamicShader(
      this.renderer as WebGlCoreRenderer,
      props,
      this.effectConstructors,
    );
    if (cacheKey) {
      this.shCache.set(cacheKey, shader);
    }

    return this._createDynShaderCtr(shader, resolvedProps);
  }

  /**
   * Removes a shader from the shader cache.
   *
   * If the shader is currently attached, it will be detached.
   *
   * @param shaderOrCacheKey - The shader instance or cache key to remove
   * @returns boolean - True if the shader was found and removed, false otherwise.
   */
  removeShader(
    shaderOrCacheKey: string | InstanceType<ShaderMap[keyof ShaderMap]>,
  ): boolean {
    // Handle case where shader instance is provided
    if (typeof shaderOrCacheKey !== 'string') {
      // Find the cache key for this shader instance
      for (const [key, shader] of this.shCache.entries()) {
        if (shader === shaderOrCacheKey) {
          // If this shader is currently attached, detach it
          if (this.attachedShader === shader) {
            this.attachedShader.detach();
            this.attachedShader = null;
          }

          // Remove the shader from the cache
          this.shCache.delete(key);
          return true;
        }
      }
      return false;
    }

    // Handle case where cache key is provided
    const cacheKey = shaderOrCacheKey;
    if (!this.shCache.has(cacheKey)) {
      return false;
    }

    const shader = this.shCache.get(cacheKey);

    // If this shader is currently attached, detach it
    if (this.attachedShader === shader) {
      this.attachedShader.detach();
      this.attachedShader = null;
    }

    // Remove the shader from the cache
    this.shCache.delete(cacheKey);

    return true;
  }

  private _createShaderCtr<Type extends keyof ShaderMap>(
    type: Type,
    shader: InstanceType<ShaderMap[Type]>,
    props: ExtractProps<ShaderMap[Type]>,
  ): ShaderController<Type> {
    return new ShaderController(type, shader, props, this.renderer.stage);
  }

  private _createDynShaderCtr<
    T extends DynamicEffects<[...{ name?: string; type: keyof EffectMap }[]]>,
  >(
    shader: InstanceType<ShaderMap['DynamicShader']>,
    props: ExtractProps<ShaderMap['DynamicShader']>,
  ): DynamicShaderController<T> {
    shader.bindUniformMethods(props);
    return new DynamicShaderController(shader, props, this);
  }

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
