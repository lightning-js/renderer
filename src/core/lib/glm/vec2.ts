import {
  EPSILON,
  getMatrixArrayType,
  RANDOM,
  type Float32ArrayLen2,
  type NumberArrayLen2,
} from './common.js';

import { type Vec3 } from './vec3.js';
import { type Mat2d } from './mat2d.js';
import { type Mat3 } from './mat3.js';
import { type Mat4 } from './mat4.js';
import { type Mat2 } from './mat2.js';

export type Vec2 = Float32ArrayLen2 | NumberArrayLen2;

/**
 * Creates a new, empty Vec2
 *
 * @returns {Vec2} a new 2D vector
 */

export function create(): Vec2 {
  var out = getMatrixArrayType(2) as Vec2;

  if (!(out instanceof Float32Array)) {
    out[0] = 0;
    out[1] = 0;
  }

  return out;
}

/**
 * Creates a new Vec2 initialized with values from an existing vector
 *
 * @param {Vec2} a vector to clone
 * @returns {Vec2} a new 2D vector
 */
export function clone(a: Vec2): Vec2 {
  var out = getMatrixArrayType(2) as Vec2;
  out[0] = a[0];
  out[1] = a[1];
  return out;
}

/**
 * Creates a new Vec2 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @returns {Vec2} a new 2D vector
 */
export function fromValues(x: number, y: number): Vec2 {
  var out = getMatrixArrayType(2) as Vec2;
  out[0] = x;
  out[1] = y;
  return out;
}

/**
 * Copy the values from one Vec2 to another
 *
 * @param {Vec2} out the receiving vector
 * @param {Vec2} a the source vector
 * @returns {Vec2} out
 */

export function copy(out: Vec2, a: Vec2): Vec2 {
  out[0] = a[0];
  out[1] = a[1];
  return out;
}
/**
 * Set the components of a Vec2 to the given values
 *
 * @param {Vec2} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @returns {Vec2} out
 */

export function set(out: Vec2, x: number, y: number): Vec2 {
  out[0] = x;
  out[1] = y;
  return out;
}

/**
 * Adds two Vec2's
 *
 * @param {Vec2} out the receiving vector
 * @param {Vec2} a the first operand
 * @param {Vec2} b the second operand
 * @returns {Vec2} out
 */

export function add(out: Vec2, a: Vec2, b: Vec2): Vec2 {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  return out;
}

/**
 * Subtracts vector b from vector a
 *
 * @param {Vec2} out the receiving vector
 * @param {Vec2} a the first operand
 * @param {Vec2} b the second operand
 * @returns {Vec2} out
 */

export function subtract(out: Vec2, a: Vec2, b: Vec2): Vec2 {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  return out;
}

/**
 * Multiplies two Vec2's
 *
 * @param {Vec2} out the receiving vector
 * @param {Vec2} a the first operand
 * @param {Vec2} b the second operand
 * @returns {Vec2} out
 */

export function multiply(out: Vec2, a: Vec2, b: Vec2): Vec2 {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  return out;
}
/**
 * Divides two Vec2's
 *
 * @param {Vec2} out the receiving vector
 * @param {Vec2} a the first operand
 * @param {Vec2} b the second operand
 * @returns {Vec2} out
 */

export function divide(out: Vec2, a: Vec2, b: Vec2): Vec2 {
  out[0] = a[0] / b[0];
  out[1] = a[1] / b[1];
  return out;
}
/**
 * Math.ceil the components of a Vec2
 *
 * @param {Vec2} out the receiving vector
 * @param {Vec2} a vector to ceil
 * @returns {Vec2} out
 */

export function ceil(out: Vec2, a: Vec2): Vec2 {
  out[0] = Math.ceil(a[0]);
  out[1] = Math.ceil(a[1]);
  return out;
}
/**
 * Math.floor the components of a Vec2
 *
 * @param {Vec2} out the receiving vector
 * @param {Vec2} a vector to floor
 * @returns {Vec2} out
 */

export function floor(out: Vec2, a: Vec2): Vec2 {
  out[0] = Math.floor(a[0]);
  out[1] = Math.floor(a[1]);
  return out;
}
/**
 * Returns the minimum of two Vec2's
 *
 * @param {Vec2} out the receiving vector
 * @param {Vec2} a the first operand
 * @param {Vec2} b the second operand
 * @returns {Vec2} out
 */

export function min(out: Vec2, a: Vec2, b: Vec2): Vec2 {
  out[0] = Math.min(a[0], b[0]);
  out[1] = Math.min(a[1], b[1]);
  return out;
}
/**
 * Returns the maximum of two Vec2's
 *
 * @param {Vec2} out the receiving vector
 * @param {Vec2} a the first operand
 * @param {Vec2} b the second operand
 * @returns {Vec2} out
 */

export function max(out: Vec2, a: Vec2, b: Vec2): Vec2 {
  out[0] = Math.max(a[0], b[0]);
  out[1] = Math.max(a[1], b[1]);
  return out;
}
/**
 * Math.round the components of a Vec2
 *
 * @param {Vec2} out the receiving vector
 * @param {Vec2} a vector to round
 * @returns {Vec2} out
 */

export function round(out: Vec2, a: Vec2): Vec2 {
  out[0] = Math.round(a[0]);
  out[1] = Math.round(a[1]);
  return out;
}
/**
 * Scales a Vec2 by a scalar number
 *
 * @param {Vec2} out the receiving vector
 * @param {Vec2} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {Vec2} out
 */

export function scale(out: Vec2, a: Vec2, b: number): Vec2 {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  return out;
}

/**
 * Adds two Vec2's after scaling the second operand by a scalar value
 *
 * @param {Vec2} out the receiving vector
 * @param {Vec2} a the first operand
 * @param {Vec2} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {Vec2} out
 */

export function scaleAndAdd(out: Vec2, a: Vec2, b: Vec2, scale: number): Vec2 {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  return out;
}

/**
 * Calculates the euclidian distance between two Vec2's
 *
 * @param {Vec2} a the first operand
 * @param {Vec2} b the second operand
 * @returns {Number} distance between a and b
 */

export function distance(a: Vec2, b: Vec2): number {
  var x = b[0] - a[0],
    y = b[1] - a[1];
  return Math.hypot(x, y);
}
/**
 * Calculates the squared euclidian distance between two Vec2's
 *
 * @param {Vec2} a the first operand
 * @param {Vec2} b the second operand
 * @returns {Number} squared distance between a and b
 */

export function squaredDistance(a: Vec2, b: Vec2): number {
  var x = b[0] - a[0],
    y = b[1] - a[1];
  return x * x + y * y;
}
/**
 * Calculates the length of a Vec2
 *
 * @param {Vec2} a vector to calculate length of
 * @returns {Number} length of a
 */

export function length(a: Vec2): number {
  var x = a[0],
    y = a[1];
  return Math.hypot(x, y);
}
/**
 * Calculates the squared length of a Vec2
 *
 * @param {Vec2} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */

export function squaredLength(a: Vec2): number {
  var x = a[0],
    y = a[1];
  return x * x + y * y;
}
/**
 * Negates the components of a Vec2
 *
 * @param {Vec2} out the receiving vector
 * @param {Vec2} a vector to negate
 * @returns {Vec2} out
 */

export function negate(out: Vec2, a: Vec2): Vec2 {
  out[0] = -a[0];
  out[1] = -a[1];
  return out;
}
/**
 * Returns the inverse of the components of a Vec2
 *
 * @param {Vec2} out the receiving vector
 * @param {Vec2} a vector to invert
 * @returns {Vec2} out
 */

export function inverse(out: Vec2, a: Vec2): Vec2 {
  out[0] = 1.0 / a[0];
  out[1] = 1.0 / a[1];
  return out;
}
/**
 * Normalize a Vec2
 *
 * @param {Vec2} out the receiving vector
 * @param {Vec2} a vector to normalize
 * @returns {Vec2} out
 */

export function normalize(out: Vec2, a: Vec2): Vec2 {
  var x = a[0],
    y = a[1];
  var len = x * x + y * y;

  if (len > 0) {
    //TODO: evaluate use of glm_invsqrt here?
    len = 1 / Math.sqrt(len);
  }

  out[0] = a[0] * len;
  out[1] = a[1] * len;
  return out;
}
/**
 * Calculates the dot product of two Vec2's
 *
 * @param {Vec2} a the first operand
 * @param {Vec2} b the second operand
 * @returns {Number} dot product of a and b
 */

export function dot(a: Vec2, b: Vec2): number {
  return a[0] * b[0] + a[1] * b[1];
}
/**
 * Computes the cross product of two Vec2's
 * Note that the cross product must by definition produce a 3D vector
 *
 * @param {Vec3} out the receiving vector
 * @param {Vec2} a the first operand
 * @param {Vec2} b the second operand
 * @returns {Vec3} out
 */

export function cross(out: Vec3, a: Vec2, b: Vec2): Vec3 {
  var z = a[0] * b[1] - a[1] * b[0];
  out[0] = out[1] = 0;
  out[2] = z;
  return out;
}
/**
 * Performs a linear interpolation between two Vec2's
 *
 * @param {Vec2} out the receiving vector
 * @param {Vec2} a the first operand
 * @param {Vec2} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {Vec2} out
 */

export function lerp(out: Vec2, a: Vec2, b: Vec2, t: number): Vec2 {
  var ax = a[0],
    ay = a[1];
  out[0] = ax + t * (b[0] - ax);
  out[1] = ay + t * (b[1] - ay);
  return out;
}

/**
 * Generates a random vector with the given scale
 *
 * @param {Vec2} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If omitted, a unit vector will be returned
 * @returns {Vec2} out
 */

export function random(out: Vec2, scale?: number): Vec2 {
  scale = scale ?? 1.0;
  var r = RANDOM() * 2.0 * Math.PI;
  out[0] = Math.cos(r) * scale;
  out[1] = Math.sin(r) * scale;
  return out;
}
/**
 * Transforms the Vec2 with a mat2
 *
 * @param {Vec2} out the receiving vector
 * @param {Vec2} a the vector to transform
 * @param {ReadOnlyMat2} m matrix to transform with
 * @returns {Vec2} out
 */

export function transformMat2(out: Vec2, a: Vec2, m: Mat2): Vec2 {
  var x = a[0],
    y = a[1];
  out[0] = m[0] * x + m[2] * y;
  out[1] = m[1] * x + m[3] * y;
  return out;
}
/**
 * Transforms the Vec2 with a mat2d
 *
 * @param {Vec2} out the receiving vector
 * @param {Vec2} a the vector to transform
 * @param {Mat2d} m matrix to transform with
 * @returns {Vec2} out
 */

export function transformMat2d(out: Vec2, a: Vec2, m: Mat2d): Vec2 {
  var x = a[0],
    y = a[1];
  out[0] = m[0] * x + m[2] * y + m[4];
  out[1] = m[1] * x + m[3] * y + m[5];
  return out;
}
/**
 * Transforms the Vec2 with a mat3
 * 3rd vector component is implicitly '1'
 *
 * @param {Vec2} out the receiving vector
 * @param {Vec2} a the vector to transform
 * @param {Mat3} m matrix to transform with
 * @returns {Vec2} out
 */

export function transformMat3(out: Vec2, a: Vec2, m: Mat3): Vec2 {
  var x = a[0],
    y = a[1];
  out[0] = m[0] * x + m[3] * y + m[6];
  out[1] = m[1] * x + m[4] * y + m[7];
  return out;
}
/**
 * Transforms the Vec2 with a mat4
 * 3rd vector component is implicitly '0'
 * 4th vector component is implicitly '1'
 *
 * @param {Vec2} out the receiving vector
 * @param {Vec2} a the vector to transform
 * @param {Mat4} m matrix to transform with
 * @returns {Vec2} out
 */

export function transformMat4(out: Vec2, a: Vec2, m: Mat4): Vec2 {
  var x = a[0];
  var y = a[1];
  out[0] = m[0] * x + m[4] * y + m[12];
  out[1] = m[1] * x + m[5] * y + m[13];
  return out;
}
/**
 * Rotate a 2D vector
 * @param {Vec2} out The receiving Vec2
 * @param {Vec2} a The Vec2 point to rotate
 * @param {Vec2} b The origin of the rotation
 * @param {Number} rad The angle of rotation in radians
 * @returns {Vec2} out
 */

export function rotate(out: Vec2, a: Vec2, b: Vec2, rad: number): Vec2 {
  //Translate point to the origin
  var p0 = a[0] - b[0],
    p1 = a[1] - b[1],
    sinC = Math.sin(rad),
    cosC = Math.cos(rad); //perform rotation and translate to correct position

  out[0] = p0 * cosC - p1 * sinC + b[0];
  out[1] = p0 * sinC + p1 * cosC + b[1];
  return out;
}
/**
 * Get the angle between two 2D vectors
 * @param {Vec2} a The first operand
 * @param {Vec2} b The second operand
 * @returns {Number} The angle in radians
 */

export function angle(a: Vec2, b: Vec2): number {
  var x1 = a[0],
    y1 = a[1],
    x2 = b[0],
    y2 = b[1],
    // mag is the product of the magnitudes of a and b
    mag = Math.sqrt((x1 * x1 + y1 * y1) * (x2 * x2 + y2 * y2)),
    // mag &&.. short circuits if mag == 0
    cosine = mag && (x1 * x2 + y1 * y2) / mag; // Math.min(Math.max(cosine, -1), 1) clamps the cosine between -1 and 1

  return Math.acos(Math.min(Math.max(cosine, -1), 1));
}
/**
 * Set the components of a Vec2 to zero
 *
 * @param {Vec2} out the receiving vector
 * @returns {Vec2} out
 */

export function zero(out: Vec2): Vec2 {
  out[0] = 0.0;
  out[1] = 0.0;
  return out;
}
/**
 * Returns a string representation of a vector
 *
 * @param {Vec2} a vector to represent as a string
 * @returns {String} string representation of the vector
 */

export function str(a: Vec2): string {
  return 'Vec2(' + a[0] + ', ' + a[1] + ')';
}
/**
 * Returns whether or not the vectors exactly have the same elements in the same position (when compared with ===)
 *
 * @param {Vec2} a The first vector.
 * @param {Vec2} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

export function exactEquals(a: Vec2, b: Vec2) {
  return a[0] === b[0] && a[1] === b[1];
}
/**
 * Returns whether or not the vectors have approximately the same elements in the same position.
 *
 * @param {Vec2} a The first vector.
 * @param {Vec2} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

export function equals(a: Vec2, b: Vec2): boolean {
  var a0 = a[0],
    a1 = a[1];
  var b0 = b[0],
    b1 = b[1];
  return (
    Math.abs(a0 - b0) <= EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
    Math.abs(a1 - b1) <= EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1))
  );
}
/**
 * Alias for {@link length}
 * @function
 */

export var len = length;
/**
 * Alias for {@link subtract}
 * @function
 */

export var sub = subtract;
/**
 * Alias for {@link multiply}
 * @function
 */

export var mul = multiply;
/**
 * Alias for {@link divide}
 * @function
 */

export var div = divide;
/**
 * Alias for {@link distance}
 * @function
 */

export var dist = distance;
/**
 * Alias for {@link vsquaredDistance}
 * @function
 */

export var sqrDist = squaredDistance;
/**
 * Alias for {@link squaredLength}
 * @function
 */

export var sqrLen = squaredLength;
/**
 * Perform some operation over an array of Vec2s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each Vec2. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of Vec2s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

export var forEach = (function () {
  var vec: Vec2[] = [];
  return function (
    a: Vec2[],
    stride: number,
    offset: number,
    count: number,
    fn: Function,
    arg: object,
  ): Vec2[] {
    var i: number, l: number;

    if (!stride) {
      stride = 2;
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
      vec[0] = a[i]!;
      vec[1] = a[i + 1]!;
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
    }
    return a;
  };
})();
