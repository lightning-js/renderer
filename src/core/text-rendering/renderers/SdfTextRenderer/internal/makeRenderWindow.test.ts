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

import { expect, describe, it } from 'vitest';
import { makeRenderWindow } from './makeRenderWindow.js';

describe('makeRenderWindow', () => {
  it('should return a empty window when all inputs are zero / empty', () => {
    expect(
      makeRenderWindow(0, 0, 0, 0, 0, { x1: 0, y1: 0, x2: 0, y2: 0 }),
    ).toEqual({
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
    });
    // Visible window is empty
    expect(
      makeRenderWindow(0, 0, 0, 0, 0, { x1: 100, y1: 100, x2: 100, y2: 100 }),
    ).toEqual({
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
    });
  });

  it('should return an empty window when the visible window is empty regardless of other inputs', () => {
    expect(
      makeRenderWindow(100, 200, 300, 10, 3, { x1: 0, y1: 0, x2: 0, y2: 0 }),
    ).toEqual({
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
    });
    expect(
      makeRenderWindow(400, 500, 100, 20, 2, {
        x1: 100,
        y1: 100,
        x2: 100,
        y2: 100,
      }),
    ).toEqual({
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
    });
  });

  it('should return a window with no margin around the visible area if lineHeight and/or numExtraLines set are zero', () => {
    expect(
      makeRenderWindow(0, 0, 0, 0, 0, { x1: 0, y1: 0, x2: 100, y2: 100 }),
    ).toEqual({
      x1: 0,
      y1: 0,
      x2: 100,
      y2: 100,
    });

    expect(
      makeRenderWindow(0, 0, 0, 10, 0, { x1: 0, y1: 0, x2: 100, y2: 100 }),
    ).toEqual({
      x1: 0,
      y1: 0,
      x2: 100,
      y2: 100,
    });

    expect(
      makeRenderWindow(0, 0, 0, 0, 2, { x1: 0, y1: 0, x2: 100, y2: 100 }),
    ).toEqual({
      x1: 0,
      y1: 0,
      x2: 100,
      y2: 100,
    });
  });

  it('should return a window with a margin around the visible area (if lineHeight/numExtraLines set)', () => {
    expect(
      makeRenderWindow(0, 0, 0, 10, 1, { x1: 0, y1: 0, x2: 100, y2: 100 }),
    ).toEqual({
      x1: 0,
      y1: -10,
      x2: 100,
      y2: 110,
    });

    expect(
      makeRenderWindow(0, 0, 0, 5, 3, { x1: 0, y1: 0, x2: 100, y2: 100 }),
    ).toEqual({
      x1: 0,
      y1: -15,
      x2: 100,
      y2: 115,
    });
  });

  it('should return a window scrolled to scrollY when set', () => {
    expect(
      makeRenderWindow(0, 0, 100, 10, 1, { x1: 0, y1: 0, x2: 100, y2: 100 }),
    ).toEqual({
      x1: 0,
      y1: 90,
      x2: 100,
      y2: 210,
    });

    expect(
      makeRenderWindow(0, 0, 200, 10, 1, { x1: 0, y1: 0, x2: 100, y2: 100 }),
    ).toEqual({
      x1: 0,
      y1: 190,
      x2: 100,
      y2: 310,
    });
  });
});
