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

/**
 * Stage.ready: resolves after the first drawn frame (or on destroy).
 */
import { describe, it, expect, vi } from 'vitest';
import { Stage } from './Stage.js';

function makeStage(
  overrides: Record<string, unknown> = {},
): Stage & { ready: Promise<void> } {
  let resolveReady!: () => void;
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });
  const stage = Object.create(Stage.prototype) as Stage;
  Object.assign(stage, {
    ready,
    resolveReady,
    firstFrameDrawn: false,
    timedNodes: [],
    renderRequested: false,
    renderListDirty: false,
    renderListNodes: [],
    renderListLen: 0,
    renderListOps: new Uint8Array(256),
    root: { updateType: 0 },
    renderer: {
      reset: vi.fn(),
      rttNodes: [],
      render: vi.fn(),
      getQuadCount: vi.fn(() => null),
    },
    txManager: { hasUpdates: vi.fn(() => false) },
    txMemManager: { criticalCleanupRequested: false },
    options: { fpsUpdateInterval: 0 },
    ...overrides,
  });
  return stage as Stage & { ready: Promise<void> };
}

describe('Stage.ready', () => {
  it('resolves after the first drawn frame', async () => {
    const stage = makeStage();
    let resolved = false;
    stage.ready.then(() => {
      resolved = true;
    });

    stage.drawFrame();
    expect(resolved).toBe(false);
    await stage.ready;
    expect(resolved).toBe(true);

    // Second frame keeps it resolved without issues
    stage.drawFrame();
    await stage.ready;
  });

  it('resolves on destroy even if no frame was drawn', async () => {
    const stage = makeStage({
      platform: { stopLoop: vi.fn() },
      root: { updateType: 0, destroy: vi.fn() },
      txMemManager: { criticalCleanupRequested: false, destroy: vi.fn() },
      txManager: { hasUpdates: vi.fn(() => false), destroy: vi.fn() },
      renderer: {
        reset: vi.fn(),
        rttNodes: [],
        render: vi.fn(),
        getQuadCount: vi.fn(() => null),
        destroy: vi.fn(),
      },
      textRenderers: {},
    });

    let resolved = false;
    stage.ready.then(() => {
      resolved = true;
    });
    stage.destroy();
    await stage.ready;
    expect(resolved).toBe(true);
  });
});
