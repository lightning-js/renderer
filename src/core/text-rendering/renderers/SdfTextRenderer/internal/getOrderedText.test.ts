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

import { describe, expect, it } from 'vitest';
import { getOrderedText } from './getOrderedText.js';
import { SpecialCodepoints } from './SpecialCodepoints.js';

describe('getOrderedText()', () => {
  it('should yield a string with the chars in the right order for LTR, RTL and Bidirectional', () => {
    const chars = getOrderedText(true, true, 'Hello أظهر المزيد');

    // Latin (LTR)
    expect(chars[0]).toBe('H'); // H
    expect(chars[1]).toBe('e'); // e
    expect(chars[2]).toBe('l'); // l
    expect(chars[3]).toBe('l'); // l
    expect(chars[4]).toBe('o'); // o
    expect(chars[5]).toBe(' '); // space

    // Arabic (RTL)
    expect(chars[6]).toBe('د'); // د
    expect(chars[7]).toBe('ي'); // ي
    expect(chars[8]).toBe('ز'); // ز
    expect(chars[9]).toBe('م'); // م
    expect(chars[10]).toBe('ل'); // ل
    expect(chars[11]).toBe('ا'); // ا
    expect(chars[12]).toBe(' '); // space
    expect(chars[13]).toBe('ر'); // ر
    expect(chars[14]).toBe('ه'); // ه
    expect(chars[15]).toBe('ظ'); // ظ
    expect(chars[16]).toBe('أ'); // أ
    // expect(chars[17]).toBe(' '); // space
  });
});
