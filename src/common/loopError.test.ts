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

import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  invokeAppCallback,
  invokeAppCallbackWithFallback,
  reportLoopError,
} from './loopError.js';

// Dev build: console.error fallback is enabled here. Production silence is
// covered separately in loopError.prod.test.ts.
vi.mock('../utils.js', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('../utils.js');
  return {
    ...actual,
    isProductionEnvironment: false,
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('reportLoopError', () => {
  it('calls the handler instead of throwing', () => {
    const onError = vi.fn();
    const err = new Error('boom');
    expect(() => reportLoopError(err, onError)).not.toThrow();
    expect(onError).toHaveBeenCalledWith(err);
  });

  it('falls back to console.error without a handler', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const err = new Error('boom');
    expect(() => reportLoopError(err)).not.toThrow();
    expect(spy).toHaveBeenCalledWith(err);
  });

  it('swallows throws from the handler itself', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const handlerError = new Error('handler boom');
    expect(() =>
      reportLoopError(new Error('app boom'), () => {
        throw handlerError;
      }),
    ).not.toThrow();
    expect(spy).toHaveBeenCalledWith(handlerError);
  });
});

describe('invokeAppCallback', () => {
  it('routes listener throws to the handler and continues', () => {
    const onError = vi.fn();
    const good = vi.fn();
    const bad = () => {
      throw new Error('bad listener');
    };
    expect(() => invokeAppCallback(bad, onError)).not.toThrow();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(() => invokeAppCallback(good, onError)).not.toThrow();
    expect(good).toHaveBeenCalledTimes(1);
  });
});

describe('invokeAppCallbackWithFallback', () => {
  it('returns the fallback when the callback throws', () => {
    const onError = vi.fn();
    const result = invokeAppCallbackWithFallback(
      () => {
        throw new Error('bad easing');
      },
      0.5,
      onError,
    );
    expect(result).toBe(0.5);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('returns the value when the callback succeeds', () => {
    expect(invokeAppCallbackWithFallback(() => 0.25, 0.5)).toBe(0.25);
  });
});
