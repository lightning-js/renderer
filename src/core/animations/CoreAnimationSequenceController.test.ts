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

/**
 * TDD spec tests for the new animationSequence() API.
 *
 * These tests are written BEFORE the implementation, following TDD practice.
 * All tests should be failing (red) until the implementation is complete.
 */

import { describe, it, expect, vi } from 'vitest';
import { CoreAnimationSequenceController } from './CoreAnimationSequenceController.js';
import { AnimationManager } from './AnimationManager.js';
import type { AnimationSequenceStep } from '../../common/AnimationSequenceTypes.js';
import type { CoreNode } from '../CoreNode.js';

function makeNode(overrides: Record<string, unknown> = {}): CoreNode {
  return {
    destroyed: false,
    x: 0,
    y: 0,
    alpha: 1,
    scaleX: 1,
    color: 0xffffffff,
    shader: null,
    ...overrides,
  } as unknown as CoreNode;
}

function makeStep(
  overrides: Partial<AnimationSequenceStep> = {},
): AnimationSequenceStep {
  return {
    duration: 1000,
    actions: [{ p: 'x', v: { '0': 0, '1': 100 } }],
    ...overrides,
  };
}

function makeController(
  node: CoreNode,
  steps: AnimationSequenceStep | AnimationSequenceStep[],
) {
  const manager = new AnimationManager();
  const controller = new CoreAnimationSequenceController(manager, node, steps);
  return { controller, manager };
}

// ---------------------------------------------------------------------------
// 1. Construction
// ---------------------------------------------------------------------------

describe('CoreAnimationSequenceController — construction', () => {
  it('returns an object with IAnimationController shape', () => {
    const node = makeNode();
    const { controller } = makeController(node, makeStep());
    expect(typeof controller.start).toBe('function');
    expect(typeof controller.stop).toBe('function');
    expect(typeof controller.pause).toBe('function');
    expect(typeof controller.restore).toBe('function');
    expect(typeof controller.waitUntilStopped).toBe('function');
    expect(typeof controller.state).toBe('string');
  });

  it('initial state is "stopped"', () => {
    const { controller } = makeController(makeNode(), makeStep());
    expect(controller.state).toBe('stopped');
  });

  it('accepts a single step (not wrapped in array)', () => {
    const node = makeNode();
    expect(() => makeController(node, makeStep())).not.toThrow();
  });

  it('accepts an array of steps', () => {
    const node = makeNode();
    expect(() => makeController(node, [makeStep(), makeStep()])).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 2. start() / state transitions
// ---------------------------------------------------------------------------

describe('CoreAnimationSequenceController — start()', () => {
  it('transitions state to "scheduled"', () => {
    const { controller } = makeController(makeNode(), makeStep());
    controller.start();
    expect(controller.state).toBe('scheduled');
  });

  it('returns the controller for chaining', () => {
    const { controller } = makeController(makeNode(), makeStep());
    expect(controller.start()).toBe(controller);
  });

  it('transitions to "running" once the first step animates', () => {
    const node = makeNode();
    const { controller, manager } = makeController(node, makeStep());
    controller.start();
    manager.update(16);
    expect(controller.state).toBe('running');
  });
});

// ---------------------------------------------------------------------------
// 3. Single-step keyframe interpolation
// ---------------------------------------------------------------------------

describe('CoreAnimationSequenceController — single step two keyframes', () => {
  it('sets x = 0 at progress 0 (before any update)', () => {
    const node = makeNode({ x: 0 });
    const { controller, manager } = makeController(
      node,
      makeStep({
        duration: 1000,
        actions: [{ p: 'x', v: { '0': 0, '1': 100 } }],
      }),
    );
    controller.start();
    manager.update(0);
    expect(node.x).toBe(0);
  });

  it('interpolates x to ~50 at 50% progress', () => {
    const node = makeNode({ x: 0 });
    const { controller, manager } = makeController(
      node,
      makeStep({
        duration: 1000,
        actions: [{ p: 'x', v: { '0': 0, '1': 100 } }],
      }),
    );
    controller.start();
    manager.update(500);
    expect(node.x).toBeCloseTo(50, 0);
  });

  it('sets x = 100 when step is complete', () => {
    const node = makeNode({ x: 0 });
    const { controller, manager } = makeController(
      node,
      makeStep({
        duration: 1000,
        actions: [{ p: 'x', v: { '0': 0, '1': 100 } }],
      }),
    );
    controller.start();
    manager.update(1200);
    expect(node.x).toBe(100);
  });

  it('animates multiple props in a single step simultaneously', () => {
    const node = makeNode({ x: 0, alpha: 1 });
    const { controller, manager } = makeController(node, {
      duration: 1000,
      actions: [
        { p: 'x', v: { '0': 0, '1': 200 } },
        { p: 'alpha', v: { '0': 1, '1': 0 } },
      ],
    });
    controller.start();
    manager.update(500);
    expect(node.x).toBeCloseTo(100, 0);
    expect(node.alpha).toBeCloseTo(0.5, 1);
  });
});

// ---------------------------------------------------------------------------
// 4. Three-keyframe (mid-stop) interpolation
// ---------------------------------------------------------------------------

describe('CoreAnimationSequenceController — multi-keyframe step', () => {
  it('interpolates correctly in the first segment (0 → 0.5)', () => {
    const node = makeNode({ x: 0 });
    const { controller, manager } = makeController(node, {
      duration: 1000,
      actions: [{ p: 'x', v: { '0': 0, '0.5': 40, '1': 100 } }],
    });
    controller.start();
    manager.update(250); // 25% — half way through first segment
    expect(node.x).toBeCloseTo(20, 0);
  });

  it('interpolates correctly in the second segment (0.5 → 1)', () => {
    const node = makeNode({ x: 0 });
    const { controller, manager } = makeController(node, {
      duration: 1000,
      actions: [{ p: 'x', v: { '0': 0, '0.5': 40, '1': 100 } }],
    });
    controller.start();
    manager.update(750); // 75% — half way through second segment
    expect(node.x).toBeCloseTo(70, 0);
  });
});

// ---------------------------------------------------------------------------
// 5. Multi-step sequencing
// ---------------------------------------------------------------------------

describe('CoreAnimationSequenceController — multi-step', () => {
  it('step 2 does not start before step 1 completes', () => {
    const node = makeNode({ x: 0, y: 0 });
    const { controller, manager } = makeController(node, [
      { duration: 500, actions: [{ p: 'x', v: { '0': 0, '1': 100 } }] },
      { duration: 500, actions: [{ p: 'y', v: { '0': 0, '1': 200 } }] },
    ]);
    controller.start();
    manager.update(250); // half way through step 1
    expect(node.y).toBe(0); // step 2 hasn't started
  });

  it('step 2 starts immediately after step 1 ends', () => {
    const node = makeNode({ x: 0, y: 0 });
    const { controller, manager } = makeController(node, [
      { duration: 500, actions: [{ p: 'x', v: { '0': 0, '1': 100 } }] },
      { duration: 500, actions: [{ p: 'y', v: { '0': 0, '1': 200 } }] },
    ]);
    controller.start();
    manager.update(600); // 100ms into step 2
    expect(node.x).toBe(100);
    expect(node.y).toBeGreaterThan(0);
  });

  it('emits "stopped" only after all steps complete', () => {
    const node = makeNode({ x: 0, y: 0 });
    const { controller, manager } = makeController(node, [
      { duration: 500, actions: [{ p: 'x', v: { '0': 0, '1': 100 } }] },
      { duration: 500, actions: [{ p: 'y', v: { '0': 0, '1': 200 } }] },
    ]);
    const cb = vi.fn();
    controller.on('stopped', cb);
    controller.start();
    manager.update(600); // only step 1 done
    expect(cb).not.toHaveBeenCalled();
    manager.update(600); // step 2 done
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 6. waitUntilStopped()
// ---------------------------------------------------------------------------

describe('CoreAnimationSequenceController — waitUntilStopped()', () => {
  it('resolves after a single step completes', async () => {
    const node = makeNode({ x: 0 });
    const { controller, manager } = makeController(
      node,
      makeStep({ duration: 100 }),
    );
    controller.start();
    const promise = controller.waitUntilStopped();
    manager.update(200);
    await expect(promise).resolves.toBeUndefined();
  });

  it('resolves after all steps in a sequence complete', async () => {
    const node = makeNode({ x: 0, y: 0 });
    const { controller, manager } = makeController(node, [
      { duration: 100, actions: [{ p: 'x', v: { '0': 0, '1': 100 } }] },
      { duration: 100, actions: [{ p: 'y', v: { '0': 0, '1': 200 } }] },
    ]);
    controller.start();
    const promise = controller.waitUntilStopped();
    manager.update(150); // completes step 1 only
    manager.update(150); // completes step 2
    await expect(promise).resolves.toBeUndefined();
  });

  it('resolves immediately when stop() is called mid-sequence', async () => {
    const node = makeNode({ x: 0, y: 0 });
    const { controller, manager } = makeController(node, [
      { duration: 500, actions: [{ p: 'x', v: { '0': 0, '1': 100 } }] },
      { duration: 500, actions: [{ p: 'y', v: { '0': 0, '1': 200 } }] },
    ]);
    controller.start();
    const promise = controller.waitUntilStopped();
    manager.update(300);
    controller.stop();
    await expect(promise).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 7. stop()
// ---------------------------------------------------------------------------

describe('CoreAnimationSequenceController — stop()', () => {
  it('sets state to "stopped"', () => {
    const { controller, manager } = makeController(makeNode(), makeStep());
    controller.start();
    manager.update(100);
    controller.stop();
    expect(controller.state).toBe('stopped');
  });

  it('emits "stopped"', () => {
    const { controller, manager } = makeController(makeNode(), makeStep());
    const cb = vi.fn();
    controller.on('stopped', cb);
    controller.start();
    manager.update(100);
    controller.stop();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('returns the controller for chaining', () => {
    const { controller } = makeController(makeNode(), makeStep());
    expect(controller.stop()).toBe(controller);
  });

  it('stops further animation updates', () => {
    const node = makeNode({ x: 0 });
    const { controller, manager } = makeController(
      node,
      makeStep({
        duration: 1000,
        actions: [{ p: 'x', v: { '0': 0, '1': 100 } }],
      }),
    );
    controller.start();
    manager.update(300);
    const xAfterStop = node.x;
    controller.stop();
    manager.update(300);
    expect(node.x).toBe(xAfterStop);
  });
});

// ---------------------------------------------------------------------------
// 8. pause() / resume
// ---------------------------------------------------------------------------

describe('CoreAnimationSequenceController — pause()', () => {
  it('sets state to "paused"', () => {
    const { controller, manager } = makeController(makeNode(), makeStep());
    controller.start();
    manager.update(100);
    controller.pause();
    expect(controller.state).toBe('paused');
  });

  it('resumes from the same point after start()', () => {
    const node = makeNode({ x: 0 });
    const { controller, manager } = makeController(
      node,
      makeStep({
        duration: 1000,
        actions: [{ p: 'x', v: { '0': 0, '1': 100 } }],
      }),
    );
    controller.start();
    manager.update(500); // 50%
    const xAtPause = node.x;
    controller.pause();
    manager.update(500); // while paused — should not advance
    expect(node.x).toBe(xAtPause);
    controller.start(); // resume
    manager.update(100); // should advance a bit
    expect(node.x).toBeGreaterThan(xAtPause);
  });
});

// ---------------------------------------------------------------------------
// 9. restore()
// ---------------------------------------------------------------------------

describe('CoreAnimationSequenceController — restore()', () => {
  it('resets node properties to values before the sequence started', () => {
    const node = makeNode({ x: 50 });
    const { controller, manager } = makeController(
      node,
      makeStep({
        duration: 1000,
        actions: [{ p: 'x', v: { '0': 50, '1': 200 } }],
      }),
    );
    controller.start();
    manager.update(700);
    expect(node.x).toBeGreaterThan(50);
    controller.restore();
    expect(node.x).toBe(50);
  });

  it('returns the controller for chaining', () => {
    const { controller } = makeController(makeNode(), makeStep());
    expect(controller.restore()).toBe(controller);
  });
});

// ---------------------------------------------------------------------------
// 10. Step-level repeat
// ---------------------------------------------------------------------------

describe('CoreAnimationSequenceController — step repeat', () => {
  it('replays a step N+1 times before moving to the next', () => {
    const node = makeNode({ x: 0, y: 0 });
    const { controller, manager } = makeController(node, [
      {
        duration: 100,
        repeat: 1, // plays twice total
        actions: [{ p: 'x', v: { '0': 0, '1': 100 } }],
      },
      { duration: 100, actions: [{ p: 'y', v: { '0': 0, '1': 50 } }] },
    ]);
    controller.start();
    manager.update(150); // through ~1.5 repeats of step 1
    expect(node.y).toBe(0); // step 2 should not have started
    manager.update(100); // past 2nd repeat
    expect(node.y).toBeGreaterThan(0); // step 2 has started
  });
});

// ---------------------------------------------------------------------------
// 11. step loop: -1 / loop: true  (infinite step)
// ---------------------------------------------------------------------------

describe('CoreAnimationSequenceController — infinite step loop', () => {
  it('keeps playing the step and never emits "stopped"', () => {
    const node = makeNode({ x: 0 });
    const { controller, manager } = makeController(node, [
      {
        duration: 100,
        repeat: -1,
        actions: [{ p: 'x', v: { '0': 0, '1': 100 } }],
      },
      { duration: 100, actions: [{ p: 'x', v: { '0': 100, '1': 200 } }] },
    ]);
    const cb = vi.fn();
    controller.on('stopped', cb);
    controller.start();
    // Run many cycles
    for (let i = 0; i < 20; i++) {
      manager.update(100);
    }
    expect(cb).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 12. Value smoothing { v, s }
// ---------------------------------------------------------------------------

describe('CoreAnimationSequenceController — value smoothing', () => {
  it('produces non-linear interpolation compared to a plain linear value', () => {
    const nodeLinear = makeNode({ x: 0 });
    const nodeSmoothed = makeNode({ x: 0 });

    const { controller: ctrlLinear, manager: mgr1 } = makeController(
      nodeLinear,
      { duration: 1000, actions: [{ p: 'x', v: { '0': 0, '1': 100 } }] },
    );
    const { controller: ctrlSmoothed, manager: mgr2 } = makeController(
      nodeSmoothed,
      {
        duration: 1000,
        actions: [
          {
            p: 'x',
            v: { '0': { v: 0, s: 0 }, '1': { v: 100, s: 0 } },
          },
        ],
      },
    );

    ctrlLinear.start();
    ctrlSmoothed.start();
    // Use 25% progress: smoothstep(0.25) ≈ 0.156 (x≈15.6) vs linear (x=25)
    mgr1.update(250);
    mgr2.update(250);

    // The smoothed value should differ significantly from the linear value
    expect(Math.abs(nodeSmoothed.x - nodeLinear.x)).toBeGreaterThan(5);
  });
});
