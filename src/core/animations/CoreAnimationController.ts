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
import { EventEmitter } from '../../common/EventEmitter.js';

export class CoreAnimationController
  extends EventEmitter
  implements IAnimationController
{
  stoppedPromise: Promise<void> | null = null;
  /**
   * If this is null, then the animation is in a finished / stopped state.
   */
  stoppedResolve: (() => void) | null = null;
  state: AnimationControllerState;
  private manager!: AnimationManager;
  private animation!: CoreAnimation;

  constructor() {
    super();
    this.state = 'stopped';

    // Bind event handlers
    this.onAnimating = this.onAnimating.bind(this);
    this.onFinished = this.onFinished.bind(this);
    this.onTick = this.onTick.bind(this);
    this.onDestroy = this.onDestroy.bind(this);
  }

  /**
   * Initialize (or reinitialize) this controller with new dependencies.
   * Called both on first use and when recycled from the pool.
   */
  init(manager: AnimationManager, animation: CoreAnimation): void {
    this.manager = manager;
    this.animation = animation;
    this.state = 'stopped';
    this.stoppedPromise = Promise.resolve();
    this.stoppedResolve = null;
    this.removeAllListeners();
  }

  start(): IAnimationController {
    if (this.state !== 'running' && this.state !== 'scheduled') {
      this.stoppedPromise = null;
      this.registerAnimation();
      this.state = 'scheduled';
    }
    return this;
  }

  stop(reset = true): IAnimationController {
    if (this.state === 'stopped') {
      return this;
    }
    this.unregisterAnimation();
    if (this.stoppedResolve !== null) {
      this.stoppedResolve();
      this.stoppedResolve = null;
    }
    this.emit('stopped', this);
    if (reset === true) {
      this.animation.reset();
    }

    this.state = 'stopped';
    // Release to pool after all user listeners have been notified
    this.manager.releaseToPool(this.animation, this);
    return this;
  }

  pause(): IAnimationController {
    this.unregisterAnimation();
    this.state = 'paused';
    return this;
  }

  restore(): IAnimationController {
    this.stoppedResolve = null;
    this.animation.restore();
    return this;
  }

  waitUntilStopped(): Promise<void> {
    // If already stopped, return a resolved promise without caching it
    if (this.state === 'stopped') {
      return Promise.resolve();
    }
    // Lazily create the stopped promise only when someone actually awaits it
    if (this.stoppedPromise === null) {
      this.stoppedPromise = new Promise((resolve) => {
        this.stoppedResolve = resolve;
      });
    }
    return this.stoppedPromise;
  }

  private registerAnimation(): void {
    // Hook up event listeners
    // Use on() instead of once() for 'finished' to avoid allocating a
    // wrapper closure. The listener is removed via unregisterAnimation()
    // when the animation stops, or stays registered across reverse cycles.
    this.animation.on('finished', this.onFinished);
    this.animation.on('animating', this.onAnimating);
    this.animation.on('tick', this.onTick);
    this.animation.on('destroyed', this.onDestroy);
    // Then register the animation
    this.manager.registerAnimation(this.animation);
  }

  private unregisterAnimation(): void {
    // First unregister the animation
    this.manager.unregisterAnimation(this.animation);
    // Then unhook event listeners
    this.animation.off('finished', this.onFinished);
    this.animation.off('animating', this.onAnimating);
    this.animation.off('tick', this.onTick);
    this.animation.off('destroyed', this.onDestroy);
  }

  private onDestroy(this: CoreAnimationController): void {
    this.unregisterAnimation();
    if (this.stoppedResolve !== null) {
      this.stoppedResolve();
      this.stoppedResolve = null;
    }
    this.emit('stopped', this);
    this.state = 'stopped';
    // Release to pool after all user listeners have been notified
    this.manager.releaseToPool(this.animation, this);
  }

  private onFinished(this: CoreAnimationController): void {
    // If the animation is looping, then we need to restart it.
    const { loop, stopMethod } = this.animation.settings;

    if (stopMethod === 'reverse') {
      this.animation.reverse();
      return;
    }

    if (loop) {
      return;
    }

    // unregister animation
    this.unregisterAnimation();

    // resolve promise
    if (this.stoppedResolve !== null) {
      this.stoppedResolve();
      this.stoppedResolve = null;
    }

    this.emit('stopped', this);
    this.state = 'stopped';
    // Release to pool after all user listeners have been notified
    this.manager.releaseToPool(this.animation, this);
  }

  private onAnimating(this: CoreAnimationController): void {
    this.state = 'running';
    this.emit('animating', this);
  }

  /**
   * manually override the tick event to emit the progress of the animation as well
   * we are first checking if there are any listeners for the tick event. this avoid unnecessary object creation.
   * @param this
   * @returns
   */
  private onTick(this: CoreAnimationController): void {
    const listeners = this.eventListeners['tick'];
    if (listeners === undefined) {
      return;
    }
    listeners.forEach((listener) => {
      listener(this, {
        progress: this.animation['progress'],
      });
    });
  }
}
