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
import { setRenderWindow, type SdfRenderWindow } from './setRenderWindow.js';

function makeRenderWindow(): SdfRenderWindow {
  return {
    screen: { x1: 0, y1: 0, x2: 0, y2: 0 },
    sdf: { x1: 0, y1: 0, x2: 0, y2: 0 },
    firstLineIdx: 0,
    numLines: 0,
    valid: false,
  };
}

describe('setRenderWindow', () => {
  it('should return a empty window when visibleWindow is empty', () => {
    const rw = makeRenderWindow();
    setRenderWindow(rw, 0, 0, 0, 10, 0, { x1: 0, y1: 0, x2: 0, y2: 0 }, 1);
    expect(rw).toEqual({
      screen: { x1: 0, y1: 0, x2: 0, y2: 0 },
      sdf: { x1: 0, y1: 0, x2: 0, y2: 0 },
      firstLineIdx: 0,
      numLines: 0,
      valid: true,
    });

    setRenderWindow(
      rw,
      0,
      0,
      0,
      20,
      0,
      { x1: 100, y1: 100, x2: 100, y2: 100 },
      2,
    );
    expect(rw).toEqual({
      screen: { x1: 0, y1: 0, x2: 0, y2: 0 },
      sdf: { x1: 0, y1: 0, x2: 0, y2: 0 },
      firstLineIdx: 0,
      numLines: 0,
      valid: true,
    });

    setRenderWindow(
      rw,
      100,
      200,
      300,
      10,
      30,
      { x1: 0, y1: 0, x2: 0, y2: 0 },
      1,
    );
    expect(rw).toEqual({
      screen: { x1: 0, y1: 0, x2: 0, y2: 0 },
      sdf: { x1: 0, y1: 0, x2: 0, y2: 0 },
      firstLineIdx: 0,
      numLines: 0,
      valid: true,
    });
    setRenderWindow(
      rw,
      400,
      500,
      100,
      20,
      40,
      {
        x1: 100,
        y1: 100,
        x2: 100,
        y2: 100,
      },
      1,
    ),
      expect(rw).toEqual({
        screen: { x1: 0, y1: 0, x2: 0, y2: 0 },
        sdf: { x1: 0, y1: 0, x2: 0, y2: 0 },
        firstLineIdx: 0,
        numLines: 0,
        valid: true,
      });
  });

  it('should return a window with no margin around the visible area if lineHeight and/or bufferMargin set are zero', () => {
    const rw = makeRenderWindow();

    setRenderWindow(rw, 0, 0, 0, 10, 0, { x1: 0, y1: 0, x2: 100, y2: 100 }, 1),
      expect(rw).toEqual({
        screen: { x1: 0, y1: 0, x2: 100, y2: 100 },
        sdf: { x1: 0, y1: 0, x2: 100, y2: 100 },
        firstLineIdx: 0,
        numLines: 10,
        valid: true,
      });

    setRenderWindow(rw, 0, 0, 0, 10, 0, { x1: 0, y1: 0, x2: 200, y2: 205 }, 2);
    expect(rw).toEqual({
      screen: { x1: 0, y1: 0, x2: 200, y2: 210 },
      sdf: { x1: 0, y1: 0, x2: 100, y2: 105 },
      firstLineIdx: 0,
      numLines: 21,
      valid: true,
    });
  });

  it('should return a window with a margin around the visible area (if boundsMargin set)', () => {
    const rw = makeRenderWindow();

    setRenderWindow(
      rw,
      0,
      0,
      0,
      10,
      100,
      { x1: 0, y1: 0, x2: 100, y2: 100 },
      1,
    ),
      expect(rw).toEqual({
        screen: { x1: 0, y1: -100, x2: 100, y2: 200 },
        sdf: { x1: 0, y1: -100, x2: 100, y2: 200 },
        firstLineIdx: -10,
        numLines: 30,
        valid: true,
      });

    setRenderWindow(
      rw,
      0,
      0,
      0,
      10,
      200,
      { x1: 0, y1: 0, x2: 200, y2: 200 },
      1,
    );
    expect(rw).toEqual({
      screen: { x1: 0, y1: -200, x2: 200, y2: 400 },
      sdf: { x1: 0, y1: -200, x2: 200, y2: 400 },
      firstLineIdx: -20,
      numLines: 60,
      valid: true,
    });
  });

  it('should return a window scrolled to scrollY when set', () => {
    const rw = makeRenderWindow();

    setRenderWindow(
      rw,
      0,
      0,
      100,
      10,
      100,
      { x1: 0, y1: 0, x2: 100, y2: 100 },
      1,
    ),
      expect(rw).toEqual({
        screen: { x1: 0, y1: 0, x2: 100, y2: 300 },
        sdf: { x1: 0, y1: 0, x2: 100, y2: 300 },
        firstLineIdx: 0,
        numLines: 30,
        valid: true,
      });

    setRenderWindow(
      rw,
      0,
      0,
      105,
      10,
      100,
      { x1: 0, y1: 0, x2: 100, y2: 100 },
      1,
    ),
      expect(rw).toEqual({
        screen: { x1: 0, y1: 0, x2: 100, y2: 310 },
        sdf: { x1: 0, y1: 0, x2: 100, y2: 310 },
        firstLineIdx: 0,
        numLines: 31,
        valid: true,
      });
  });
});
