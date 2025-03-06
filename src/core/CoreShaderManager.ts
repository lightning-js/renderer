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
import { deepClone } from '../utils.js';
import {
  CoreShaderNode,
  resolveShaderProps,
  type CoreShaderType,
} from './renderers/CoreShaderNode.js';
import type { CoreShaderProgram } from './renderers/CoreShaderProgram.js';
import type { Stage } from './Stage.js';

export interface ShaderMap {
  [key: string]: CoreShaderType<any>;
}

export type ExtractProps<Props> = {
  [K in keyof Props]: Props[K] extends { default: infer D } ? D : Props[K];
};

export type PartialShaderProps<Props> = Partial<ExtractProps<Props>>;
export type ExtractShaderProps<T extends keyof ShaderMap> = ExtractProps<
  ShaderMap[T]['props']
>;
export type OptionalShaderProps<T extends keyof ShaderMap> = PartialShaderProps<
  ShaderMap[T]['props']
>;

export class CoreShaderManager {
  protected shTypes: Record<string, CoreShaderType> = {};
  protected shCache: Map<string, CoreShaderProgram> = new Map();

  /**
   * valuesCache is used to store calculations that can be shared between shader nodes.
   */
  protected valuesCache: Map<string, Record<string, unknown>> = new Map();
  protected valuesCacheUsage: Map<string, number> = new Map();

  protected attachedShader: CoreShaderProgram | null = null;

  constructor(readonly stage: Stage) {}

  registerShaderType<Name extends keyof ShaderMap>(
    name: Name,
    shType: ShaderMap[Name],
  ): void {
    /**
     * block name duplicates
     */
    if (this.shTypes[name as string] !== undefined) {
      console.warn(
        `ShaderType already exists with the name: ${name}. Breaking off registration.`,
      );
      return;
    }
    /**
     * Check renderer if shader type is supported.
     */
    if (this.stage.renderer.supportsShaderType(shType) === false) {
      console.warn(
        `The renderer being used does not support this shader type. Breaking off registration.`,
      );
      return;
    }
    this.shTypes[name as string] = deepClone(shType);
  }

  /**
   * Loads a shader (if not already loaded) and returns a controller for it.
   *
   * @param shType
   * @param props
   * @returns
   */
  createShader<Name extends keyof ShaderMap>(
    name: Name,
    props?: Record<string, unknown>,
  ): CoreShaderNode | null {
    const shType = this.shTypes[name as string] as ShaderMap[Name];
    if (shType === undefined) {
      console.warn(
        `ShaderType not found falling back on renderer default shader`,
      );
      return this.stage.defShaderNode;
    }
    let shaderKey = name as string;
    if (shType.props !== undefined) {
      /**
       * if props is undefined create empty obj to fill
       */
      props = props || {};
      /**
       * resolve shader values
       */
      resolveShaderProps(props, shType.props);
      if (shType.getCacheMarkers !== undefined) {
        shaderKey += `-${shType.getCacheMarkers(props)}`;
      }
    }

    if (this.stage.renderer.mode === 'canvas') {
      return this.stage.renderer.createShaderNode(shaderKey, shType, props);
    }

    /**
     * get shaderProgram by cacheKey
     */
    let shProgram = this.shCache.get(shaderKey);

    /**
     * if shaderProgram was not found create a new one
     */
    if (shProgram === undefined) {
      shProgram = this.stage.renderer.createShaderProgram(shType, props)!;
      this.shCache.set(shaderKey, shProgram);
    }

    return this.stage.renderer.createShaderNode(
      shaderKey,
      shType,
      props,
      shProgram,
    );
  }

  mutateShaderValueUsage(key: string, mutation: number) {
    let usage = this.valuesCacheUsage.get(key) || 0;
    this.valuesCacheUsage.set(key, usage + mutation);
  }

  getShaderValues(key: string) {
    const values = this.valuesCache.get(key);
    if (values === undefined) {
      return undefined;
    }
    this.mutateShaderValueUsage(key, 1);
    return values;
  }

  setShaderValues(key: string, values: Record<string, unknown>) {
    this.valuesCache.set(key, values);
    this.mutateShaderValueUsage(key, 1);
  }

  cleanup() {
    const values = [...this.valuesCacheUsage.entries()].sort(
      (entryA, entryB) => {
        if (entryA[1] < entryB[1]) {
          return -1;
        } else if (entryA[1] > entryB[1]) {
          return 1;
        }
        return 0;
      },
    );

    for (let i = 0; i < values.length; i++) {
      if (values[i]![1] > 0) {
        break;
      }
      this.valuesCacheUsage.delete(values[i]![0]);
      this.valuesCache.delete(values[i]![0]);
    }
  }

  useShader(shader: CoreShaderProgram): void {
    if (this.attachedShader === shader) {
      return;
    }
    if (this.attachedShader && this.attachedShader.detach) {
      this.attachedShader.detach();
    }
    if (shader.attach) {
      shader.attach();
    }
    this.attachedShader = shader;
  }
}
