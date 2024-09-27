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
import type { IEventEmitter } from './IEventEmitter.js';

export type AnimationControllerState =
  | 'scheduled'
  | 'running'
  | 'paused'
  | 'stopped';

/**
 * Animation Controller interface
 *
 * @remarks
 * This interface is used to control animations. It provides methods to start,
 * stop, pause, and restore animations. It also provides a way to wait for the
 * animation to stop.
 *
 * This interface extends the `IEventEmitter` interface, which means you can
 * listen to these events emitted by the animation controller:
 * - `animating` - Emitted when the animation finishes it's delay phase and
 *   starts animating.
 * - `stopped` - Emitted when the animation stops either by calling the `stop()`
 *    method or when the animation finishes naturally.
 */
export interface IAnimationController extends IEventEmitter {
  /**
   * Start the animation
   *
   * @remarks
   * If the animation is paused this method will resume the animation.
   */
  start(): IAnimationController;
  /**
   * Stop the animation
   *
   * @remarks
   * Resets the animation to the start state
   */
  stop(): IAnimationController;
  /**
   * Pause the animation
   */
  pause(): IAnimationController;
  /**
   * Restore the animation to the original values
   */
  restore(): IAnimationController;

  /**
   * Promise that resolves when the last active animation is stopped (including
   * when the animation finishes naturally).
   *
   * @remarks
   * The Promise returned by this method is reset every time the animation
   * enters a new start/stop cycle. This means you must call `start()` before
   * calling this method if you want to wait for the animation to stop.
   *
   * This method always returns a resolved promise if the animation is currently
   * in a stopped state.
   *
   * @returns
   */
  waitUntilStopped(): Promise<void>;

  /**
   * Current state of the animation
   *
   * @remarks
   * - `stopped` - The animation is currently stopped (at the beggining or end
   *   of the animation)
   * - `running` - The animation is currently running
   * - `paused` - The animation is currently paused
   */
  readonly state: AnimationControllerState;
}
