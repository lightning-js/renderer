/*
 * Minimal repro for PR #861 surgical path.
 *
 * 3 solid rects (red, green, blue) at fixed positions. Only the middle
 * rect's color changes — the outer rects stay at the same x. The fix
 * under test is CoreNode.set rtt -> requestRenderListUpdate and the
 * generic WebGlRenderer.addQuad() index guard (quadBufferIndex vs
 * curBufferIdx, no !isRTT). The unit test src/core/renderers/webgl/
 * WebGlRenderer.dirtyQuadBuffer.test.ts covers the stale-slot case
 * with a fake GPU mirror; this example is just the visual sanity.
 *
 * Controls: ArrowRight steps, R resets.
 */

import { type INode } from '@lightningjs/renderer';
import type { ExampleSettings } from '../common/ExampleSettings.js';

export async function automation(settings: ExampleSettings) {
  const next = (await test(settings)) as unknown as { (): void };
  await settings.snapshot({ name: 'initial' });
  next();
  await settings.snapshot({ name: 'correct-reorder-full' });
  next();
  await settings.snapshot({ name: 'surgical-color' });
  next();
  await settings.snapshot({ name: 'recover' });
}

export default async function test({ renderer, testRoot }: ExampleSettings) {
  testRoot.w = 480;
  testRoot.h = 160;
  testRoot.color = 0xffffffff;

  const a = renderer.createNode({
    x: 20,
    y: 40,
    w: 80,
    h: 80,
    color: 0xff0000ff, // red
    parent: testRoot,
  });
  let b = renderer.createNode({
    x: 120,
    y: 40,
    w: 80,
    h: 80,
    color: 0x00ff00ff, // green
    parent: testRoot,
  });
  const c = renderer.createNode({
    x: 220,
    y: 40,
    w: 80,
    h: 80,
    color: 0x0000ffff, // blue
    parent: testRoot,
  });

  const label = renderer.createTextNode({
    x: 20,
    y: 10,
    text: 'dirty-stale-slot: initial',
    fontSize: 14,
    parent: testRoot,
  });

  let step = 0;
  function next() {
    step++;
    if (step > 3) {
      step = 0;
      label.text = 'reset';
      b.destroy();
      b = renderer.createNode({
        x: 120,
        y: 40,
        w: 80,
        h: 80,
        color: 0x00ff00ff,
        parent: testRoot,
      });
      a.color = 0xff0000ff;
      c.color = 0x0000ffff;
      return;
    }
    if (step === 1) {
      label.text = '1: b light-green via API (FULL)';
      b.destroy();
      b = renderer.createNode({
        x: 120,
        y: 40,
        w: 80,
        h: 80,
        color: 0x00ff88ff,
        parent: testRoot,
      });
    } else if (step === 2) {
      label.text = '2: b orange (SURGICAL) -> stays correct';
      b.color = 0xff8800ff;
    } else if (step === 3) {
      label.text = '3: recover';
      b.destroy();
      b = renderer.createNode({
        x: 120,
        y: 40,
        w: 80,
        h: 80,
        color: 0x00ff00ff,
        parent: testRoot,
      });
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') next();
    if (e.key === 'r' || e.key === 'R') {
      step = 0;
      label.text = 'reset';
      b.destroy();
      b = renderer.createNode({
        x: 120,
        y: 40,
        w: 80,
        h: 80,
        color: 0x00ff00ff,
        parent: testRoot,
      });
      a.color = 0xff0000ff;
      c.color = 0x0000ffff;
    }
  });

  return next as unknown as { (): void };
}
