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

// Dev build: console.error fallback is enabled here.
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

describe('EventEmitter.emitSafe', () => {
  it('isolates a throwing listener: others still run, error is reported', () => {
    const emitter = new EventEmitter();
    const onError = vi.fn();
    const order: string[] = [];
    emitter.on('frameTick', () => {
      order.push('bad');
      throw new Error('bad app code');
    });
    emitter.on('frameTick', () => {
      order.push('good');
    });

    expect(() =>
      emitter.emitSafe('frameTick', { time: 1 }, onError),
    ).not.toThrow();
    expect(order).toEqual(['good', 'bad']);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('falls back to console.error without a handler', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const emitter = new EventEmitter();
    emitter.on('idle', () => {
      throw new Error('boom');
    });
    expect(() => emitter.emitSafe('idle', undefined)).not.toThrow();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('raw emit still throws (for internal renderer use)', () => {
    const emitter = new EventEmitter();
    emitter.on('tick', () => {
      throw new Error('internal');
    });
    expect(() => emitter.emit('tick')).toThrow('internal');
  });

  it('is a no-op without listeners', () => {
    const emitter = new EventEmitter();
    expect(() => emitter.emitSafe('missing', undefined, vi.fn())).not.toThrow();
  });
});
