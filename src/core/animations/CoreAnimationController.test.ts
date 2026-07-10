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

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CoreAnimationController } from './CoreAnimationController.js';
import { AnimationManager } from './AnimationManager.js';
import { CoreAnimation } from './CoreAnimation.js';
import { mock } from 'vitest-mock-extended';
import { EventEmitter } from '../../common/EventEmitter.js';

/**
 * Minimal mock for CoreAnimation that extends EventEmitter so event
 * wiring in registerAnimation / unregisterAnimation works correctly.
 */
function createMockAnimation(
  overrides: Partial<CoreAnimation> = {},
): CoreAnimation {
  const emitter = new EventEmitter();
  const animation = Object.assign(emitter, {
    id: 1,
    settings: {
      duration: 1000,
      delay: 0,
      easing: 'linear',
      loop: false,
      repeat: 0,
      stopMethod: false as const,
    },
    progress: 0,
    propValuesMap: { props: null, shaderProps: null },
    reset: vi.fn(),
    restore: vi.fn(),
    reverse: vi.fn(),
    update: vi.fn(),
    ...overrides,
  }) as unknown as CoreAnimation;

  return animation;
}

describe('CoreAnimationController', () => {
  let manager: AnimationManager;
  let animation: CoreAnimation;

  beforeEach(() => {
    manager = mock<AnimationManager>();
    animation = createMockAnimation();
  });

  describe('constructor', () => {
    it('should initialize in stopped state', () => {
      const controller = new CoreAnimationController(manager, animation);
      expect(controller.state).toBe('stopped');
    });
  });

  describe('lazy promise creation', () => {
    it('should not allocate a promise on construction', () => {
      const controller = new CoreAnimationController(manager, animation);
      expect(controller.stoppedPromise).toBeNull();
    });

    it('should not allocate a promise on start()', () => {
      const controller = new CoreAnimationController(manager, animation);
      controller.start();
      expect(controller.stoppedPromise).toBeNull();
      expect(controller.stoppedResolve).toBeNull();
    });

    it('should return a resolved promise from waitUntilStopped() when already stopped', async () => {
      const controller = new CoreAnimationController(manager, animation);
      // state is 'stopped' by default
      const promise = controller.waitUntilStopped();
      expect(promise).toBeInstanceOf(Promise);
      // Should not cache the promise since we are already stopped
      expect(controller.stoppedPromise).toBeNull();
      await expect(promise).resolves.toBeUndefined();
    });

    it('should lazily create a promise when waitUntilStopped() is called on a running animation', () => {
      const controller = new CoreAnimationController(manager, animation);
      controller.start();
      expect(controller.stoppedPromise).toBeNull();

      const promise = controller.waitUntilStopped();
      expect(promise).toBeInstanceOf(Promise);
      expect(controller.stoppedPromise).toBe(promise);
      expect(controller.stoppedResolve).not.toBeNull();
    });

    it('should return the same promise on repeated waitUntilStopped() calls', () => {
      const controller = new CoreAnimationController(manager, animation);
      controller.start();

      const promise1 = controller.waitUntilStopped();
      const promise2 = controller.waitUntilStopped();
      expect(promise1).toBe(promise2);
    });

    it('should reset the cached promise on a new start() cycle', () => {
      const controller = new CoreAnimationController(manager, animation);
      controller.start();
      const promise1 = controller.waitUntilStopped();
      controller.stop();

      controller.start();
      expect(controller.stoppedPromise).toBeNull();

      const promise2 = controller.waitUntilStopped();
      expect(promise2).not.toBe(promise1);
    });
  });

  describe('start()', () => {
    it('should transition to scheduled state', () => {
      const controller = new CoreAnimationController(manager, animation);
      controller.start();
      expect(controller.state).toBe('scheduled');
    });

    it('should register the animation with the manager', () => {
      const controller = new CoreAnimationController(manager, animation);
      controller.start();
      expect(manager.registerAnimation).toHaveBeenCalledWith(animation);
    });

    it('should not re-register if already running', () => {
      const controller = new CoreAnimationController(manager, animation);
      controller.start();

      // Simulate the animation emitting 'animating' to move to 'running'
      animation.emit('animating', {});
      expect(controller.state).toBe('running');

      controller.start();
      // Should only have been registered once
      expect(manager.registerAnimation).toHaveBeenCalledTimes(1);
    });
  });

  describe('stop()', () => {
    it('should resolve the promise when stopped manually', async () => {
      const controller = new CoreAnimationController(manager, animation);
      controller.start();
      const promise = controller.waitUntilStopped();

      controller.stop();
      expect(controller.state).toBe('stopped');
      await expect(promise).resolves.toBeUndefined();
    });

    it('should emit stopped event when promise exists', () => {
      const controller = new CoreAnimationController(manager, animation);
      const stoppedHandler = vi.fn();
      controller.on('stopped', stoppedHandler);

      controller.start();
      controller.waitUntilStopped(); // create the promise + resolve
      controller.stop();

      expect(stoppedHandler).toHaveBeenCalled();
    });

    it('should work without waitUntilStopped() being called (fire-and-forget)', () => {
      const controller = new CoreAnimationController(manager, animation);
      const stoppedHandler = vi.fn();
      controller.on('stopped', stoppedHandler);
      controller.start();
      // No waitUntilStopped() call -- fire and forget
      expect(controller.stoppedResolve).toBeNull();

      // stop should not throw and should still emit 'stopped'
      controller.stop();
      expect(controller.state).toBe('stopped');
      expect(stoppedHandler).toHaveBeenCalledTimes(1);
    });

    it('should not emit stopped when already in stopped state', () => {
      const controller = new CoreAnimationController(manager, animation);
      const stoppedHandler = vi.fn();
      controller.on('stopped', stoppedHandler);

      // Controller starts in 'stopped' state, calling stop() should be a no-op
      controller.stop();
      expect(stoppedHandler).not.toHaveBeenCalled();
    });

    it('should reset animation when stop is called with reset=true', () => {
      const controller = new CoreAnimationController(manager, animation);
      controller.start();
      controller.stop(true);
      expect(animation.reset).toHaveBeenCalled();
    });
  });

  describe('pause()', () => {
    it('should transition to paused state', () => {
      const controller = new CoreAnimationController(manager, animation);
      controller.start();
      controller.pause();
      expect(controller.state).toBe('paused');
    });

    it('should unregister the animation from the manager', () => {
      const controller = new CoreAnimationController(manager, animation);
      controller.start();
      controller.pause();
      expect(manager.unregisterAnimation).toHaveBeenCalledWith(animation);
    });
  });

  describe('animation lifecycle events', () => {
    it('should transition to running when animation emits animating', () => {
      const controller = new CoreAnimationController(manager, animation);
      controller.start();
      animation.emit('animating', {});
      expect(controller.state).toBe('running');
    });

    it('should resolve promise when animation finishes naturally', async () => {
      const controller = new CoreAnimationController(manager, animation);
      controller.start();
      const promise = controller.waitUntilStopped();

      animation.emit('finished', {});
      expect(controller.state).toBe('stopped');
      await expect(promise).resolves.toBeUndefined();
    });

    it('should emit stopped event when animation finishes naturally', () => {
      const controller = new CoreAnimationController(manager, animation);
      const stoppedHandler = vi.fn();
      controller.on('stopped', stoppedHandler);

      controller.start();
      animation.emit('finished', {});
      expect(stoppedHandler).toHaveBeenCalled();
    });

    it('should handle finish without waitUntilStopped (fire-and-forget)', () => {
      const controller = new CoreAnimationController(manager, animation);
      controller.start();
      // No waitUntilStopped() call

      // Should not throw when the animation finishes
      animation.emit('finished', {});
      expect(controller.state).toBe('stopped');
      expect(controller.stoppedResolve).toBeNull();
    });

    it('should handle stopMethod reverse by re-registering finished listener', () => {
      const animationWithReverse = createMockAnimation({
        settings: {
          duration: 1000,
          delay: 0,
          easing: 'linear',
          loop: false,
          repeat: 0,
          stopMethod: 'reverse',
        },
      });

      const controller = new CoreAnimationController(
        manager,
        animationWithReverse,
      );
      controller.start();
      animationWithReverse.emit('finished', {});

      // Should NOT be stopped -- reverse re-registers
      expect(controller.state).not.toBe('stopped');
      expect(animationWithReverse.reverse).toHaveBeenCalled();
    });

    it('should not resolve promise when looping', () => {
      const loopingAnimation = createMockAnimation({
        settings: {
          duration: 1000,
          delay: 0,
          easing: 'linear',
          loop: true,
          repeat: 0,
          stopMethod: false,
        },
      });

      const controller = new CoreAnimationController(manager, loopingAnimation);
      controller.start();
      // Call waitUntilStopped to trigger lazy promise creation
      controller.waitUntilStopped();

      loopingAnimation.emit('finished', {});

      // Should still be running, not stopped
      expect(controller.state).not.toBe('stopped');
      // Promise should still be pending (stoppedResolve not cleared)
      expect(controller.stoppedResolve).not.toBeNull();
    });

    it('should transition to stopped on destroy', () => {
      const controller = new CoreAnimationController(manager, animation);
      controller.start();
      animation.emit('destroyed', {});
      expect(controller.state).toBe('stopped');
    });
  });
});
