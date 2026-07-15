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

import { describe, expect, it, vi } from 'vitest';
import { CoreAnimationManager as AnimationManager } from './AnimationManager.js';
import type { CoreNode } from '../CoreNode.js';
import type { IAnimationController } from '../../common/IAnimationController.js';

/**
 * Create a minimal mock node that satisfies CoreAnimation's needs.
 * CoreAnimation accesses node[key] for start values, node.shader, and node.destroyed.
 */
function createMockNode(overrides: Record<string, unknown> = {}): CoreNode {
  return {
    x: 0,
    y: 0,
    w: 100,
    h: 100,
    alpha: 1,
    rotation: 0,
    scale: 1,
    color: 0xffffffff,
    destroyed: false,
    shader: null,
    ...overrides,
  } as unknown as CoreNode;
}

describe('AnimationManager', () => {
  describe('object pooling', () => {
    it('should create fresh objects when pool is empty', () => {
      const manager = new AnimationManager();
      const node = createMockNode();

      const controller1 = manager.animate(node, { x: 100 }, { duration: 1000 });
      const controller2 = manager.animate(node, { y: 200 }, { duration: 1000 });

      // Should be different controller instances
      expect(controller1).not.toBe(controller2);
    });

    it('should reuse objects from the pool after stop()', () => {
      const manager = new AnimationManager();
      const node = createMockNode();

      // Create and start an animation
      const controller1 = manager.animate(node, { x: 100 }, { duration: 1000 });
      controller1.start();

      // Stop it -- should release to pool
      controller1.stop();

      // Pool should now have objects
      // Create another animation -- should reuse from pool
      const controller2 = manager.animate(node, { y: 200 }, { duration: 1000 });

      // The controller instance should be reused (same object reference)
      expect(controller2).toBe(controller1);
    });

    it('should properly reinitialize recycled objects', () => {
      const manager = new AnimationManager();
      const node = createMockNode();

      // Create, start, and stop
      const controller1 = manager.animate(node, { x: 100 }, { duration: 500 });
      controller1.start();
      controller1.stop();

      // Reuse from pool with different props
      const controller2 = manager.animate(node, { y: 200 }, { duration: 1000 });

      // Should be stopped state (reinitialized)
      expect(controller2.state).toBe('stopped');

      // Should be startable
      controller2.start();
      expect(controller2.state).toBe('scheduled');
    });

    it('should clear event listeners on recycled objects', () => {
      const manager = new AnimationManager();
      const node = createMockNode();

      // Create and add a user listener
      const controller1 = manager.animate(node, { x: 100 }, { duration: 1000 });
      const stoppedSpy = vi.fn();
      controller1.on('stopped', stoppedSpy);
      controller1.start();
      controller1.stop();

      // The stopped listener should have fired once
      expect(stoppedSpy).toHaveBeenCalledTimes(1);

      // Reuse from pool
      const controller2 = manager.animate(node, { y: 200 }, { duration: 1000 });

      // Old listener should not fire on the recycled controller
      const newStoppedSpy = vi.fn();
      controller2.on('stopped', newStoppedSpy);
      controller2.start();
      controller2.stop();

      // Only the new spy should have fired, not the old one
      expect(stoppedSpy).toHaveBeenCalledTimes(1); // still 1 from before
      expect(newStoppedSpy).toHaveBeenCalledTimes(1);
    });

    it('should release to pool on natural animation finish', () => {
      const manager = new AnimationManager();
      const node = createMockNode();

      const controller = manager.animate(node, { x: 100 }, { duration: 0 });
      controller.start();

      // Duration is 0 so animation finishes immediately on first update
      manager.update(0);

      // Create another -- should reuse from pool
      const controller2 = manager.animate(node, { y: 200 }, { duration: 1000 });

      expect(controller2).toBe(controller);
    });

    it('should release to pool on node destruction', () => {
      const manager = new AnimationManager();
      const node = createMockNode();

      const controller = manager.animate(node, { x: 100 }, { duration: 1000 });
      controller.start();

      // Simulate node destruction
      (node as unknown as Record<string, unknown>).destroyed = true;
      manager.update(16);

      // Create another -- should reuse from pool
      const controller2 = manager.animate(node, { y: 200 }, { duration: 1000 });

      expect(controller2).toBe(controller);
    });

    it('should NOT release looping animations to pool on finish', () => {
      const manager = new AnimationManager();
      const node = createMockNode();

      const controller = manager.animate(
        node,
        { x: 100 },
        { duration: 100, loop: true },
      );
      controller.start();

      // Advance past the duration
      manager.update(200);

      // Create another -- should NOT reuse the looping controller
      const controller2 = manager.animate(node, { y: 200 }, { duration: 1000 });

      expect(controller2).not.toBe(controller);
    });

    it('should handle multiple pool cycles', () => {
      const manager = new AnimationManager();
      const node = createMockNode();

      // Cycle 1
      const c1 = manager.animate(node, { x: 100 }, { duration: 1000 });
      c1.start();
      c1.stop();

      // Cycle 2 -- reuses c1
      const c2 = manager.animate(node, { y: 200 }, { duration: 1000 });
      expect(c2).toBe(c1);
      c2.start();
      c2.stop();

      // Cycle 3 -- reuses again
      const c3 = manager.animate(node, { alpha: 0 }, { duration: 1000 });
      expect(c3).toBe(c1);
    });

    it('should grow pool independently for concurrent animations', () => {
      const manager = new AnimationManager();
      const node = createMockNode();

      // Create 3 concurrent animations
      const controllers: IAnimationController[] = [];
      for (let i = 0; i < 3; i++) {
        const c = manager.animate(node, { x: i * 100 }, { duration: 1000 });
        c.start();
        controllers.push(c);
      }

      // All should be distinct
      expect(controllers[0]).not.toBe(controllers[1]);
      expect(controllers[1]).not.toBe(controllers[2]);

      // Stop all -- pool should now have 3
      for (const c of controllers) {
        c.stop();
      }

      // Create 3 more -- should all reuse from pool
      const reused: IAnimationController[] = [];
      for (let i = 0; i < 3; i++) {
        reused.push(manager.animate(node, { y: i * 100 }, { duration: 1000 }));
      }

      // Each should be one of the original controllers (pool is LIFO)
      for (const r of reused) {
        expect(controllers).toContain(r);
      }
    });
  });
});
