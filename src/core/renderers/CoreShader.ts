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

export abstract class CoreShader {
  /**
   * Flag indicating if this shader has been destroyed
   */
  isDestroyed = false;

  // abstract draw(): void;
  static makeCacheKey(props: Record<string, unknown>): string | false {
    return false;
  }

  static resolveDefaults(
    props: Record<string, unknown>,
  ): Record<string, unknown> {
    return {};
  }

  abstract bindRenderOp(
    renderOp: CoreRenderOp,
    props: Record<string, unknown> | null,
  ): void;
  protected abstract bindProps(props: Record<string, unknown>): void;
  abstract attach(): void;
  abstract detach(): void;

  /**
   * Destroys the shader and cleans up resources
   *
   * @remarks
   * This method must be called when the shader is no longer needed
   * to prevent memory leaks.
   */
  abstract destroy(): void;
}
