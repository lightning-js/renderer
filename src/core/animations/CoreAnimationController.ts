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

  // Pre-allocated tick payload -- reused every frame to avoid per-frame {} allocation
  private readonly tickPayload: { progress: number } = { progress: 0 };

  // Fixed set of event names this controller emits -- used for zero-alloc clearListeners()
  static readonly EVENTS = ['stopped', 'animating'] as const;

  constructor() {
    super();
    this.state = 'stopped';
    // Pre-allocate listener arrays for the known events so on() never needs to
    // allocate a new [] when the controller is reused after a pool recycle.
    this.eventListeners['stopped'] = [];
    this.eventListeners['animating'] = [];
  }

  /**
   * Initialize (or reinitialize) this controller with new dependencies.
   * Called both on first use and when recycled from the pool.
   */
  init(manager: AnimationManager, animation: CoreAnimation): void {
    this.manager = manager;
    this.animation = animation;
    this.state = 'stopped';
    this.stoppedPromise = null;
    this.stoppedResolve = null;
    // Clear in-place to preserve pre-allocated arrays (zero alloc)
    this.clearListeners(CoreAnimationController.EVENTS);
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

    // Capture refs before emit -- the user's stopped callback may synchronously
    // call createAnimation() which recycles these objects from the pool.
    // Releasing AFTER emit with captured refs prevents corrupting the recycled objects.
    const animation = this.animation;
    const manager = this.manager;

    if (this.stoppedResolve !== null) {
      this.stoppedResolve();
      this.stoppedResolve = null;
    }

    this.state = 'stopped';
    this.emit('stopped', this);

    if (reset === true) {
      animation.reset();
    }

    manager.releaseToPool(animation, this);
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

  private onDestroy = (): void => {
    this.unregisterAnimation();

    // Capture refs before emit -- same race condition guard as stop()/onFinished()
    const animation = this.animation;
    const manager = this.manager;

    if (this.stoppedResolve !== null) {
      this.stoppedResolve();
      this.stoppedResolve = null;
    }

    this.state = 'stopped';
    this.emit('stopped', this);
    manager.releaseToPool(animation, this);
  };

  private onFinished = (): void => {
    const { loop, stopMethod } = this.animation;

    if (stopMethod === 'reverse') {
      this.animation.reverse();
      return;
    }

    if (loop) {
      return;
    }

    this.unregisterAnimation();

    // Capture refs before emit -- the user's stopped callback may synchronously
    // call createAnimation() which recycles these objects from the pool.
    // Releasing AFTER emit with captured refs prevents corrupting the recycled objects.
    const animation = this.animation;
    const manager = this.manager;

    if (this.stoppedResolve !== null) {
      this.stoppedResolve();
      this.stoppedResolve = null;
    }

    this.state = 'stopped';
    this.emit('stopped', this);
    manager.releaseToPool(animation, this);
  };

  private onAnimating = (): void => {
    this.state = 'running';
    this.emit('animating', this);
  };

  /**
   * manually override the tick event to emit the progress of the animation as well
   * we are first checking if there are any listeners for the tick event. this avoid unnecessary object creation.
   */
  private onTick = (): void => {
    const listeners = this.eventListeners['tick'];
    if (listeners === undefined || listeners.length === 0) {
      return;
    }
    // Mutate pre-allocated payload to avoid per-frame {} allocation
    this.tickPayload.progress = this.animation['progress'];
    for (let i = listeners.length - 1; i >= 0; i--) {
      listeners[i]!(this, this.tickPayload);
    }
  };
}
