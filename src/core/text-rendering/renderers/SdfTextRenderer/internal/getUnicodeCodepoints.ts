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

// Reversible Generator Wrapper Class

/**
 * Generator function that yields each Unicode code point in the given string.
 */
export function* getUnicodeCodepoints(
  text: string,
  start = 0,
): Generator<number> {
  let i = start;
  while (i < text.length) {
    const codePoint = text.codePointAt(i);
    if (codePoint === undefined) {
      throw new Error('Invalid Unicode code point');
    }
    yield codePoint;
    i += codePoint <= 0xffff ? 1 : 2;
  }
}
