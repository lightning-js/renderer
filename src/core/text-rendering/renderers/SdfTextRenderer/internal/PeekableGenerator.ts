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

/**
 * A wrapper Generator class that makes a generator peekable.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class PeekableIterator<T = unknown, TReturn = any, TNext = unknown>
  implements Iterator<T, TReturn, TNext>
{
  private peekBuffer: IteratorResult<T, TReturn>[] = [];
  private _lastIndex;

  constructor(private iterator: Iterator<T, TReturn, TNext>, indexBase = 0) {
    this.iterator = iterator;
    this._lastIndex = indexBase - 1;
    this.peekBuffer = [];
  }

  next(): IteratorResult<T, TReturn> {
    const nextResult =
      this.peekBuffer.length > 0
        ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.peekBuffer.pop()!
        : this.iterator.next();

    if (nextResult.done) {
      this._lastIndex = -1;
    } else {
      this._lastIndex++;
    }
    return nextResult;
  }

  peek(): IteratorResult<T, TReturn> {
    if (this.peekBuffer.length > 0) {
      // We know that the buffer is not empty, so we can safely use the
      // non-null assertion operator
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return this.peekBuffer[0]!;
    }
    const result = this.iterator.next();
    this.peekBuffer.push(result);
    return result;
  }

  get lastIndex(): number {
    return this._lastIndex;
  }
}
