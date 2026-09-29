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
import { EventEmitter } from './EventEmitter.js';
import { reportLoopError } from './loopError.js';

// Production build: console.error fallback must stay silent. Explicit
// handleLoopError handlers still fire in all environments.
vi.mock('../utils.js', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('../utils.js');
  return {
    ...actual,
    isProductionEnvironment: true,
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loopError production guards', () => {
  it('swallows silently without a handler (no console.error)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => reportLoopError(new Error('boom'))).not.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });

  it('swallows handler throws silently (no console.error)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() =>
      reportLoopError(new Error('app boom'), () => {
        throw new Error('handler boom');
      }),
    ).not.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });

  it('still calls an explicit handler in production', () => {
    const onError = vi.fn();
    const err = new Error('boom');
    expect(() => reportLoopError(err, onError)).not.toThrow();
    expect(onError).toHaveBeenCalledWith(err);
  });

  it('emitSafe stays silent without a handler in production', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const emitter = new EventEmitter();
    const good = vi.fn();
    emitter.on('frameTick', () => {
      throw new Error('bad app code');
    });
    emitter.on('frameTick', good);
    expect(() => emitter.emitSafe('frameTick', {})).not.toThrow();
    expect(good).toHaveBeenCalledTimes(1);
    expect(spy).not.toHaveBeenCalled();
  });
});
