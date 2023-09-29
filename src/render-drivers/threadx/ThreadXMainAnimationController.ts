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
import type {
  AnimationControllerState,
  IAnimationController,
} from '../../common/IAnimationController.js';
import { assertTruthy } from '../../utils.js';
import type { ThreadXMainNode } from './ThreadXMainNode.js';

export class ThreadXMainAnimationController implements IAnimationController {
  stoppedPromise: Promise<void> | null = null;
  /**
   * If this is null, then the animation is in a finished / stopped state.
   */
  stoppedResolve: (() => void) | null = null;

  constructor(private node: ThreadXMainNode, private id: number) {
    this.onAnimationFinished = this.onAnimationFinished.bind(this);
    this.state = 'stopped';
  }

  state: AnimationControllerState;

  start(): IAnimationController {
    if (this.stoppedResolve === null) {
      this.makeStoppedPromise();
      this.node.on('animationFinished', this.onAnimationFinished);
    }
    this.state = 'running';
    this.node.emit('startAnimation', { id: this.id });
    return this;
  }

  stop(): IAnimationController {
    this.node.emit('stopAnimation', { id: this.id });
    this.node.off('animationFinished', this.onAnimationFinished);
    if (this.stoppedResolve !== null) {
      this.stoppedResolve();
      this.stoppedResolve = null;
    }
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
    this.makeStoppedPromise();
    const promise = this.stoppedPromise;
    assertTruthy(promise);
    return promise;
  }

  private onAnimationFinished(
    target: ThreadXMainNode,
    { id, loop }: { id: number; loop: boolean },
  ) {
    if (id === this.id) {
      this.node.off('animationFinished', this.onAnimationFinished);
      this.stoppedResolve?.();
      this.stoppedResolve = null;
      this.state = 'stopped';
    }
  }

  private makeStoppedPromise(): void {
    if (this.stoppedResolve === null) {
      this.stoppedPromise = new Promise((resolve) => {
        this.stoppedResolve = resolve;
      });
    }
  }
}
