/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2023 Comcast
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
import { PeekableIterator } from './PeekableGenerator.js';

describe('PeekableIterator', () => {
  it('should be able to peek at the next value.', () => {
    const iterator = new PeekableIterator([1, 2, 3].values());
    expect(iterator.peek()).toEqual({ done: false, value: 1 });
    expect(iterator.next()).toEqual({ done: false, value: 1 });
    expect(iterator.peek()).toEqual({ done: false, value: 2 });
    expect(iterator.next()).toEqual({ done: false, value: 2 });
    expect(iterator.peek()).toEqual({ done: false, value: 3 });
    expect(iterator.next()).toEqual({ done: false, value: 3 });
    expect(iterator.peek()).toEqual({ done: true, value: undefined });
    expect(iterator.next()).toEqual({ done: true, value: undefined });
  });

  it('should be able to return the last index of the iterator.', () => {
    const iterator = new PeekableIterator([1, 2, 3].values());
    expect(iterator.lastIndex).toBe(-1);
    iterator.next();
    expect(iterator.lastIndex).toBe(0);
    iterator.next();
    expect(iterator.lastIndex).toBe(1);
    iterator.next();
    expect(iterator.lastIndex).toBe(2);
    iterator.next();
    expect(iterator.lastIndex).toBe(-1);
  });
});
