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

import type { CoreRenderOp } from './CoreRenderOp.js';

export interface ShaderConfig<T = Record<string, any>> {
  props?: T;
  /**
   * used for making a cache key to check for reusability
   */
  generateKey?: (props: T) => string;
}

export abstract class CoreShader {
  abstract bindRenderOp(
    renderOp: CoreRenderOp,
    props: Record<string, unknown> | null,
  ): void;

  abstract attach(): void;
  abstract detach(): void;
}
