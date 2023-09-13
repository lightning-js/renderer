/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2023 Comcast
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
 * Core Utility Functions
 *
 * @module
 */

export const EPSILON = 0.000001;
export let ARRAY_TYPE =
  typeof Float32Array !== 'undefined' ? Float32Array : Array;
export const RANDOM = Math.random;
export const ANGLE_ORDER = 'zyx';
const degree = Math.PI / 180;

export const setMatrixArrayType = (
  type: Float32ArrayConstructor | ArrayConstructor,
) => {
  ARRAY_TYPE = type;
};

export const toRadian = (a: number) => {
  return a * degree;
};

export const equals = (a: number, b: number) => {
  return Math.abs(a - b) <= EPSILON * Math.max(1.0, Math.abs(a), Math.abs(b));
};

export const rand = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

export const isPowerOfTwo = (value: number) => {
  return value && !(value & (value - 1));
};

const getTimingBezier = (
  a: number,
  b: number,
  c: number,
  d: number,
): ((time: number) => number | undefined) => {
  const xc = 3.0 * a;
  const xb = 3.0 * (c - a) - xc;
  const xa = 1.0 - xc - xb;
  const yc = 3.0 * b;
  const yb = 3.0 * (d - b) - yc;
  const ya = 1.0 - yc - yb;

  return function (time: number): number | undefined {
    if (time >= 1.0) {
      return 1;
    }
    if (time <= 0) {
      return 0;
    }

    let t = 0.5,
      cbx,
      cbxd,
      dx;

    for (let it = 0; it < 20; it++) {
      cbx = t * (t * (t * xa + xb) + xc);
      dx = time - cbx;
      if (dx > -1e-8 && dx < 1e-8) {
        return t * (t * (t * ya + yb) + yc);
      }

      // Cubic bezier derivative.
      cbxd = t * (t * (3 * xa) + 2 * xb) + xc;

      if (cbxd > 1e-10 && cbxd < 1e-10) {
        // Problematic. Fall back to binary search method.
        break;
      }

      t += dx / cbxd;
    }

    // Fallback: binary search method. This is more reliable when there are near-0 slopes.
    let minT = 0;
    let maxT = 1;
    for (let it = 0; it < 20; it++) {
      t = 0.5 * (minT + maxT);

      cbx = t * (t * (t * xa + xb) + xc);

      dx = time - cbx;
      if (dx > -1e-8 && dx < 1e-8) {
        // Solution found!
        return t * (t * (t * ya + yb) + yc);
      }

      if (dx < 0) {
        maxT = t;
      } else {
        minT = t;
      }
    }
  };
};

export const getTimingFunction = (
  str: string,
): ((time: number) => number | undefined) => {
  switch (str) {
    case 'linear':
      return function (time: number) {
        return time;
      };
    case 'ease':
      return getTimingBezier(0.25, 0.1, 0.25, 1.0);

    case 'ease-in':
      return getTimingBezier(0.42, 0, 1.0, 1.0);
    case 'ease-out':
      return getTimingBezier(0, 0, 0.58, 1.0);
    case 'ease-in-out':
      return getTimingBezier(0.42, 0, 0.58, 1.0);

    case 'ease-in-sine':
      return getTimingBezier(0.12, 0, 0.39, 0);
    case 'ease-out-sine':
      return getTimingBezier(0.12, 0, 0.39, 0);
    case 'ease-in-out-sine':
      return getTimingBezier(0.37, 0, 0.63, 1);

    case 'ease-in-cubic':
      return getTimingBezier(0.32, 0, 0.67, 0);
    case 'ease-out-cubic':
      return getTimingBezier(0.33, 1, 0.68, 1);
    case 'ease-in-out-cubic':
      return getTimingBezier(0.65, 0, 0.35, 1);

    case 'ease-in-circ':
      return getTimingBezier(0.55, 0, 1, 0.45);
    case 'ease-out-circ':
      return getTimingBezier(0, 0.55, 0.45, 1);
    case 'ease-in-out-circ':
      return getTimingBezier(0.85, 0, 0.15, 1);

    case 'ease-in-back':
      return getTimingBezier(0.36, 0, 0.66, -0.56);
    case 'ease-out-back':
      return getTimingBezier(0.34, 1.56, 0.64, 1);
    case 'ease-in-out-back':
      return getTimingBezier(0.68, -0.6, 0.32, 1.6);

    case 'step-start':
      return function () {
        return 1;
      };
    case 'step-end':
      return function (time: number) {
        return time === 1 ? 1 : 0;
      };
    default:
      // eslint-disable-next-line no-case-declarations
      const s = 'cubic-bezier(';
      if (str && str.indexOf(s) === 0) {
        const parts = str
          .substr(s.length, str.length - s.length - 1)
          .split(',');
        if (parts.length !== 4) {
          console.warn('Unknown timing function: ' + str);
          // Fallback: use linear.
          return function (time) {
            return time;
          };
        }
        const a = parseFloat(parts[0] || '0.42');
        const b = parseFloat(parts[1] || '0');
        const c = parseFloat(parts[2] || '1');
        const d = parseFloat(parts[3] || '1');

        if (isNaN(a) || isNaN(b) || isNaN(c) || isNaN(d)) {
          console.warn(' Unknown timing function: ' + str);
          // Fallback: use linear.
          return function (time) {
            return time;
          };
        }

        return getTimingBezier(a, b, c, d);
      } else {
        console.warn('Unknown timing function: ' + str);
        // Fallback: use linear.
        return function (time) {
          return time;
        };
      }
  }
};

if (!Math.hypot)
  Math.hypot = (...args: number[]) => {
    let y = 0,
      i = args.length;
    while (i--) {
      y += args[i]! * args[i]!;
    }
    return Math.sqrt(y);
  };
