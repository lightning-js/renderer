/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2026 Comcast Cable Communications Management, LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
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

import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium, type Page } from 'playwright';

type Mode = 'rectangle' | 'image' | 'sdf' | 'canvas';
const modes: Mode[] = ['rectangle', 'image', 'sdf', 'canvas'];
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
);
const port = 50537;
const rounds = 6;
const batch = 150;
const maxHeapGrowth = 16 * 1024 * 1024;
const maxBitmapGrowth = 16;

interface Sample {
  heapBytes: number;
  gpuBytes: number;
  loadedTextures: number;
  bitmapsCreated: number;
  bitmapsClosed: number;
}

interface ModeReport {
  samples: Sample[];
  boundary: { visible: number; offscreen: number; returned: number };
}

function endpoints(samples: Sample[]): readonly [Sample, Sample] {
  const first = samples[0];
  const last = samples.at(-1);
  if (first === undefined || last === undefined)
    throw new Error('No memory samples collected');
  return [first, last];
}

type Scenario = {
  spawn(mode: Mode, round: number, count: number): void;
  shift(offscreen: boolean): void;
  cleanup(): void;
  destroy(): void;
  memory(): { memUsed: number; loadedTextures: number };
};

declare global {
  interface Window {
    rendererMemoryScenario?: Scenario;
    bitmapStats?: { created: number; closed: number };
  }
}

async function waitForServer(server: ChildProcess): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null)
      throw new Error(`Example preview exited with code ${server.exitCode}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok && server.exitCode === null) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Example preview did not start');
}

async function cycle(page: Page, mode: Mode, round: number): Promise<void> {
  await page.evaluate(
    ({ mode, round, batch }) => {
      window.rendererMemoryScenario?.spawn(mode, round, batch);
    },
    { mode, round, batch },
  );
  await page.waitForTimeout(220);
  await page.evaluate(() => window.rendererMemoryScenario?.shift(true));
  await page.waitForTimeout(100);
  await page.evaluate(() => window.rendererMemoryScenario?.shift(false));
  await page.waitForTimeout(220);
  await page.evaluate(() => window.rendererMemoryScenario?.destroy());
  await page.waitForTimeout(100);
}

async function run(): Promise<void> {
  const server = spawn(
    process.execPath,
    [
      path.join(root, 'examples/node_modules/vite/bin/vite.js'),
      'preview',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--strictPort',
    ],
    {
      cwd: path.join(root, 'examples'),
      stdio: 'inherit',
    },
  );
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    await waitForServer(server);
    browser = await chromium.launch({
      args: ['--enable-precise-memory-info', '--enable-unsafe-swiftshader'],
    });
    const report = {} as Record<Mode, ModeReport>;

    for (const mode of modes) {
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
      });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Performance.enable');
      await page.addInitScript(() => {
        const stats = { created: 0, closed: 0 };
        window.bitmapStats = stats;
        if (typeof OffscreenCanvas !== 'undefined') {
          const transfer = OffscreenCanvas.prototype.transferToImageBitmap;
          OffscreenCanvas.prototype.transferToImageBitmap = function () {
            const bitmap = transfer.call(this);
            stats.created++;
            return bitmap;
          };
        }
        if (typeof ImageBitmap !== 'undefined') {
          const close = ImageBitmap.prototype.close;
          ImageBitmap.prototype.close = function () {
            stats.closed++;
            return close.call(this);
          };
        }
      });
      await page.goto(
        `http://127.0.0.1:${port}/?test=memory-lifecycle&overlay=false&monitor=false&renderMode=webgl`,
      );
      await page.waitForFunction(() => Boolean(window.rendererMemoryScenario));

      const sample = async (): Promise<Sample> => {
        await cdp.send('HeapProfiler.collectGarbage');
        await page.waitForTimeout(100);
        await cdp.send('HeapProfiler.collectGarbage');
        const { metrics } = await cdp.send('Performance.getMetrics');
        const heapBytes = metrics.find(
          (metric) => metric.name === 'JSHeapUsedSize',
        )?.value;
        if (heapBytes === undefined)
          throw new Error('Chromium did not report JSHeapUsedSize');
        const { gpuBytes, loadedTextures, bitmapStats } = await page.evaluate(
          () => {
            const scenario = window.rendererMemoryScenario;
            const bitmapStats = window.bitmapStats;
            if (scenario === undefined || bitmapStats === undefined)
              throw new Error('Memory instrumentation was not initialized');
            const { memUsed, loadedTextures } = scenario.memory();
            return {
              gpuBytes: memUsed,
              loadedTextures,
              bitmapStats,
            };
          },
        );
        return {
          heapBytes,
          gpuBytes,
          loadedTextures,
          bitmapsCreated: bitmapStats.created,
          bitmapsClosed: bitmapStats.closed,
        };
      };

      // Give freshly created textures time to leave their startup grace
      // period before testing a forced offscreen eviction and reload.
      await page.evaluate(
        ({ mode, batch }) =>
          window.rendererMemoryScenario?.spawn(mode, -1, batch),
        { mode, batch },
      );
      await page.waitForTimeout(2300);
      const visible = (await sample()).gpuBytes;
      await page.evaluate(() => window.rendererMemoryScenario?.shift(true));
      await page.waitForTimeout(150);
      await page.evaluate(() => window.rendererMemoryScenario?.cleanup());
      const offscreen = (await sample()).gpuBytes;
      await page.evaluate(() => window.rendererMemoryScenario?.shift(false));
      await page.waitForTimeout(400);
      const returned = (await sample()).gpuBytes;
      await page.evaluate(() => window.rendererMemoryScenario?.destroy());
      const entry: ModeReport = {
        samples: [],
        boundary: { visible, offscreen, returned },
      };
      report[mode] = entry;

      for (let round = 0; round < rounds; round++) {
        await cycle(page, mode, round);
        entry.samples.push(await sample());
      }
      const [first, last] = endpoints(entry.samples);
      console.log(
        `${mode}: post-GC heap ${Math.round((last.heapBytes - first.heapBytes) / 1024)} KiB, ` +
          `GPU ${Math.round(last.gpuBytes / 1024)} KiB, ` +
          `open bitmaps ${last.bitmapsCreated - last.bitmapsClosed}`,
      );
      await context.close();
    }

    const directory = path.join(root, 'visual-regression/memory-results');
    await mkdir(directory, { recursive: true });
    await writeFile(
      path.join(directory, 'measurements.json'),
      JSON.stringify(report, null, 2),
    );

    const [controlFirst, controlLast] = endpoints(report.rectangle.samples);
    const controlGrowth = controlLast.heapBytes - controlFirst.heapBytes;
    if (report.sdf.boundary.visible <= report.rectangle.boundary.visible) {
      throw new Error(
        'MSDF font atlas was not loaded; the SDF comparison is invalid',
      );
    }
    for (const mode of modes) {
      const { samples, boundary } = report[mode];
      const [first, last] = endpoints(samples);
      const heapGrowth = last.heapBytes - first.heapBytes;
      if (heapGrowth - controlGrowth > maxHeapGrowth) {
        throw new Error(
          `${mode}: post-GC heap grew ${Math.round((heapGrowth - controlGrowth) / 1024 / 1024)} MiB more than rectangles`,
        );
      }
      if (mode === 'image' || mode === 'canvas') {
        if (
          boundary.offscreen >= boundary.visible ||
          boundary.returned <= boundary.offscreen
        ) {
          throw new Error(
            `${mode}: GPU textures did not evict/reload across the viewport boundary: ${JSON.stringify(boundary)}`,
          );
        }
      }
      if (mode === 'canvas') {
        if (last.bitmapsCreated <= first.bitmapsCreated)
          throw new Error('Canvas text did not produce any ImageBitmaps');
        const bitmapGrowth =
          last.bitmapsCreated -
          last.bitmapsClosed -
          (first.bitmapsCreated - first.bitmapsClosed);
        if (bitmapGrowth > maxBitmapGrowth)
          throw new Error(
            `Canvas text retained ${bitmapGrowth} extra ImageBitmaps`,
          );
      }
    }
  } finally {
    try {
      await browser?.close();
    } finally {
      server.kill();
    }
  }
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
