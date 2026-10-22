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
  readonly buffer: WebGLBuffer;
  readonly attributes: Readonly<Record<string, Readonly<AttributeInfo>>>;
}

/**
 * A vertex attribute resolved to the buffer that holds it.
 */
export interface BufferAttribute {
  readonly buffer: WebGLBuffer;
  readonly info: Readonly<AttributeInfo>;
}

/**
 * Represents a collection of WebGL Buffers along with their associated
 * vertex attribute formats.
 *
 * @remarks
 * `config` is immutable after construction (enforced by type only, not frozen):
 * attribute lookups are resolved once here because they run per attribute on
 * every shader bind.
 *
 * The lookup table is a plain object (faster than a prototype-less one on old
 * V8), so attribute names must not collide with `Object.prototype` members
 * such as `constructor` or `toString`.
 */
export class BufferCollection {
  private readonly attributes: Record<string, BufferAttribute | undefined> = {};

  constructor(readonly config: ReadonlyArray<BufferItem>) {
    for (let i = 0; i < config.length; i++) {
      const item = config[i]!;
      for (const name in item.attributes) {
        // First buffer declaring an attribute wins
        if (this.attributes[name] === undefined) {
          this.attributes[name] = {
            buffer: item.buffer,
            info: item.attributes[name]!,
          };
        }
      }
    }
  }

  /**
   * Get the buffer and AttributeInfo for the given attribute name if it exists.
   *
   * @param attributeName
   * @returns
   */
  getAttribute(attributeName: string): BufferAttribute | undefined {
    return this.attributes[attributeName];
  }

  /**
   * Get the WebGLBuffer associated with the given attribute name if it exists.
   *
   * @param attributeName
   * @returns
   */
  getBuffer(attributeName: string): WebGLBuffer | undefined {
    const attribute = this.attributes[attributeName];
    return attribute === undefined ? undefined : attribute.buffer;
  }

  /**
   * Get the AttributeInfo associated with the given attribute name if it exists.
   *
   * @param attributeName
   * @returns
   */
  getAttributeInfo(attributeName: string): Readonly<AttributeInfo> | undefined {
    const attribute = this.attributes[attributeName];
    return attribute === undefined ? undefined : attribute.info;
  }
}
