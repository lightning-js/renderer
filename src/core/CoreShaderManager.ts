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
import type { ExtractProps } from './CoreTextureManager.js';
import type { CoreRenderer } from './renderers/CoreRenderer.js';
import type { CoreShader } from './renderers/CoreShader.js';

import { DefaultShader } from './renderers/webgl/shaders/DefaultShader.js';
import { DefaultShaderBatched } from './renderers/webgl/shaders/DefaultShaderBatched.js';
import { DynamicShader } from './renderers/webgl/shaders/DynamicShader.js';
import { RoundedRectangle } from './renderers/webgl/shaders/RoundedRectangle.js';
import { SdfShader } from './renderers/webgl/shaders/SdfShader.js';

export interface ShaderMap {
  DefaultShader: typeof DefaultShader;
  DefaultShaderBatched: typeof DefaultShaderBatched;
  RoundedRectangle: typeof RoundedRectangle;
  DynamicShader: typeof DynamicShader;
  SdfShader: typeof SdfShader;
}

export type ShaderNode<Type extends keyof ShaderMap> = {
  shader: InstanceType<ShaderMap[Type]>;
  props: Record<string, unknown>;
};

export class CoreShaderManager {
  protected shCache: Map<string, InstanceType<ShaderMap[keyof ShaderMap]>> =
    new Map();
  protected shConstructors: Partial<ShaderMap> = {};
  protected attachedShader: CoreShader | null = null;

  renderer!: CoreRenderer;

  constructor() {
    this.registerShaderType('DefaultShader', DefaultShader);
    this.registerShaderType('DefaultShaderBatched', DefaultShaderBatched);
    this.registerShaderType('RoundedRectangle', RoundedRectangle);
    this.registerShaderType('DynamicShader', DynamicShader);
    this.registerShaderType('SdfShader', SdfShader);
  }

  registerShaderType<Type extends keyof ShaderMap>(
    shType: Type,
    shClass: ShaderMap[Type],
  ): void {
    this.shConstructors[shType] = shClass;
  }

  loadShader<Type extends keyof ShaderMap>(
    shType: Type,
    props?: ExtractProps<ShaderMap[Type]>,
  ): ShaderNode<Type> {
    if (!this.renderer) {
      throw new Error(`Renderer is not been defined`);
    }
    const ShaderClass = this.shConstructors[shType];
    if (!ShaderClass) {
      throw new Error(`Shader type "${shType as string}" is not registered`);
    }
    const resolvedProps = ShaderClass.resolveDefaults(
      props as Record<string, unknown>,
    );
    const cacheKey =
      ShaderClass.makeCacheKey(resolvedProps) || ShaderClass.name;
    if (cacheKey && this.shCache.has(cacheKey)) {
      return {
        shader: this.shCache.get(cacheKey) as InstanceType<ShaderMap[Type]>,
        props: resolvedProps,
      };
    }

    // @ts-expect-error ShaderClass WILL accept a Renderer
    const shader = new ShaderClass(this.renderer, props) as InstanceType<
      ShaderMap[Type]
    >;
    if (cacheKey) {
      this.shCache.set(cacheKey, shader);
    }
    return {
      shader,
      props: resolvedProps,
    };
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
