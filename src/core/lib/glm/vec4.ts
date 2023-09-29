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

import {
  EPSILON,
  getMatrixArrayType,
  RANDOM,
  type Float32ArrayLen4,
  type NumberArrayLen4,
} from './common.js';
import type { Mat4 } from './mat4.js';
import type { Quat } from './quat.js';
import type { Quat2 } from './quat2.js';

export type Vec4 = Float32ArrayLen4 | NumberArrayLen4;
/**
 * Creates a new, empty Vec4
 *
 * @returns {Vec4} a new 4D vector
 */

export function create(): Vec4 {
  const out = getMatrixArrayType(4) as Vec4;

  if (!(out instanceof Float32Array)) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
  }

  return out;
}
/**
 * Creates a new Vec4 initialized with values from an existing vector
 *
 * @param {Vec4} a vector to clone
 * @returns {Vec4} a new 4D vector
 */

export function clone(a: Vec4): Vec4 {
  const out = getMatrixArrayType(4) as Vec4;
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  return out;
}
/**
 * Creates a new Vec4 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {Vec4} a new 4D vector
 */

export function fromValues(x: number, y: number, z: number, w: number): Vec4 {
  const out = getMatrixArrayType(4) as Vec4;
  out[0] = x;
  out[1] = y;
  out[2] = z;
  out[3] = w;
  return out;
}
/**
 * Copy the values from one Vec4 to another
 *
 * @param {Vec4} out the receiving vector
 * @param {Vec4} a the source vector
 * @returns {Vec4} out
 */

export function copy(out: Vec4, a: Vec4): Vec4 {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  return out;
}
/**
 * Set the components of a Vec4 to the given values
 *
 * @param {Vec4} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {Vec4} out
 */

export function set(
  out: Vec4,
  x: number,
  y: number,
  z: number,
  w: number,
): Vec4 {
  out[0] = x;
  out[1] = y;
  out[2] = z;
  out[3] = w;
  return out;
}
/**
 * Adds two Vec4's
 *
 * @param {Vec4} out the receiving vector
 * @param {Vec4} a the first operand
 * @param {Vec4} b the second operand
 * @returns {Vec4} out
 */

export function add(out: Vec4, a: Vec4, b: Vec4): Vec4 {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  return out;
}
/**
 * Subtracts vector b from vector a
 *
 * @param {Vec4} out the receiving vector
 * @param {Vec4} a the first operand
 * @param {Vec4} b the second operand
 * @returns {Vec4} out
 */

export function subtract(out: Vec4, a: Vec4, b: Vec4): Vec4 {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  out[3] = a[3] - b[3];
  return out;
}
/**
 * Multiplies two Vec4's
 *
 * @param {Vec4} out the receiving vector
 * @param {Vec4} a the first operand
 * @param {Vec4} b the second operand
 * @returns {Vec4} out
 */

export function multiply(out: Vec4, a: Vec4, b: Vec4): Vec4 {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  out[2] = a[2] * b[2];
  out[3] = a[3] * b[3];
  return out;
}
/**
 * Divides two Vec4's
 *
 * @param {Vec4} out the receiving vector
 * @param {Vec4} a the first operand
 * @param {Vec4} b the second operand
 * @returns {Vec4} out
 */

export function divide(out: Vec4, a: Vec4, b: Vec4): Vec4 {
  out[0] = a[0] / b[0];
  out[1] = a[1] / b[1];
  out[2] = a[2] / b[2];
  out[3] = a[3] / b[3];
  return out;
}
/**
 * Math.ceil the components of a Vec4
 *
 * @param {Vec4} out the receiving vector
 * @param {Vec4} a vector to ceil
 * @returns {Vec4} out
 */

export function ceil(out: Vec4, a: Vec4): Vec4 {
  out[0] = Math.ceil(a[0]);
  out[1] = Math.ceil(a[1]);
  out[2] = Math.ceil(a[2]);
  out[3] = Math.ceil(a[3]);
  return out;
}
/**
 * Math.floor the components of a Vec4
 *
 * @param {Vec4} out the receiving vector
 * @param {Vec4} a vector to floor
 * @returns {Vec4} out
 */

export function floor(out: Vec4, a: Vec4): Vec4 {
  out[0] = Math.floor(a[0]);
  out[1] = Math.floor(a[1]);
  out[2] = Math.floor(a[2]);
  out[3] = Math.floor(a[3]);
  return out;
}
/**
 * Returns the minimum of two Vec4's
 *
 * @param {Vec4} out the receiving vector
 * @param {Vec4} a the first operand
 * @param {Vec4} b the second operand
 * @returns {Vec4} out
 */

export function min(out: Vec4, a: Vec4, b: Vec4): Vec4 {
  out[0] = Math.min(a[0], b[0]);
  out[1] = Math.min(a[1], b[1]);
  out[2] = Math.min(a[2], b[2]);
  out[3] = Math.min(a[3], b[3]);
  return out;
}
/**
 * Returns the maximum of two Vec4's
 *
 * @param {Vec4} out the receiving vector
 * @param {Vec4} a the first operand
 * @param {Vec4} b the second operand
 * @returns {Vec4} out
 */

export function max(out: Vec4, a: Vec4, b: Vec4): Vec4 {
  out[0] = Math.max(a[0], b[0]);
  out[1] = Math.max(a[1], b[1]);
  out[2] = Math.max(a[2], b[2]);
  out[3] = Math.max(a[3], b[3]);
  return out;
}
/**
 * Math.round the components of a Vec4
 *
 * @param {Vec4} out the receiving vector
 * @param {Vec4} a vector to round
 * @returns {Vec4} out
 */

export function round(out: Vec4, a: Vec4): Vec4 {
  out[0] = Math.round(a[0]);
  out[1] = Math.round(a[1]);
  out[2] = Math.round(a[2]);
  out[3] = Math.round(a[3]);
  return out;
}
/**
 * Scales a Vec4 by a scalar number
 *
 * @param {Vec4} out the receiving vector
 * @param {Vec4} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {Vec4} out
 */

export function scale(out: Vec4, a: Vec4, b: number): Vec4 {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  out[3] = a[3] * b;
  return out;
}
/**
 * Adds two Vec4's after scaling the second operand by a scalar value
 *
 * @param {Vec4} out the receiving vector
 * @param {Vec4} a the first operand
 * @param {Vec4} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {Vec4} out
 */

export function scaleAndAdd(out: Vec4, a: Vec4, b: Vec4, scale: number): Vec4 {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  out[2] = a[2] + b[2] * scale;
  out[3] = a[3] + b[3] * scale;
  return out;
}
/**
 * Calculates the euclidian distance between two Vec4's
 *
 * @param {Vec4} a the first operand
 * @param {Vec4} b the second operand
 * @returns {Number} distance between a and b
 */

export function distance(a: Vec4, b: Vec4): number {
  const x = b[0] - a[0];
  const y = b[1] - a[1];
  const z = b[2] - a[2];
  const w = b[3] - a[3];
  return Math.hypot(x, y, z, w);
}
/**
 * Calculates the squared euclidian distance between two Vec4's
 *
 * @param {Vec4} a the first operand
 * @param {Vec4} b the second operand
 * @returns {Number} squared distance between a and b
 */

export function squaredDistance(a: Vec4, b: Vec4): number {
  const x = b[0] - a[0];
  const y = b[1] - a[1];
  const z = b[2] - a[2];
  const w = b[3] - a[3];
  return x * x + y * y + z * z + w * w;
}
/**
 * Calculates the length of a Vec4
 *
 * @param {Vec4} a vector to calculate length of
 * @returns {Number} length of a
 */

export function length(a: Vec4): number {
  const x = a[0];
  const y = a[1];
  const z = a[2];
  const w = a[3];
  return Math.hypot(x, y, z, w);
}
/**
 * Calculates the squared length of a Vec4
 *
 * @param {Vec4} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */

export function squaredLength(a: Vec4 | Quat2): number {
  const x = a[0];
  const y = a[1];
  const z = a[2];
  const w = a[3];
  return x * x + y * y + z * z + w * w;
}
/**
 * Negates the components of a Vec4
 *
 * @param {Vec4} out the receiving vector
 * @param {Vec4} a vector to negate
 * @returns {Vec4} out
 */

export function negate(out: Vec4, a: Vec4): Vec4 {
  out[0] = -a[0];
  out[1] = -a[1];
  out[2] = -a[2];
  out[3] = -a[3];
  return out;
}
/**
 * Returns the inverse of the components of a Vec4
 *
 * @param {Vec4} out the receiving vector
 * @param {Vec4} a vector to invert
 * @returns {Vec4} out
 */

export function inverse(out: Vec4, a: Vec4): Vec4 {
  out[0] = 1.0 / a[0];
  out[1] = 1.0 / a[1];
  out[2] = 1.0 / a[2];
  out[3] = 1.0 / a[3];
  return out;
}
/**
 * Normalize a Vec4
 *
 * @param {Vec4} out the receiving vector
 * @param {Vec4} a vector to normalize
 * @returns {Vec4} out
 */

export function normalize(out: Vec4, a: Vec4): Vec4 {
  const x = a[0];
  const y = a[1];
  const z = a[2];
  const w = a[3];
  let len = x * x + y * y + z * z + w * w;

  if (len > 0) {
    len = 1 / Math.sqrt(len);
  }

  out[0] = x * len;
  out[1] = y * len;
  out[2] = z * len;
  out[3] = w * len;
  return out;
}
/**
 * Calculates the dot product of two Vec4's
 *
 * @param {Vec4} a the first operand
 * @param {Vec4} b the second operand
 * @returns {Number} dot product of a and b
 */

export function dot(a: Vec4 | Quat2, b: Vec4 | Quat2): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
}
/**
 * Returns the cross-product of three vectors in a 4-dimensional space
 *
 * @param {Vec4} out the receiving vector
 * @param {Vec4} u the first vector
 * @param {Vec4} v the second vector
 * @param {Vec4} w the third vector
 * @returns {Vec4} result
 */

export function cross(out: Vec4, u: Vec4, v: Vec4, w: Vec4): Vec4 {
  const A = v[0] * w[1] - v[1] * w[0],
    B = v[0] * w[2] - v[2] * w[0],
    C = v[0] * w[3] - v[3] * w[0],
    D = v[1] * w[2] - v[2] * w[1],
    E = v[1] * w[3] - v[3] * w[1],
    F = v[2] * w[3] - v[3] * w[2];
  const G = u[0];
  const H = u[1];
  const I = u[2];
  const J = u[3];
  out[0] = H * F - I * E + J * D;
  out[1] = -(G * F) + I * C - J * B;
  out[2] = G * E - H * C + J * A;
  out[3] = -(G * D) + H * B - I * A;
  return out;
}
/**
 * Performs a linear interpolation between two Vec4's
 *
 * @param {Vec4} out the receiving vector
 * @param {Vec4} a the first operand
 * @param {Vec4} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {Vec4} out
 */

export function lerp(out: Vec4, a: Vec4, b: Vec4, t: number): Vec4 {
  const ax = a[0];
  const ay = a[1];
  const az = a[2];
  const aw = a[3];
  out[0] = ax + t * (b[0] - ax);
  out[1] = ay + t * (b[1] - ay);
  out[2] = az + t * (b[2] - az);
  out[3] = aw + t * (b[3] - aw);
  return out;
}
/**
 * Generates a random vector with the given scale
 *
 * @param {Vec4} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If omitted, a unit vector will be returned
 * @returns {Vec4} out
 */

export function random(out: Vec4, scale?: number): Vec4 {
  scale = scale ?? 1.0; // Marsaglia, George. Choosing a Point from the Surface of a
  // Sphere. Ann. Math. Statist. 43 (1972), no. 2, 645--646.
  // http://projecteuclid.org/euclid.aoms/1177692644;

  let v1, v2, v3, v4;
  let s1, s2;

  do {
    v1 = RANDOM() * 2 - 1;
    v2 = RANDOM() * 2 - 1;
    s1 = v1 * v1 + v2 * v2;
  } while (s1 >= 1);

  do {
    v3 = RANDOM() * 2 - 1;
    v4 = RANDOM() * 2 - 1;
    s2 = v3 * v3 + v4 * v4;
  } while (s2 >= 1);

  const d = Math.sqrt((1 - s1) / s2);
  out[0] = scale * v1;
  out[1] = scale * v2;
  out[2] = scale * v3 * d;
  out[3] = scale * v4 * d;
  return out;
}
/**
 * Transforms the Vec4 with a Mat4.
 *
 * @param {Vec4} out the receiving vector
 * @param {Vec4} a the vector to transform
 * @param {ReadonlyMat4} m matrix to transform with
 * @returns {Vec4} out
 */

export function transformMat4(out: Vec4, a: Vec4, m: Mat4): Vec4 {
  const x = a[0],
    y = a[1],
    z = a[2],
    w = a[3];
  out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
  out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
  out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
  out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
  return out;
}
/**
 * Transforms the Vec4 with a quat
 *
 * @param {Vec4} out the receiving vector
 * @param {Vec4} a the vector to transform
 * @param {Quat} q quaternion to transform with
 * @returns {Vec4} out
 */

export function transformQuat(out: Vec4, a: Vec4, q: Quat) {
  const x = a[0],
    y = a[1],
    z = a[2];
  const qx = q[0],
    qy = q[1],
    qz = q[2],
    qw = q[3]; // calculate quat * vec

  const ix = qw * x + qy * z - qz * y;
  const iy = qw * y + qz * x - qx * z;
  const iz = qw * z + qx * y - qy * x;
  const iw = -qx * x - qy * y - qz * z; // calculate result * inverse quat

  out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
  out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
  out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
  out[3] = a[3];
  return out;
}
/**
 * Set the components of a Vec4 to zero
 *
 * @param {Vec4} out the receiving vector
 * @returns {Vec4} out
 */

export function zero(out: Vec4) {
  out[0] = 0.0;
  out[1] = 0.0;
  out[2] = 0.0;
  out[3] = 0.0;
  return out;
}
/**
 * Returns a string representation of a vector
 *
 * @param {Vec4} a vector to represent as a string
 * @returns {String} string representation of the vector
 */

export function str(a: Vec4): string {
  return `Vec4(${a[0]}, ${a[1]}, ${a[2]}, ${a[3]})`;
}
/**
 * Returns whether or not the vectors have exactly the same elements in the same position (when compared with ===)
 *
 * @param {Vec4} a The first vector.
 * @param {Vec4} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

export function exactEquals(a: Vec4, b: Vec4): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}
/**
 * Returns whether or not the vectors have approximately the same elements in the same position.
 *
 * @param {Vec4} a The first vector.
 * @param {Vec4} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

export function equals(a: Vec4, b: Vec4): boolean {
  const a0 = a[0],
    a1 = a[1],
    a2 = a[2],
    a3 = a[3];
  const b0 = b[0],
    b1 = b[1],
    b2 = b[2],
    b3 = b[3];
  return (
    Math.abs(a0 - b0) <= EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
    Math.abs(a1 - b1) <= EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) &&
    Math.abs(a2 - b2) <= EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2)) &&
    Math.abs(a3 - b3) <= EPSILON * Math.max(1.0, Math.abs(a3), Math.abs(b3))
  );
}
/**
 * Alias for {@link Vec4.subtract}
 * @function
 */

export const sub = subtract;
/**
 * Alias for {@link Vec4.multiply}
 * @function
 */

export const mul = multiply;
/**
 * Alias for {@link Vec4.divide}
 * @function
 */

export const div = divide;
/**
 * Alias for {@link Vec4.distance}
 * @function
 */

export const dist = distance;
/**
 * Alias for {@link Vec4.squaredDistance}
 * @function
 */

export const sqrDist = squaredDistance;
/**
 * Alias for {@link Vec4.length}
 * @function
 */

export const len = length;
/**
 * Alias for {@link Vec4.squaredLength}
 * @function
 */

export const sqrLen = squaredLength;
/**
 * Perform some operation over an array of Vec4s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each Vec4. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of Vec4s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

export const forEach = (function () {
  const vec = [] as Vec4[];
  return function (
    a: Vec4[],
    stride: number,
    offset: number,
    count: number,
    fn: (a: Vec4[], b: Vec4[], arg: object) => void,
    arg: object,
  ): Vec4[] {
    let i: number, l: number;

    if (!stride) {
      stride = 4;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      /* eslint-disable @typescript-eslint/no-non-null-assertion */
      vec[0] = a[i]!;
      vec[1] = a[i + 1]!;
      vec[2] = a[i + 2]!;
      vec[3] = a[i + 3]!;
      /* eslint-enable @typescript-eslint/no-non-null-assertion */
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
      a[i + 3] = vec[3];
    }

    return a;
  };
})();
