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
import { EventEmitter } from '../../common/EventEmitter.js';
import type { AnimationTickPayload } from '../../common/CommonTypes.js';

export class CoreAnimationController
  extends EventEmitter
  implements IAnimationController
{
  stoppedPromise: Promise<void>;
  /**
   * If this is null, then the animation is in a finished / stopped state.
   */
  stoppedResolve: (() => void) | null = null;
  state: AnimationControllerState;

  constructor(
    private manager: AnimationManager,
    private animation: CoreAnimation,
  ) {
    super();
    this.state = 'stopped';
    // Initial stopped promise is resolved (since the animation is stopped)
    this.stoppedPromise = Promise.resolve();

    // Bind event handlers
    this.onAnimating = this.onAnimating.bind(this);
    this.onFinished = this.onFinished.bind(this);
    this.onTick = this.onTick.bind(this);
    this.onDestroy = this.onDestroy.bind(this);
  }

  start(): IAnimationController {
    if (this.state !== 'running' && this.state !== 'scheduled') {
      this.makeStoppedPromise();
      this.registerAnimation();
      this.state = 'scheduled';
    }
    return this;
  }

  stop(): IAnimationController {
    this.unregisterAnimation();
    if (this.stoppedResolve !== null) {
      this.stoppedResolve();
      this.stoppedResolve = null;
      this.emit('stopped', this);
    }
    this.animation.reset();
    this.state = 'stopped';
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
    return this.stoppedPromise;
  }

  private registerAnimation(): void {
    // Hook up event listeners
    this.animation.once('finished', this.onFinished);
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
    this.animation.off('destroy', this.onDestroy);
  }

  private makeStoppedPromise(): void {
    if (this.stoppedResolve === null) {
      this.stoppedPromise = new Promise((resolve) => {
        this.stoppedResolve = resolve;
      });
    }
  }

  private onDestroy(this: CoreAnimationController): void {
    this.unregisterAnimation();
    this.state = 'stopped';
  }

  private onFinished(this: CoreAnimationController): void {
    assertTruthy(this.stoppedResolve);
    // If the animation is looping, then we need to restart it.
    const { loop, stopMethod } = this.animation.settings;

    if (stopMethod === 'reverse') {
      this.animation.once('finished', this.onFinished);
      this.animation.reverse();
      return;
    }

    if (loop) {
      return;
    }

    // unregister animation
    this.unregisterAnimation();

    // resolve promise
    this.stoppedResolve();
    this.stoppedResolve = null;
    this.emit('stopped', this);
    this.state = 'stopped';
  }

  private onAnimating(this: CoreAnimationController): void {
    this.state = 'running';
    this.emit('animating', this);
  }

  private onTick(
    this: CoreAnimationController,
    _animation: CoreAnimation,
    data: AnimationTickPayload,
  ): void {
    this.emit('tick', data);
  }
}
