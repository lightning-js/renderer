/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2025 Comcast Cable Communications Management, LLC.
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
 * Tests for the waitingForFont race condition in CanvasFontHandler.
 *
 * The bug: when a text node calls waitingForFont() BEFORE loadFont() has been
 * called for that family, nodesWaitingForFont[family] is undefined so the
 * function returns silently. The node is never added to the notification list.
 * When loadFont() is later called it creates a fresh empty array, missing the
 * already-registered node. The node stays at 0×0 indefinitely.
 *
 * The fix: waitingForFont() creates the entry when it doesn't exist yet.
 *          loadFont() preserves any pre-existing entry instead of overwriting.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import {
  waitingForFont,
  loadFont,
  isFontLoaded,
} from '../CanvasFontHandler.js';
import { UpdateType } from '../../CoreNode.js';
import type { CoreTextNode } from '../../CoreTextNode.js';
import type { Stage } from '../../Stage.js';

// ---------------------------------------------------------------------------
// Controllable FontFace mock
// ---------------------------------------------------------------------------
class MockFontFace {
  static lastCreated: MockFontFace | null = null;

  private _resolve!: (ff: MockFontFace) => void;
  private _loadPromise: Promise<MockFontFace>;

  constructor(public readonly family: string, public readonly source: string) {
    this._loadPromise = new Promise<MockFontFace>((resolve) => {
      this._resolve = resolve;
    });
    MockFontFace.lastCreated = this;
  }

  load(): Promise<MockFontFace> {
    return this._loadPromise;
  }

  /** Simulate the font finishing its network load. */
  resolve(): void {
    this._resolve(this);
  }
}

// Stub the global FontFace before any loadFont() call.
// FontFace is only used inside loadFont() function bodies (not at module
// evaluation time) so stubbing here is sufficient.
beforeAll(() => {
  vi.stubGlobal('FontFace', MockFontFace);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
let nodeIdCounter = 1000;

const makeMockNode = (): CoreTextNode =>
  ({
    id: nodeIdCounter++,
    setUpdateType: vi.fn(),
  } as unknown as CoreTextNode);

const makeMockStage = (): Stage =>
  ({
    platform: { addFont: vi.fn() },
  } as unknown as Stage);

/** Each test uses a unique family name to avoid interference from module-level
 *  state that persists across tests within a run. */
let familyCounter = 0;
const uniqueFamily = () => `TestFont-wff-${++familyCounter}`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('waitingForFont — race condition (node created before loadFont)', () => {
  it('wakes a node that registered BEFORE loadFont() was called', async () => {
    const family = uniqueFamily();
    const node = makeMockNode();
    const stage = makeMockStage();

    // Race: node calls waitingForFont() before the app has called loadFont().
    // Before the fix, nodesWaitingForFont[family] was undefined here so the
    // function returned silently and the node was never registered.
    waitingForFont(family, node);

    // App calls loadFont() after node creation (common init ordering).
    const loadPromise = loadFont(stage, {
      fontFamily: family,
      fontUrl: 'https://example.com/font.woff2',
    });

    // Font has not resolved yet — node must not be woken prematurely.
    expect(node.setUpdateType).not.toHaveBeenCalled();

    // Simulate the font finishing its network load.
    MockFontFace.lastCreated!.resolve();
    await loadPromise;

    // Node must be woken up so its next update() runs and generates layout.
    expect(node.setUpdateType).toHaveBeenCalledWith(UpdateType.Local);
    expect(isFontLoaded(family)).toBe(true);
  });

  it('wakes a node that registered AFTER loadFont() was called (normal path)', async () => {
    const family = uniqueFamily();
    const node = makeMockNode();
    const stage = makeMockStage();

    // Normal path: loadFont() is called first, then the node registers.
    const loadPromise = loadFont(stage, {
      fontFamily: family,
      fontUrl: 'https://example.com/font.woff2',
    });

    waitingForFont(family, node);

    MockFontFace.lastCreated!.resolve();
    await loadPromise;

    expect(node.setUpdateType).toHaveBeenCalledWith(UpdateType.Local);
    expect(isFontLoaded(family)).toBe(true);
  });

  it('wakes all nodes regardless of whether they registered before or after loadFont()', async () => {
    const family = uniqueFamily();
    const nodeA = makeMockNode(); // pre-registers
    const nodeB = makeMockNode(); // post-registers
    const stage = makeMockStage();

    // nodeA registers before loadFont().
    waitingForFont(family, nodeA);

    const loadPromise = loadFont(stage, {
      fontFamily: family,
      fontUrl: 'https://example.com/font.woff2',
    });

    // nodeB registers after loadFont() but before the font resolves.
    waitingForFont(family, nodeB);

    MockFontFace.lastCreated!.resolve();
    await loadPromise;

    expect(nodeA.setUpdateType).toHaveBeenCalledWith(UpdateType.Local);
    expect(nodeB.setUpdateType).toHaveBeenCalledWith(UpdateType.Local);
    expect(isFontLoaded(family)).toBe(true);
  });
});
