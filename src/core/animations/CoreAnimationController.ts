import type {
  AnimationControllerState,
  IAnimationController,
} from '../IAnimationController.js';
import type { AnimationManager } from './AnimationManager.js';
import type { CoreAnimation } from './CoreAnimation.js';
import { assertTruthy } from '../../utils.js';

export class CoreAnimationController implements IAnimationController {
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
    if (this.stoppedResolve === null) {
      this.makeStoppedPromise();
      this.animation.once('finished', () => {
        assertTruthy(this.stoppedResolve);
        this.stoppedResolve();
        this.stoppedResolve = null;
        this.state = 'stopped';
      });
    }
    this.manager.registerAnimation(this.animation);
    this.state = 'running';
    return this;
  }

  stop(): IAnimationController {
    this.manager.unregisterAnimation(this.animation);
    if (this.stoppedResolve !== null) {
      this.stoppedResolve();
      this.stoppedResolve = null;
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

  waitUntilStopped(): Promise<void> {
    this.makeStoppedPromise();
    const promise = this.stoppedPromise;
    assertTruthy(promise);
    return promise;
  }

  private makeStoppedPromise(): void {
    if (this.stoppedResolve === null) {
      this.stoppedPromise = new Promise((resolve) => {
        this.stoppedResolve = resolve;
      });
    }
  }
}
