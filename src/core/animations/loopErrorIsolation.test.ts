/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2026 Comcast Cable Communications Management, LLC.
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

import { describe, expect, it, vi, afterEach } from 'vitest';
import { AnimationManager } from './AnimationManager.js';
import type { CoreNode } from '../CoreNode.js';
import type { Stage } from '../Stage.js';

// Dev build: console.error fallback is enabled for the no-handler case.
vi.mock('../../utils.js', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('../../utils.js');
  return {
    ...actual,
    isProductionEnvironment: false,
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

function createMockStage(onError?: (error: unknown) => void): Stage {
  return {
    activeAnimationCount: 0,
    platform: { settings: { handleLoopError: onError } },
  } as unknown as Stage;
}

function createMockNode(
  stage: Stage,
  overrides: Record<string, unknown> = {},
): CoreNode {
  return {
    x: 0,
    destroyed: false,
    shader: null,
    stage,
    ...overrides,
  } as unknown as CoreNode;
}

describe('animation loop-error isolation', () => {
  it('bad custom easing reports via handleLoopError and falls back to linear', () => {
    const onError = vi.fn();
    const stage = createMockStage(onError);
    const manager = new AnimationManager(stage);
    const node = createMockNode(stage);
    const badEasing = vi.fn(() => {
      throw new Error('bad easing');
    });

    const controller = manager.createAnimation(
      node,
      { x: 100 },
      { duration: 100, easing: badEasing },
    );
    controller.start();

    expect(() => manager.update(16)).not.toThrow();
    // Fallback is linear: 16ms / 100ms * 100 = 16
    expect((node as unknown as Record<string, number>).x).toBeCloseTo(16);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('one bad animation does not block sibling animations', () => {
    const onError = vi.fn();
    const stage = createMockStage(onError);
    const manager = new AnimationManager(stage);
    const badNode = createMockNode(stage);
    const goodNode = createMockNode(stage);

    const bad = manager.createAnimation(
      badNode,
      { x: 100 },
      {
        duration: 100,
        easing: () => {
          throw new Error('bad easing');
        },
      },
    );
    const good = manager.createAnimation(
      goodNode,
      { x: 100 },
      { duration: 100 },
    );
    bad.start();
    good.start();

    expect(() => manager.update(50)).not.toThrow();
    expect((goodNode as unknown as Record<string, number>).x).toBeCloseTo(50);
    expect((badNode as unknown as Record<string, number>).x).toBeCloseTo(50);
  });

  it('throwing stopped listener is isolated; others still run; loop survives (PR 819 repro)', () => {
    const onError = vi.fn();
    const stage = createMockStage(onError);
    const manager = new AnimationManager(stage);
    const node = createMockNode(stage);

    const controller = manager.createAnimation(
      node,
      { x: 100 },
      { duration: 10 },
    );
    const bad = vi.fn(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      (undefined as any).foo.x();
    });
    const good = vi.fn();
    controller.on('stopped', bad);
    controller.on('stopped', good);
    controller.start();

    // Finish the animation: must not throw (previously killed rAF).
    expect(() => manager.update(16)).not.toThrow();

    expect(bad).toHaveBeenCalledTimes(1);
    expect(good).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('falls back to console.error without handleLoopError', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const stage = createMockStage(undefined);
    const manager = new AnimationManager(stage);
    const node = createMockNode(stage);

    const controller = manager.createAnimation(
      node,
      { x: 100 },
      { duration: 10 },
    );
    controller.on('stopped', () => {
      throw new Error('boom');
    });
    controller.start();

    expect(() => manager.update(16)).not.toThrow();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
