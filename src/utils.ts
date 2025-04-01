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

import type { ContextSpy } from './core/lib/ContextSpy.js';

export function createWebGLContext(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  forceWebGL2 = false,
  contextSpy: ContextSpy | null,
): WebGLRenderingContext {
  const config: WebGLContextAttributes = {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: true,
    desynchronized: false,
    // Disabled because it prevents Visual Regression Tests from working
    // failIfMajorPerformanceCaveat: true,
    powerPreference: 'high-performance',
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
  };
  const gl =
    // TODO: Remove this assertion once this issue is fixed in TypeScript
    // https://github.com/microsoft/TypeScript/issues/53614
    (canvas.getContext(forceWebGL2 ? 'webgl2' : 'webgl', config) ||
      canvas.getContext(
        'experimental-webgl' as 'webgl',
        config,
      )) as unknown as WebGLRenderingContext | null;
  if (!gl) {
    throw new Error('Unable to create WebGL context');
  }
  if (contextSpy) {
    // Proxy the GL context to log all GL calls
    return new Proxy(gl, {
      get(target, prop) {
        const value = target[prop as never] as unknown;
        if (typeof value === 'function') {
          contextSpy.increment(String(prop));
          return value.bind(target);
        }
        return value;
      },
    });
  }

  return gl;
}

/**
 * Checks if we're in a development environment or not.
 *
 * @returns
 */
declare const __DEV__: boolean;
export const isProductionEnvironment =
  typeof __DEV__ !== 'undefined' ? !__DEV__ : true;

/**
 * Asserts a condition is truthy, otherwise throws an error
 *
 * @remarks
 * Useful at the top of functions to ensure certain conditions, arguments and
 * properties are set/met before continuing. When using this function,
 * TypeScript will narrow away falsy types from the condition.
 *
 * @param condition
 * @param message
 * @returns
 */
export function assertTruthy(
  condition: unknown,
  message?: string,
): asserts condition {
  if (isProductionEnvironment) return;
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

/**
 * Merges two colors based on a given progress value.
 *
 * This function takes two colors (c1 and c2) represented as 32-bit integers
 * in RGBA format and blends them based on the provided progress value (p).
 * The result is a new color that is a weighted combination of the input colors,
 * where the weight is determined by the progress value.
 *
 * @param {number} c1 - The first color in RGBA format (32-bit integer).
 * @param {number} c2 - The second color in RGBA format (32-bit integer).
 * @param {number} p - The progress value between 0 and 1.
 * @returns {number} The merged color as a 32-bit integer in RGBA format.
 */
export function mergeColorProgress(
  rgba1: number,
  rgba2: number,
  p: number,
): number {
  const r1 = Math.trunc(rgba1 >>> 24);
  const g1 = Math.trunc((rgba1 >>> 16) & 0xff);
  const b1 = Math.trunc((rgba1 >>> 8) & 0xff);
  const a1 = Math.trunc(rgba1 & 0xff);

  const r2 = Math.trunc(rgba2 >>> 24);
  const g2 = Math.trunc((rgba2 >>> 16) & 0xff);
  const b2 = Math.trunc((rgba2 >>> 8) & 0xff);
  const a2 = Math.trunc(rgba2 & 0xff);

  const r = Math.round(r2 * p + r1 * (1 - p));
  const g = Math.round(g2 * p + g1 * (1 - p));
  const b = Math.round(b2 * p + b1 * (1 - p));
  const a = Math.round(a2 * p + a1 * (1 - p));

  return ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
}

/**
 * Given an RGBA encoded number, returns back the RGBA number with it's alpha
 * component multiplied by the passed `alpha` parameter.
 *
 * @internalRemarks
 * This method does NOT premultiply the alpha into the color channels. If that
 * is required (for internal use only) use {@link mergeColorAlphaPremultiplied}
 * instead.
 *
 * @param rgba RGBA encoded number
 * @param alpha Normalized alpha value (Range: 0.0 - 1.0)
 * @returns
 */
export function mergeColorAlpha(rgba: number, alpha: number): number {
  const r = rgba >>> 24;
  const g = (rgba >>> 16) & 0xff;
  const b = (rgba >>> 8) & 0xff;
  const a = Math.trunc((rgba & 0xff) * alpha);

  return ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
}

let premultiplyRGB = true;

/**
 * RGB components should not be premultiplied when using Canvas renderer
 * @param mode  Renderer mode
 */
export function setPremultiplyMode(mode: 'webgl' | 'canvas'): void {
  premultiplyRGB = mode === 'webgl';
}

/**
 * Given an RGBA encoded number, returns back the RGBA number with it's alpha
 * component multiplied by the passed `alpha` parameter.
 *
 * For the webGl renderer, each color channel is premultiplied by the final alpha value.
 *
 * @remarks
 * If `flipEndianess` is set to true, the function will returned an ABGR encoded number
 * which is useful when the color value needs to be passed into a shader attribute.
 *
 * NOTE: Depending on the mode set by {@link setPremultiplyMode}, this method returns
 * a PREMULTIPLIED alpha color which is generally only useful in the context of the
 * internal rendering process. Use {@link mergeColorAlpha} if you need to blend an alpha
 * value into a color in the context of the Renderer's main API.
 *
 * @internalRemarks
 * Do not expose this method in the main API because Renderer users should instead use
 * {@link mergeColorAlpha} to manipulate the alpha value of a color.
 *
 * @internal
 * @param rgba RGBA encoded number
 * @param alpha Normalized alpha value (Range: 0.0 - 1.0)
 * @param flipEndianess Flip the endianess. RGBA becomes encoded as ABGR (for inserting colors into shader attributes)
 * @returns
 */
export function mergeColorAlphaPremultiplied(
  rgba: number,
  alpha: number,
  flipEndianess = false,
): number {
  const newAlpha = ((rgba & 0xff) / 255) * alpha;
  const rgbAlpha = premultiplyRGB ? newAlpha : 1;
  const r = Math.trunc((rgba >>> 24) * rgbAlpha);
  const g = Math.trunc(((rgba >>> 16) & 0xff) * rgbAlpha);
  const b = Math.trunc(((rgba >>> 8) & 0xff) * rgbAlpha);
  const a = Math.trunc(newAlpha * 255);

  if (flipEndianess) {
    return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
  }

  return ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
}

/**
 * Returns true if the given object has the given "own" property.
 *
 * @param obj
 * @param prop
 * @returns
 */
export function hasOwn(obj: object, prop: string | number | symbol): boolean {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

/**
 * Converts degrees to radians
 *
 * @param degrees
 * @returns
 */
export function deg2Rad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Returns image aspect ratio
 *
 * @param width
 * @param height
 * @returns
 */
export function getImageAspectRatio(width: number, height: number): number {
  return width / height;
}

/**
 * Returns a new unique ID
 */
let nextId = 1;
export function getNewId(): number {
  return nextId++;
}

/**
 * Makes a deep clone of an object
 * @param object
 * @returns
 */
export function deepClone<T>(obj: T): T {
  if (typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as T;
  }
  const copy = {} as Record<string, unknown>;
  for (const key in obj) {
    copy[key] = deepClone(obj[key]);
  }
  return copy as T;
}
