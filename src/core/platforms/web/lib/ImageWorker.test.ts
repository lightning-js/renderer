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
 * On-demand image worker pool growth.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ImageWorkerManager } from './ImageWorker.js';

class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  posted: unknown[] = [];
  terminated = false;
  constructor(public url: string) {
    FakeWorker.instances.push(this);
  }
  postMessage(msg: unknown) {
    this.posted.push(msg);
  }
  terminate() {
    this.terminated = true;
  }
  static instances: FakeWorker[] = [];
}

describe('ImageWorkerManager on-demand growth', () => {
  beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal(
      'self',
      (() => {
        const s = globalThis as unknown as Record<string, unknown>;
        return s['self'] ?? {};
      })(),
    );
    const selfGlobal = globalThis.self as unknown as Record<string, unknown>;
    if (selfGlobal['URL'] === undefined) {
      selfGlobal['URL'] = URL;
    }
    vi.stubGlobal('Worker', FakeWorker);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('spawns no workers until the first image', () => {
    const manager = new ImageWorkerManager(4, () => undefined);
    expect(manager.workers.length).toBe(0);
    expect(FakeWorker.instances.length).toBe(0);
  });

  it('spawns one worker per concurrent load up to the cap', async () => {
    const manager = new ImageWorkerManager(2, () => undefined);

    // Never resolve: both loads stay in flight so the pool must grow.
    const pending: Promise<never>[] = [];
    const first = manager.getImage('a.png', null, null, null, null, null);
    pending.push(first as Promise<never>);
    expect(manager.workers.length).toBe(1);

    const second = manager.getImage('b.png', null, null, null, null, null);
    pending.push(second as Promise<never>);
    expect(manager.workers.length).toBe(2);

    // At capacity: third load queues on the least-loaded worker.
    const third = manager.getImage('c.png', null, null, null, null, null);
    pending.push(third as Promise<never>);
    expect(manager.workers.length).toBe(2);
    // 1 + 1 + 1 distributed as 2 on worker 0 (least-loaded tie) + 1
    const loads = manager.workerLoad;
    expect(loads.reduce((a, b) => a + b, 0)).toBe(3);

    // Resolve everything by answering each posted message.
    for (const worker of FakeWorker.instances) {
      for (const msg of worker.posted) {
        const { id } = msg as { id: number };
        worker.onmessage?.({
          data: {
            id,
            data: { data: {}, premultiplyAlpha: null },
            error: undefined,
          },
        } as MessageEvent);
      }
    }
    await expect(first).resolves.toBeDefined();
    await expect(second).resolves.toBeDefined();
    await expect(third).resolves.toBeDefined();
  });
});
