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

import type {
  AnimationControllerState,
  IAnimationController,
} from '../../common/IAnimationController.js';
import type { AnimationManager } from './AnimationManager.js';
import type { CoreAnimation } from './CoreAnimation.js';
import { assertTruthy } from '../../utils.js';

export class CoreAnimationController implements IAnimationController {
  startedPromise: Promise<void> | null = null;
  /**
   * If this is null, then the animation hasn't started yet.
   */
  startedResolve: ((scope?: any) => void) | null = null;

  stoppedPromise: Promise<void> | null = null;
  /**
   * If this is null, then the animation is in a finished / stopped state.
   */
  stoppedResolve: (() => void) | null = null;

  constructor(
    private manager: AnimationManager,
    private animation: CoreAnimation,
  ) {
    this.state = 'stopped';
  }

  state: AnimationControllerState;

  start(): IAnimationController {
    this.makeStartedPromise();
    this.animation.once('start', this.started.bind(this));

    this.makeStoppedPromise();
    this.animation.once('finished', this.finished.bind(this));

    // prevent registering the same animation twice
    if (!this.manager.activeAnimations.has(this.animation)) {
      this.manager.registerAnimation(this.animation);
    }

    this.state = 'running';
    return this;
  }

  stop(): IAnimationController {
    this.manager.unregisterAnimation(this.animation);
    if (this.stoppedResolve !== null) {
      this.stoppedResolve();
      this.cleanupStoppedResolve();
    }
    this.animation.reset();
    this.state = 'stopped';
    return this;
  }

  pause(): IAnimationController {
    this.manager.unregisterAnimation(this.animation);
    this.state = 'paused';
    return this;
  }

  restore(): IAnimationController {
    this.cleanupStoppedResolve();
    this.animation.restore();
    return this;
  }

  waitUntilStarted(): Promise<void> {
    this.makeStartedPromise();
    const promise = this.startedPromise;
    assertTruthy(promise);
    return promise;
  }

  waitUntilStopped(): Promise<void> {
    this.makeStoppedPromise();
    const promise = this.stoppedPromise;
    assertTruthy(promise);
    return promise;
  }

  private makeStartedPromise(): void {
    if (this.startedResolve === null) {
      this.startedPromise = new Promise((resolve) => {
        this.startedResolve = resolve;
      });
    }
  }

  private makeStoppedPromise(): void {
    if (this.stoppedResolve === null) {
      this.stoppedPromise = new Promise((resolve) => {
        this.stoppedResolve = resolve;
      });
    }
  }

  private started(): void {
    assertTruthy(this.startedResolve);
    // resolve promise (and pass current this to continue to the chain)
    this.startedResolve(this);
    this.startedResolve = null;
  }

  private finished(): void {
    assertTruthy(this.stoppedResolve);
    // If the animation is looping, then we need to restart it.
    const { loop, stopMethod } = this.animation.settings;

    if (stopMethod === 'reverse') {
      this.animation.reverse();
      this.start();
      return;
    }

    // resolve promise
    this.stoppedResolve();
    this.cleanupStoppedResolve();

    if (loop) {
      return;
    }

    // unregister animation
    this.manager.unregisterAnimation(this.animation);
  }

  // null the stoppedResolve function in the next tick, to prevent race conditions
  // on lower powered devices, causing the stop callback to never be called
  private cleanupStoppedResolve(): void {
    setTimeout(() => (this.stoppedResolve = null));
  }
}
