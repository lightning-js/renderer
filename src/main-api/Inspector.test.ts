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

// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Inspector } from './Inspector.js';
import type { CoreNode, CoreNodeAnimateProps } from '../core/CoreNode.js';
import type { RendererMainSettings } from './Renderer.js';
import type { IAnimationController } from '../common/IAnimationController.js';
import type { AnimationSettings } from '../core/animations/CoreAnimation.js';

// Mock isProductionEnvironment so the Inspector actually initializes
vi.mock('../utils.js', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('../utils.js');
  return {
    ...actual,
    isProductionEnvironment: false,
  };
});

/**
 * Stand-in for CoreNode.
 *
 * The properties the inspector traps have to live on the prototype, the same
 * way they do on a real CoreNode - the trap forwards reads to the original
 * descriptor's getter, so an own data property would read back as undefined.
 */
class FakeNode {
  readonly children: FakeNode[] = [];
  props: Record<string, unknown> = {};
  destroyed = false;
  on = vi.fn();
  off = vi.fn();

  constructor(private readonly _id: number) {}

  get id(): number {
    return this._id;
  }

  /** Mirrors CoreNode.destroy(): kills children first, top down. */
  destroy(): void {
    while (this.children.length > 0) {
      const child = this.children.shift() as FakeNode;
      child.destroy();
    }
    this.destroyed = true;
  }

  animate(
    _props: CoreNodeAnimateProps,
    _settings: AnimationSettings,
  ): IAnimationController {
    return makeController();
  }
}

function makeController(): IAnimationController {
  return {
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    pause: vi.fn().mockReturnThis(),
    restore: vi.fn().mockReturnThis(),
    waitUntilStopped: vi.fn().mockResolvedValue(undefined),
    state: 'scheduled',
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
    emit: vi.fn(),
  } as unknown as IAnimationController;
}

function makeSettings(
  inspectorOptions?: Partial<RendererMainSettings['inspectorOptions']>,
): RendererMainSettings {
  return {
    appWidth: 1920,
    appHeight: 1080,
    deviceLogicalPixelRatio: 1,
    inspectorOptions,
  } as unknown as RendererMainSettings;
}

/** The inspector mirrors each node onto a div hung off `node.div`. */
function divOf(node: FakeNode): HTMLElement {
  return (node as unknown as { div: HTMLElement }).div;
}

describe('Inspector node teardown', () => {
  let canvas: HTMLCanvasElement;
  let inspector: Inspector;

  beforeEach(() => {
    if (!globalThis.ResizeObserver) {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      } as unknown as typeof ResizeObserver;
    }
    Inspector.clearAnimationStats();
    canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
  });

  afterEach(() => {
    inspector?.destroy();
    canvas.remove();
    Inspector.clearAnimationStats();
  });

  it('removes descendant divs when a subtree is destroyed', () => {
    inspector = new Inspector(canvas, makeSettings());

    const parent = new FakeNode(1);
    const child = new FakeNode(2);
    parent.children.push(child);

    inspector.createNode(parent as unknown as CoreNode);
    inspector.createNode(child as unknown as CoreNode);

    const parentDiv = divOf(parent);
    const childDiv = divOf(child);

    // Mirror the DOM nesting the inspector builds via the `parent` setter
    document.body.appendChild(parentDiv);
    parentDiv.appendChild(childDiv);

    parent.destroy();

    expect(child.destroyed).toBe(true);
    // The parent div is detached first, so a lookup by id can no longer find
    // the child - it has to be removed through its own reference.
    expect(childDiv.parentNode).toBeNull();
    expect(parentDiv.parentNode).toBeNull();
    expect(parentDiv.contains(childDiv)).toBe(false);
  });

  it('drops active animations belonging to a destroyed node', () => {
    inspector = new Inspector(
      canvas,
      makeSettings({ enableAnimationMonitoring: true }),
    );

    const node = new FakeNode(3);
    inspector.createNode(node as unknown as CoreNode);
    document.body.appendChild(divOf(node));

    const controller = node.animate(
      { x: 100 } as unknown as CoreNodeAnimateProps,
      { duration: 10_000 } as AnimationSettings,
    );
    controller.start();

    expect(
      Inspector.getActiveAnimations().filter((a) => a.nodeId === 3),
    ).toHaveLength(1);

    node.destroy();

    expect(
      Inspector.getActiveAnimations().filter((a) => a.nodeId === 3),
    ).toHaveLength(0);
    // The animation is moved to history rather than silently dropped
    expect(Inspector.getAnimationStats().totalAnimations).toBe(1);
  });
});
