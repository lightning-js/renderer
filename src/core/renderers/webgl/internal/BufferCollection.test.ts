/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2026 Comcast Cable Communications Management, LLC.
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

import { describe, expect, it } from 'vitest';
import { BufferCollection } from './BufferCollection.js';
import type { AttributeInfo } from './ShaderUtils.js';

const attr = (name: string, offset = 0): AttributeInfo => ({
  name,
  size: 2,
  type: 0x1406,
  normalized: false,
  stride: 20,
  offset,
});

const quadBuffer = { id: 'quad' } as unknown as WebGLBuffer;
const coordsBuffer = { id: 'coords' } as unknown as WebGLBuffer;

const makeCollection = () =>
  new BufferCollection([
    {
      buffer: quadBuffer,
      attributes: {
        a_position: attr('a_position', 0),
        a_textureCoords: attr('a_textureCoords', 8),
      },
    },
    {
      buffer: coordsBuffer,
      attributes: {
        a_nodeCoords: attr('a_nodeCoords'),
      },
    },
  ]);

describe('BufferCollection', () => {
  it('resolves each attribute to the buffer that declares it', () => {
    const collection = makeCollection();

    expect(collection.getAttribute('a_textureCoords')).toEqual({
      buffer: quadBuffer,
      info: attr('a_textureCoords', 8),
    });
    expect(collection.getAttribute('a_nodeCoords')!.buffer).toBe(coordsBuffer);
    expect(collection.getBuffer('a_position')).toBe(quadBuffer);
    expect(collection.getAttributeInfo('a_nodeCoords')).toEqual(
      attr('a_nodeCoords'),
    );
  });

  it('returns undefined for unknown attributes', () => {
    const collection = makeCollection();

    expect(collection.getAttribute('a_style')).toBeUndefined();
    expect(collection.getBuffer('a_style')).toBeUndefined();
    expect(collection.getAttributeInfo('a_style')).toBeUndefined();
  });

  it('uses the first buffer when an attribute is declared twice', () => {
    const collection = new BufferCollection([
      { buffer: quadBuffer, attributes: { a_position: attr('a_position', 0) } },
      {
        buffer: coordsBuffer,
        attributes: { a_position: attr('a_position', 4) },
      },
    ]);

    expect(collection.getBuffer('a_position')).toBe(quadBuffer);
    expect(collection.getAttributeInfo('a_position')!.offset).toBe(0);
  });
});
