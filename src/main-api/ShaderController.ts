/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2024 Comcast Cable Communications Management, LLC.
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
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ShaderMap } from '../core/CoreShaderManager.js';
import type { ExtractProps } from '../core/CoreTextureManager.js';
import type { Stage } from '../core/Stage.js';
import type { CoreShader } from '../core/renderers/CoreShader.js';

/**
 * Shader Controller Base Interface
 *
 * @remarks
 * Used directly this interface is like an `any` type for Shader Controllers.
 * But it is also used as a base for more specific Shader Controller interfaces.
 */
export interface BaseShaderController {
  type: keyof ShaderMap;
  shader: CoreShader;
  props: Record<string, any>;
  getResolvedProps: () => Record<string, any>;
}

/**
 * Shader Controller Class
 *
 * @remarks
 * This class is used to control shader props.
 */

export class ShaderController<S extends keyof ShaderMap>
  implements BaseShaderController
{
  private resolvedProps: ExtractProps<ShaderMap[S]>;
  props: ExtractProps<ShaderMap[S]>;
  constructor(
    readonly type: S,
    readonly shader: InstanceType<ShaderMap[S]>,
    props: ExtractProps<ShaderMap[S]>,
    stage: Stage,
  ) {
    this.resolvedProps = props;

    const keys = Object.keys(props);
    const l = keys.length;

    const definedProps = {};
    for (let i = 0; i < l; i++) {
      const name = keys[i]!;
      Object.defineProperty(definedProps, name, {
        get: () => {
          return this.resolvedProps[name as keyof ExtractProps<ShaderMap[S]>];
        },
        set: (value) => {
          this.resolvedProps[name as keyof ExtractProps<ShaderMap[S]>] = value;
          stage.requestRender();
        },
      });
    }
    this.props = definedProps as ExtractProps<ShaderMap[S]>;
  }

  getResolvedProps() {
    return this.resolvedProps;
  }
}
