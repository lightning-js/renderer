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
import type {
  CoreShaderConfig,
  CoreShaderProgram,
} from './renderers/CoreShaderProgram.js';
import type { Stage } from './Stage.js';

export class CoreShaderManager {
  protected shCache: Map<string, CoreShaderProgram> = new Map();
  protected attachedShader: CoreShaderProgram | null = null;

  constructor(readonly stage: Stage) {}

  /**
   * Loads a shader (if not already loaded) and returns a controller for it.
   *
   * @param shType
   * @param props
   * @returns
   */
  loadShader(shConfig: CoreShaderConfig<any>, props?: Record<string, unknown>) {
    if (!this.stage.renderer) {
      throw new Error(`Renderer is not been defined`);
    }

    let cacheKey = shConfig.name;
    if (shConfig.props !== undefined) {
      props = props || {};

      if (shConfig.validateProps !== undefined) {
        props = shConfig.validateProps(props);
      } else {
        for (const key in shConfig.props) {
          props[key] = props[key] || shConfig.props[key];
        }
      }

      if (shConfig.getCacheMarkers !== undefined) {
        cacheKey += `-${shConfig.getCacheMarkers(props)}`;
      }
    } else {
      props = {};
    }
    const cachedShader = this.shCache.get(cacheKey);
    if (cachedShader) {
      return {
        shader: cachedShader,
        props,
      };
    }

    console.log('create shader program: ', cacheKey);

    const shader = this.stage.renderer.createShaderProgram(shConfig, props);

    this.shCache.set(cacheKey, shader);

    return {
      shader,
      props,
    };
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
