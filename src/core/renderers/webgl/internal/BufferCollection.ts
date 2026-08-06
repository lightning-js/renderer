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

import type { AttributeInfo } from './ShaderUtils.js';

/**
 * Number of 32-bit floats per vertex in the dynamically updated quad buffer:
 * a_position (2) + a_textureCoords (2) + a_color (1 packed 4xUint8). a_nodeCoords
 * lives in a separate static buffer shared by all BufferCollections.
 */
export const QUAD_VERTEX_STRIDE = 5;

export interface BufferItem {
  buffer: WebGLBuffer;
  attributes: Record<string, AttributeInfo>;
}

/**
 * Represents a collection of WebGL Buffers along with their associated
 * vertex attribute formats.
 */
export class BufferCollection {
  constructor(readonly config: BufferItem[]) {}

  /**
   * Get the WebGLBuffer associated with the given attribute name if it exists.
   *
   * @param attributeName
   * @returns
   */
  getBuffer(attributeName: string): WebGLBuffer | undefined {
    return this.config.find((item) => item.attributes[attributeName])?.buffer;
  }

  /**
   * Get the AttributeInfo associated with the given attribute name if it exists.
   *
   * @param attributeName
   * @returns
   */
  getAttributeInfo(attributeName: string): AttributeInfo | undefined {
    return this.config.find((item) => item.attributes[attributeName])
      ?.attributes[attributeName];
  }
}
