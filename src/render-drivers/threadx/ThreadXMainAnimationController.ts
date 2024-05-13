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

/* eslint-disable @typescript-eslint/unbound-method */
import { EventEmitter } from '../../common/EventEmitter.js';
import type {
  AnimationControllerState,
  IAnimationController,
} from '../../common/IAnimationController.js';
import { assertTruthy } from '../../utils.js';
import type { ThreadXMainNode } from './ThreadXMainNode.js';

export class ThreadXMainAnimationController
  extends EventEmitter
  implements IAnimationController
{
  stoppedPromise: Promise<void>;
  /**
   * If this is null, then the animation is in a finished / stopped state.
   */
  stoppedResolve: (() => void) | null = null;
  state: AnimationControllerState;

  constructor(private node: ThreadXMainNode, private id: number) {
    super();
    this.state = 'stopped';

    // Initial stopped promise is resolved (since the animation is stopped)
    this.stoppedPromise = Promise.resolve();

    // Bind event handlers
    this.onAnimating = this.onAnimating.bind(this);
    this.onFinished = this.onFinished.bind(this);
  }

  start(): IAnimationController {
    if (this.state !== 'running') {
      this.makeStoppedPromise();
      this.sendStart();
      this.state = 'running';
    }
    return this;
  }

  stop(): IAnimationController {
    if (this.state === 'stopped') {
      return this;
    }
    this.sendStop();
    // if (this.stoppedResolve !== null) {
    //   this.stoppedResolve();
    //   this.stoppedResolve = null;
    //   this.emit('stopped', this);
    // }
    this.state = 'stopped';
    return this;
  }

  pause(): IAnimationController {
    this.node.emit('pauseAnimation', { id: this.id });
    this.state = 'paused';
    return this;
  }

  restore(): IAnimationController {
    return this;
  }

  waitUntilStopped(): Promise<void> {
    return this.stoppedPromise;
  }

  private sendStart(): void {
    // Hook up event listeners
    this.node.on('animationFinished', this.onFinished);
    this.node.on('animationAnimating', this.onAnimating);
    // Then register the animation
    this.node.emit('startAnimation', { id: this.id });
  }

  private sendStop(): void {
    // First unregister the animation
    this.node.emit('stopAnimation', { id: this.id });
    // Then unhook event listeners
    this.node.off('animationFinished', this.onFinished);
    this.node.off('animationAnimating', this.onAnimating);
  }

  private makeStoppedPromise(): void {
    if (this.stoppedResolve === null) {
      this.stoppedPromise = new Promise((resolve) => {
        this.stoppedResolve = resolve;
      });
    }
  }

  private onFinished(
    target: ThreadXMainNode,
    { id }: { id: number; loop: boolean },
  ) {
    if (id === this.id) {
      assertTruthy(this.stoppedResolve);
      this.node.off('animationFinished', this.onFinished);
      this.node.off('animationAnimating', this.onAnimating);

      // resolve promise
      this.stoppedResolve();
      this.stoppedResolve = null;
      this.emit('stopped', this);
      this.state = 'stopped';
    }
  }

  private onAnimating(target: ThreadXMainNode, { id }: { id: number }) {
    if (id === this.id) {
      this.emit('animating', this);
    }
  }
}
