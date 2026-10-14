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

import type {
  Dimensions,
  INode,
  NodeLoadedEventHandler,
  RendererMain,
} from '@lightningjs/renderer';
import rockoImg from '../assets/rocko.png';
import type { ExampleSettings } from '../common/ExampleSettings.js';

interface LoseContextExtension {
  loseContext(): void;
  restoreContext(): void;
}

function waitForEvent(
  renderer: RendererMain,
  event: string,
  timeoutMs: number,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      renderer.off(event, onEvent);
      reject(new Error(`Timed out waiting for '${event}'`));
    }, timeoutMs);
    const onEvent = () => {
      clearTimeout(timer);
      resolve();
    };
    renderer.once(event, onEvent);
  });
}

function waitForNodeLoaded(imgNode: INode, timeoutMs: number) {
  return new Promise<Dimensions>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Timed out waiting for texture load'));
    }, timeoutMs);
    imgNode.once('loaded', ((target, payload) => {
      clearTimeout(timer);
      resolve(payload.dimensions);
    }) satisfies NodeLoadedEventHandler);
  });
}

function waitFrames(count: number) {
  return new Promise<void>((resolve) => {
    const tick = () => {
      count--;
      if (count <= 0) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

export async function automation(settings: ExampleSettings) {
  const { renderer, testRoot } = settings;

  // Scene covers both restore paths: an image texture (async decode +
  // throttled upload) and solid color blocks (immediate reload).
  const imgNode = renderer.createNode({
    x: 200,
    y: 100,
    src: rockoImg,
    parent: testRoot,
  });
  renderer.createNode({
    x: 500,
    y: 100,
    w: 300,
    h: 300,
    color: 0xff0000ff,
    parent: testRoot,
  });
  renderer.createNode({
    x: 200,
    y: 450,
    w: 600,
    h: 150,
    color: 0x00ff00ff,
    parent: testRoot,
  });

  try {
    const dimensions = await waitForNodeLoaded(imgNode, 10000);
    imgNode.w = dimensions.w;
    imgNode.h = dimensions.h;

    await settings.snapshot({ name: 'healthy' });

    const canvas = renderer.canvas;
    const gl =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ??
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ??
      (canvas.getContext(
        'experimental-webgl' as 'webgl',
      ) as WebGLRenderingContext | null);
    if (gl === null) {
      throw new Error('Could not obtain canvas WebGL context');
    }
    const loseExt = gl.getExtension(
      'WEBGL_lose_context',
    ) as unknown as LoseContextExtension | null;
    if (loseExt === null) {
      throw new Error('WEBGL_lose_context extension unavailable');
    }

    const lost = waitForEvent(renderer, 'contextLost', 5000);
    loseExt.loseContext();
    await lost;

    // Let several frames pass while lost: rendering must stay suspended
    // without crashing or submitting GPU work.
    await waitFrames(15);

    // Attach reload waiter before restoring to avoid missing the event.
    const reloaded = waitForNodeLoaded(imgNode, 15000);
    const restored = waitForEvent(renderer, 'contextRestored', 15000);
    loseExt.restoreContext();
    await restored;
    await reloaded;
    console.log('[context-loss-restore] completed successfully');
  } catch (e: unknown) {
    console.error(`[context-loss-restore] FAILED: ${(e as Error).message}`);
    // Paint an obviously wrong frame so the pixel comparison below fails
    // instead of hanging the automation run (a throw here would skip
    // doneTests and stall the whole harness).
    renderer.createNode({
      x: testRoot.x,
      y: testRoot.y,
      w: testRoot.w,
      h: testRoot.h,
      color: 0xff00ffff,
      parent: testRoot,
      zIndex: 9999,
    });
    await waitFrames(5);
  }
  await settings.snapshot({ name: 'restored' });
}

export default async function test() {
  console.log('ready!');
}
