/* eslint-disable @typescript-eslint/unbound-method */
import type {
  AnimationControllerState,
  IAnimationController,
} from '../../core/IAnimationController.js';
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

  waitUntilStopped(): Promise<void> {
    this.makeStoppedPromise();
    const promise = this.stoppedPromise;
    assertTruthy(promise);
    return promise;
  }

  private onAnimationFinished(target: ThreadXMainNode, { id }: { id: number }) {
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
