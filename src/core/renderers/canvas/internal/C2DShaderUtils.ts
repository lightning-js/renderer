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

import type { QuadOptions } from '../../CoreRenderer.js';
import {
  ROUNDED_RECTANGLE_SHADER_TYPE,
  UnsupportedShader,
} from '../shaders/UnsupportedShader.js';

/**
 * Extract `RoundedRectangle` shader radius to apply as a clipping
 */
export function getRadius(quad: QuadOptions): number {
  if (quad.shader instanceof UnsupportedShader) {
    const shType = quad.shader.shType;
    if (shType === ROUNDED_RECTANGLE_SHADER_TYPE) {
      return (quad.shaderProps?.radius as number) ?? 0;
    }
  }
  return 0;
}
