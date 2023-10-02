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
import { getUnicodeCodepoints } from './getUnicodeCodepoints.js';
import { SpecialCodepoints } from './SpecialCodepoints.js';

describe('getUnicodeCodePoints()', () => {
  it('should yield unicode code points for each character of the string.', () => {
    const codePoints = getUnicodeCodepoints(
      'Hello. 你好。வணக்கம். שלום. नमस्ते. سلام.🙂😍\u200E\u200F\u202A\u202B\u202C\u202D\u202E\u2066\u2067\u2068\u2069\u206A\u206B\u206C\u206D\u206E\u206F\uFEFF',
    );

    // Latin (LTR)
    expect(codePoints.next().value).toBe(72); // H
    expect(codePoints.next().value).toBe(101); // e
    expect(codePoints.next().value).toBe(108); // l
    expect(codePoints.next().value).toBe(108); // l
    expect(codePoints.next().value).toBe(111); // o
    expect(codePoints.next().value).toBe(46); // .q
    expect(codePoints.next().value).toBe(32); // space
    // Chinese (LTR)
    expect(codePoints.next().value).toBe(20320); // 你
    expect(codePoints.next().value).toBe(22909); // 好
    expect(codePoints.next().value).toBe(12290); // 。
    // Tamil (LTR)
    expect(codePoints.next().value).toBe(2997); // வ
    expect(codePoints.next().value).toBe(2979); // ண
    expect(codePoints.next().value).toBe(2965); // க
    expect(codePoints.next().value).toBe(3021); // ்
    expect(codePoints.next().value).toBe(2965); // க
    expect(codePoints.next().value).toBe(2990); // ம
    expect(codePoints.next().value).toBe(3021); // ்
    expect(codePoints.next().value).toBe(46); // .
    expect(codePoints.next().value).toBe(32); // space
    // Hebrew (RTL)
    expect(codePoints.next().value).toBe(1513); // ש
    expect(codePoints.next().value).toBe(1500); // ל
    expect(codePoints.next().value).toBe(1493); // ש
    expect(codePoints.next().value).toBe(1501); // ם
    expect(codePoints.next().value).toBe(46); // .
    expect(codePoints.next().value).toBe(32); // space
    // Hindi (LTR)
    expect(codePoints.next().value).toBe(2344); // न
    expect(codePoints.next().value).toBe(2350); // म
    expect(codePoints.next().value).toBe(2360); // स
    expect(codePoints.next().value).toBe(2381); // ्
    expect(codePoints.next().value).toBe(2340); // त
    expect(codePoints.next().value).toBe(2375); // े
    expect(codePoints.next().value).toBe(46); // .
    expect(codePoints.next().value).toBe(32); // space
    // Arabic (RTL)
    expect(codePoints.next().value).toBe(1587); // س
    expect(codePoints.next().value).toBe(1604); // ل
    expect(codePoints.next().value).toBe(1575); // ا
    expect(codePoints.next().value).toBe(1605); // م
    expect(codePoints.next().value).toBe(46); // .

    // Emoji (LTR)
    expect(codePoints.next().value).toBe(128578); // 🙂
    expect(codePoints.next().value).toBe(128525); // 😍

    // Unicode control characters
    expect(codePoints.next().value).toBe(SpecialCodepoints.LEFT_TO_RIGHT_MARK); // LEFT-TO-RIGHT MARK
    expect(codePoints.next().value).toBe(SpecialCodepoints.RIGHT_TO_LEFT_MARK); // RIGHT-TO-LEFT MARK
    expect(codePoints.next().value).toBe(
      SpecialCodepoints.LEFT_TO_RIGHT_EMBEDDING,
    ); // LEFT-TO-RIGHT EMBEDDING
    expect(codePoints.next().value).toBe(
      SpecialCodepoints.RIGHT_TO_LEFT_EMBEDDING,
    ); // RIGHT-TO-LEFT EMBEDDING
    expect(codePoints.next().value).toBe(
      SpecialCodepoints.POP_DIRECTIONAL_FORMATTING,
    ); // POP DIRECTIONAL FORMATTING
    expect(codePoints.next().value).toBe(
      SpecialCodepoints.LEFT_TO_RIGHT_OVERRIDE,
    ); // LEFT-TO-RIGHT OVERRIDE
    expect(codePoints.next().value).toBe(
      SpecialCodepoints.RIGHT_TO_LEFT_OVERRIDE,
    ); // RIGHT-TO-LEFT OVERRIDE
    expect(codePoints.next().value).toBe(
      SpecialCodepoints.LEFT_TO_RIGHT_ISOLATE,
    ); // LEFT-TO-RIGHT ISOLATE
    expect(codePoints.next().value).toBe(
      SpecialCodepoints.RIGHT_TO_LEFT_ISOLATE,
    ); // RIGHT-TO-LEFT ISOLATE
    expect(codePoints.next().value).toBe(
      SpecialCodepoints.FIRST_STRONG_ISOLATE,
    ); // FIRST STRONG ISOLATE
    expect(codePoints.next().value).toBe(
      SpecialCodepoints.POP_DIRECTIONAL_ISOLATE,
    ); // POP DIRECTIONAL ISOLATE
    expect(codePoints.next().value).toBe(
      SpecialCodepoints.INHIBIT_SYMMETRIC_SWAPPING,
    ); // INHIBIT SYMMETRIC SWAPPING
    expect(codePoints.next().value).toBe(
      SpecialCodepoints.ACTIVATE_SYMMETRIC_SWAPPING,
    ); // ACTIVATE SYMMETRIC SWAPPING
    expect(codePoints.next().value).toBe(
      SpecialCodepoints.INHIBIT_ARABIC_FORM_SHAPING,
    ); // INHIBIT ARABIC FORM SHAPING
    expect(codePoints.next().value).toBe(
      SpecialCodepoints.ACTIVATE_ARABIC_FORM_SHAPING,
    ); // ACTIVATE ARABIC FORM SHAPING
    expect(codePoints.next().value).toBe(
      SpecialCodepoints.NATIONAL_DIGIT_SHAPES,
    ); // NATIONAL DIGIT SHAPES
    expect(codePoints.next().value).toBe(
      SpecialCodepoints.NOMINAL_DIGIT_SHAPES,
    ); // NOMINAL DIGIT SHAPES
    expect(codePoints.next().value).toBe(
      SpecialCodepoints.ZERO_WIDTH_NO_BREAK_SPACE,
    ); // ZERO WIDTH NO-BREAK SPACE
    // End of string
    expect(codePoints.next().done).toBe(true);
  });
});
