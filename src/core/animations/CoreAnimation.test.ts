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
import { CoreAnimation } from './CoreAnimation.js';
import type { CoreNode } from '../CoreNode.js';

/**
 * Build a minimal CoreNode-like mock. We only need the props
 * that CoreAnimation reads/writes (numeric node properties + destroyed flag).
 */
function makeNode(overrides: Record<string, unknown> = {}): CoreNode {
  return {
    destroyed: false,
    x: 0,
    y: 0,
    w: 100,
    h: 100,
    alpha: 1,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    mountX: 0,
    mountY: 0,
    pivotX: 0.5,
    pivotY: 0.5,
    color: 0xffffffff,
    colorTl: 0xffffffff,
    colorTr: 0xffffffff,
    colorBl: 0xffffffff,
    colorBr: 0xffffffff,
    shader: null,
    ...overrides,
  } as unknown as CoreNode;
}

describe('CoreAnimation', () => {
  describe('constructor', () => {
    it('captures start values from the node', () => {
      const node = makeNode({ x: 50, alpha: 0.5 });
      const anim = new CoreAnimation(
        node,
        { x: 200, alpha: 1 },
        { duration: 1000 },
      );
      expect(anim.propValuesMap['props']!['x']!.start).toBe(50);
      expect(anim.propValuesMap['props']!['alpha']!.start).toBe(0.5);
    });

    it('uses supplied target values', () => {
      const node = makeNode({ x: 0 });
      const anim = new CoreAnimation(node, { x: 300 }, { duration: 500 });
      expect(anim.propValuesMap['props']!['x']!.target).toBe(300);
    });

    it('applies default animation settings', () => {
      const node = makeNode();
      const anim = new CoreAnimation(node, { x: 100 }, {});
      expect(anim.settings.duration).toBe(0);
      expect(anim.settings.delay).toBe(0);
      expect(anim.settings.easing).toBe('linear');
      expect(anim.settings.loop).toBe(false);
      expect(anim.settings.repeat).toBe(0);
      expect(anim.settings.stopMethod).toBe(false);
    });
  });

  describe('update()', () => {
    it('emits "finished" immediately when duration and delay are 0', () => {
      const node = makeNode();
      const anim = new CoreAnimation(node, { x: 100 }, { duration: 0 });
      const cb = vi.fn();
      anim.once('finished', cb);
      anim.update(16);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('counts down the delay before animating', () => {
      const node = makeNode({ x: 0 });
      const anim = new CoreAnimation(
        node,
        { x: 100 },
        { duration: 1000, delay: 500 },
      );
      // First tick: still in delay phase
      anim.update(400);
      expect(node.x).toBe(0);
      // Second tick: exceeds delay, partial progress
      anim.update(200);
      expect(node.x).toBeGreaterThan(0);
    });

    it('emits "animating" once after delay phase', () => {
      const node = makeNode({ x: 0 });
      const anim = new CoreAnimation(
        node,
        { x: 100 },
        { duration: 1000, delay: 100 },
      );
      const cb = vi.fn();
      anim.on('animating', cb);
      anim.update(200); // passes delay, starts animating
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('advances node property in proportion to elapsed time', () => {
      const node = makeNode({ x: 0 });
      const anim = new CoreAnimation(node, { x: 100 }, { duration: 1000 });
      anim.update(500); // 50% progress
      expect(node.x).toBeCloseTo(50);
    });

    it('clamps progress to 1 and emits "finished"', () => {
      const node = makeNode({ x: 0 });
      const anim = new CoreAnimation(node, { x: 100 }, { duration: 1000 });
      const cb = vi.fn();
      anim.once('finished', cb);
      anim.update(1200); // beyond duration
      expect(node.x).toBe(100);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('loops when loop: true — resets progress to 0 on overflow', () => {
      const node = makeNode({ x: 0 });
      const anim = new CoreAnimation(
        node,
        { x: 100 },
        { duration: 1000, loop: true },
      );
      anim.update(1100); // complete one cycle — progress wraps back to 0
      // CoreAnimation resets progress=0 on loop, so updateValues(0) → start value
      expect(node.x).toBe(0);
    });

    it('emits "tick" with progress on intermediate frames', () => {
      const node = makeNode({ x: 0 });
      const anim = new CoreAnimation(node, { x: 100 }, { duration: 1000 });
      const ticks: number[] = [];
      anim.on('tick', (_: unknown, data: { progress: number }) => {
        ticks.push(data.progress);
      });
      anim.update(300);
      anim.update(300);
      expect(ticks.length).toBe(2);
      expect(ticks[0]).toBeCloseTo(0.3);
      expect(ticks[1]).toBeCloseTo(0.6);
    });

    it('emits "destroyed" and stops when node.destroyed is true', () => {
      const node = makeNode({ destroyed: true });
      const anim = new CoreAnimation(node, { x: 100 }, { duration: 1000 });
      const cb = vi.fn();
      anim.once('destroyed', cb);
      anim.update(16);
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  describe('reset()', () => {
    it('resets progress to 0 and re-applies delay', () => {
      const node = makeNode({ x: 0 });
      const anim = new CoreAnimation(
        node,
        { x: 100 },
        { duration: 1000, delay: 200 },
      );
      anim.update(500); // 50% through, x ~= 30 (300ms into 1000ms after 200ms delay)
      const xBeforeReset = node.x;
      expect(xBeforeReset).toBeGreaterThan(0);
      anim.reset();
      // After reset, delay is restored — a small tick within the delay window
      // should not change x (the node retains its current value; reset only
      // resets internal animation progress/delay state, not node values).
      anim.update(10); // still within the 200ms delay
      expect(node.x).toBe(xBeforeReset);
    });
  });

  describe('restore()', () => {
    it('writes original start values back to the node', () => {
      const node = makeNode({ x: 50, alpha: 0.5 });
      const anim = new CoreAnimation(
        node,
        { x: 200, alpha: 1 },
        { duration: 1000 },
      );
      anim.update(600); // half-way through
      expect(node.x).toBeGreaterThan(50);
      anim.restore();
      expect(node.x).toBe(50);
      expect(node.alpha).toBe(0.5);
    });
  });

  describe('reverse()', () => {
    it('swaps start and target values', () => {
      const node = makeNode({ x: 0 });
      const anim = new CoreAnimation(node, { x: 100 }, { duration: 1000 });
      anim.reverse();
      expect(anim.propValuesMap['props']!['x']!.start).toBe(100);
      expect(anim.propValuesMap['props']!['x']!.target).toBe(0);
    });

    it('clears stopMethod after reversing (non-loop)', () => {
      const node = makeNode({ x: 0 });
      const anim = new CoreAnimation(
        node,
        { x: 100 },
        { duration: 1000, stopMethod: 'reverse' },
      );
      anim.reverse();
      expect(anim.settings.stopMethod).toBe(false);
    });
  });

  describe('stopMethod: "reverse"', () => {
    it('emits "finished" when progress completes (triggering reverse path in controller)', () => {
      const node = makeNode({ x: 0 });
      const anim = new CoreAnimation(
        node,
        { x: 100 },
        { duration: 1000, stopMethod: 'reverse' },
      );
      const cb = vi.fn();
      anim.once('finished', cb);
      anim.update(1100);
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateValue()', () => {
    it('returns start value at progress 0', () => {
      const node = makeNode({ x: 10 });
      const anim = new CoreAnimation(node, { x: 100 }, { duration: 1000 });
      const result = anim.updateValue('x', 100, 10, 'linear');
      expect(result).toBe(10);
    });

    it('returns target value at progress 1', () => {
      const node = makeNode({ x: 0 });
      const anim = new CoreAnimation(node, { x: 100 }, { duration: 1000 });
      anim.update(1000);
      const result = anim.updateValue('x', 100, 0, 'linear');
      expect(result).toBe(100);
    });

    it('interpolates color values using mergeColorProgress', () => {
      const node = makeNode({ colorTl: 0xff0000ff });
      const anim = new CoreAnimation(
        node,
        { colorTl: 0x0000ffff },
        { duration: 1000 },
      );
      anim.update(500); // 50%
      // Result should be neither start nor end color
      expect(node.colorTl).not.toBe(0xff0000ff);
      expect(node.colorTl).not.toBe(0x0000ffff);
    });
  });
});
