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
}

/**
 * Shader Controller Interface
 *
 * @remarks
 * This interface is used to define the shape of a specific Shader Controller.
 */
export interface ShaderController<S extends keyof ShaderMap>
  extends BaseShaderController {
  type: S;
  shader: InstanceType<ShaderMap[S]>;
  props: ExtractProps<ShaderMap[S]>;
}
