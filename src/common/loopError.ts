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

/**
 * Error handler for application callbacks invoked from the render loop.
 *
 * @remarks
 * Kept in its own module so the `try/catch` below is never inlined into the
 * hot `runLoop` / `update()` functions. The loop itself stays `try`-free
 * (friendly to older JITs); only this cold error path carries the `try`.
 */
export type LoopErrorHandler = (error: unknown) => void;

import { isProductionEnvironment } from '../utils.js';

/**
 * Log an error to the console in development builds only.
 *
 * @remarks
 * No-op in production: prod apps should wire `handleLoopError` for telemetry
 * instead of relying on console noise.
 */
function logLoopErrorDev(error: unknown): void {
  if (isProductionEnvironment === false) {
    console.error(error);
  }
}

/**
 * Report an error thrown by application code.
 *
 * Never rethrows: the render loop must survive bad client callbacks.
 * If the app provided `handleLoopError`, it is invoked in all environments
 * (its own throws are swallowed and only logged in dev). Otherwise the error
 * goes to `console.error` in development builds and is swallowed silently in
 * production.
 */
export function reportLoopError(
  error: unknown,
  onError?: LoopErrorHandler,
): void {
  if (onError === undefined) {
    logLoopErrorDev(error);
    return;
  }
  try {
    onError(error);
  } catch (handlerError) {
    logLoopErrorDev(handlerError);
  }
}

/**
 * Invoke an application callback, routing throws to `reportLoopError`.
 *
 * @remarks
 * Isolated here (instead of inline `try/catch` at each call site) so hot
 * functions (`runLoop`, `AnimationManager.update`, `CoreAnimation.update`)
 * contain no `try` keyword and stay optimizable.
 */
export function invokeAppCallback(
  fn: () => void,
  onError?: LoopErrorHandler,
): void {
  try {
    fn();
  } catch (error) {
    reportLoopError(error, onError);
  }
}

/**
 * Invoke a value-returning application callback (e.g. a custom easing
 * function), falling back to `fallback` when it throws.
 *
 * @remarks
 * Same isolation rationale as {@link invokeAppCallback}: the `try` lives
 * here, callers in the animation hot path stay `try`-free.
 */
export function invokeAppCallbackWithFallback<T>(
  fn: () => T,
  fallback: T,
  onError?: LoopErrorHandler,
): T {
  try {
    return fn();
  } catch (error) {
    reportLoopError(error, onError);
    return fallback;
  }
}
