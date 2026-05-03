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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoreAnimationController } from './CoreAnimationController.js';
import { CoreAnimation } from './CoreAnimation.js';
import { AnimationManager } from './AnimationManager.js';
import type { CoreNode } from '../CoreNode.js';

function makeNode(): CoreNode {
  return {
    destroyed: false,
    x: 0,
    y: 0,
    alpha: 1,
    shader: null,
  } as unknown as CoreNode;
}

function makeController(nodeOverrides?: Record<string, unknown>): {
  controller: CoreAnimationController;
  animation: CoreAnimation;
  manager: AnimationManager;
} {
  const node = makeNode();
  if (nodeOverrides) {
    Object.assign(node, nodeOverrides);
  }
  const animation = new CoreAnimation(node, { x: 100 }, { duration: 500 });
  const manager = new AnimationManager();
  const controller = new CoreAnimationController(manager, animation);
  return { controller, animation, manager };
}

describe('CoreAnimationController', () => {
  describe('initial state', () => {
    it('starts in "stopped" state', () => {
      const { controller } = makeController();
      expect(controller.state).toBe('stopped');
    });
  });

  describe('start()', () => {
    it('transitions to "scheduled" state', () => {
      const { controller } = makeController();
      controller.start();
      expect(controller.state).toBe('scheduled');
    });

    it('returns the controller (for chaining)', () => {
      const { controller } = makeController();
      expect(controller.start()).toBe(controller);
    });

    it('registers the animation with the manager', () => {
      const { controller, animation, manager } = makeController();
      controller.start();
      expect(manager.activeAnimations.has(animation)).toBe(true);
    });

    it('does not double-register if already scheduled', () => {
      const { controller, manager } = makeController();
      controller.start();
      controller.start();
      // Still only one animation in the manager
      expect(manager.activeAnimations.size).toBe(1);
    });
  });

  describe('state transition: scheduled → running', () => {
    it('transitions to "running" when the animation emits "animating"', () => {
      const { controller, manager } = makeController();
      controller.start();
      // No delay, so the first update drives the animating event
      manager.update(16);
      expect(controller.state).toBe('running');
    });

    it('emits "animating" event on the controller', () => {
      const { controller, manager } = makeController();
      const cb = vi.fn();
      controller.on('animating', cb);
      controller.start();
      manager.update(16);
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  describe('pause()', () => {
    it('transitions to "paused" and unregisters animation', () => {
      const { controller, animation, manager } = makeController();
      controller.start();
      controller.pause();
      expect(controller.state).toBe('paused');
      expect(manager.activeAnimations.has(animation)).toBe(false);
    });

    it('returns the controller (for chaining)', () => {
      const { controller } = makeController();
      controller.start();
      expect(controller.pause()).toBe(controller);
    });

    it('can be resumed with start()', () => {
      const { controller, animation, manager } = makeController();
      controller.start();
      controller.pause();
      controller.start();
      expect(controller.state).toBe('scheduled');
      expect(manager.activeAnimations.has(animation)).toBe(true);
    });
  });

  describe('stop()', () => {
    it('transitions to "stopped" state', () => {
      const { controller } = makeController();
      controller.start();
      controller.stop();
      expect(controller.state).toBe('stopped');
    });

    it('returns the controller (for chaining)', () => {
      const { controller } = makeController();
      expect(controller.stop()).toBe(controller);
    });

    it('emits "stopped" event', () => {
      const { controller } = makeController();
      const cb = vi.fn();
      controller.on('stopped', cb);
      controller.start();
      controller.stop();
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('unregisters the animation from the manager', () => {
      const { controller, animation, manager } = makeController();
      controller.start();
      controller.stop();
      expect(manager.activeAnimations.has(animation)).toBe(false);
    });
  });

  describe('natural finish', () => {
    it('transitions to "stopped" when the animation finishes', () => {
      const { controller, manager } = makeController();
      controller.start();
      manager.update(1000); // well beyond 500ms duration
      expect(controller.state).toBe('stopped');
    });

    it('emits "stopped" on natural finish', () => {
      const { controller, manager } = makeController();
      const cb = vi.fn();
      controller.on('stopped', cb);
      controller.start();
      manager.update(1000);
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  describe('waitUntilStopped()', () => {
    it('resolves when animation finishes naturally', async () => {
      const { controller, manager } = makeController();
      controller.start();
      const promise = controller.waitUntilStopped();
      manager.update(1000);
      await expect(promise).resolves.toBeUndefined();
    });

    it('resolves when stop() is called', async () => {
      const { controller } = makeController();
      controller.start();
      const promise = controller.waitUntilStopped();
      controller.stop();
      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('restore()', () => {
    it('returns the controller (for chaining)', () => {
      const { controller } = makeController();
      expect(controller.restore()).toBe(controller);
    });
  });

  describe('stopMethod: "reverse"', () => {
    it('reverses and continues instead of stopping on finish', () => {
      const node = makeNode();
      const animation = new CoreAnimation(
        node,
        { x: 100 },
        { duration: 500, stopMethod: 'reverse' },
      );
      const manager = new AnimationManager();
      const controller = new CoreAnimationController(manager, animation);
      const stoppedCb = vi.fn();
      controller.on('stopped', stoppedCb);
      controller.start();
      // Complete the forward direction
      manager.update(600);
      // Controller should NOT have emitted stopped yet (it reversed)
      expect(stoppedCb).not.toHaveBeenCalled();
      expect(controller.state).not.toBe('stopped');
    });
  });
});
