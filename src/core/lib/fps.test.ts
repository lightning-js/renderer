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

import { beforeEach, describe, expect, it } from 'vitest';
import { createFrameCounter, setFpsBoundaries, setFpsInterval } from './fps.js';

describe('fps', () => {
  beforeEach(() => {
    setFpsBoundaries([20, 40, 60, 80, 100]);
    setFpsInterval(1000);
  });

  it('assigns frames to matching buckets and overflow', () => {
    setFpsBoundaries([20, 40]);
    const counter = createFrameCounter(0);

    counter.increment(10);
    counter.increment(20);
    counter.increment(21);
    counter.increment(40);
    counter.increment(41);

    expect(counter.count[20]).toBe(2);
    expect(counter.count[40]).toBe(2);
    expect(counter.count.overflow).toBe(1);
    expect(counter.total).toBe(5);
  });

  it('calculates averageFps from total frames and elapsed interval', () => {
    setFpsInterval(2000);
    const counter = createFrameCounter(100);

    for (let i = 0; i < 10; i++) {
      counter.increment(16);
    }

    expect(counter.averageFps).toBe(5);
  });

  it('keeps counter boundaries and interval when global settings change', () => {
    setFpsBoundaries([10, 20]);
    setFpsInterval(1000);
    const firstCounter = createFrameCounter(0);

    setFpsBoundaries([30, 60]);
    setFpsInterval(2000);
    const secondCounter = createFrameCounter(100);

    firstCounter.increment(15);
    secondCounter.increment(15);

    expect(firstCounter.count[20]).toBe(1);
    expect(firstCounter.count.overflow).toBe(0);
    expect(firstCounter.end).toBe(1000);
    expect(secondCounter.count[30]).toBe(1);
    expect(secondCounter.count.overflow).toBe(0);
    expect(secondCounter.end).toBe(2100);
  });
});
