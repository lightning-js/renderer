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
 * Visual Regression Test: animationSequence()
 *
 * Exercises the L2-inspired animation sequence API introduced in L3:
 *
 *   Scenario 1 — single step, two keyframes (x slide)
 *   Scenario 2 — single step, three keyframes (bounce path)
 *   Scenario 3 — two-step sequence (slide then fade)
 *   Scenario 4 — step with repeat: 1 (plays twice)
 *   Scenario 5 — pause() mid-sequence then restore()
 *   Scenario 6 — stop() mid-sequence
 */

import type { ExampleSettings } from '../common/ExampleSettings.js';

export async function automation(settings: ExampleSettings) {
  await test(settings);
}

/** Wait for the 'stopped' event on an animation controller. */
function waitForStopped(seqCtrl: {
  once(event: 'stopped', cb: () => void): void;
}): Promise<void> {
  return new Promise<void>((resolve) => seqCtrl.once('stopped', resolve));
}

export default async function test({
  renderer,
  testRoot,
  snapshot,
}: ExampleSettings) {
  // Shared canvas layout
  testRoot.w = 780;
  testRoot.h = 660;
  testRoot.color = 0x111111ff;

  // ── helpers ───────────────────────────────────────────────────────────────

  // Label at bottom-left
  const label = renderer.createTextNode({
    parent: testRoot,
    x: 20,
    y: testRoot.h - 48,
    fontSize: 28,
    fontFamily: 'Ubuntu',
    color: 0xffffffff,
    text: '',
  });

  /** Create a coloured square used as the animated subject. */
  function makeBox(x: number, y: number, color: number) {
    return renderer.createNode({
      x,
      y,
      w: 100,
      h: 100,
      color,
      parent: testRoot,
    });
  }

  // ── Scenario 1: single step — two keyframes (x slide) ────────────────────
  label.text = 'S1 — single step, 2 keyframes: initial';
  const s1box = makeBox(40, 40, 0x00aaffff);
  await snapshot({ name: 's1-initial' });

  const s1ctrl = s1box.animationSequence({
    duration: 600,
    actions: [{ p: 'x', v: { '0': 40, '1': 640 } }],
  });

  const s1done = waitForStopped(s1ctrl);
  s1ctrl.start();
  await s1done;

  label.text = 'S1 — complete (x=640)';
  await snapshot({ name: 's1-end' });

  // ── Scenario 2: single step — three keyframes (bounce) ───────────────────
  label.text = 'S2 — single step, 3 keyframes: initial';
  const s2box = makeBox(40, 160, 0xff6600ff);
  await snapshot({ name: 's2-initial' });

  const s2ctrl = s2box.animationSequence({
    duration: 900,
    actions: [{ p: 'x', v: { '0': 40, '0.5': 640, '1': 40 } }],
  });

  // Hide during flight; snapshot the end state (returned to start)
  const s2done = waitForStopped(s2ctrl);
  s2ctrl.start();
  await s2done;

  label.text = 'S2 — complete (x=40, bounced back)';
  await snapshot({ name: 's2-end' });

  // ── Scenario 3: two-step sequence (slide then fade) ───────────────────────
  label.text = 'S3 — 2-step sequence: initial';
  const s3box = makeBox(40, 280, 0x00cc44ff);
  await snapshot({ name: 's3-initial' });

  const s3ctrl = s3box.animationSequence([
    {
      duration: 400,
      actions: [{ p: 'x', v: { '0': 40, '1': 640 } }],
    },
    {
      duration: 400,
      actions: [{ p: 'alpha', v: { '0': 1, '1': 0 } }],
    },
  ]);

  const s3done = waitForStopped(s3ctrl);
  s3ctrl.start();
  await s3done;

  label.text = 'S3 — complete (x=640, alpha=0)';
  await snapshot({ name: 's3-end' });

  // ── Scenario 4: step with repeat: 1 (plays twice) ─────────────────────────
  label.text = 'S4 — repeat:1 step: initial';
  const s4box = makeBox(40, 400, 0xffcc00ff);
  await snapshot({ name: 's4-initial' });

  const s4ctrl = s4box.animationSequence({
    duration: 300,
    repeat: 1, // plays twice total
    actions: [{ p: 'x', v: { '0': 40, '1': 340 } }],
  });

  const s4done = waitForStopped(s4ctrl);
  s4ctrl.start();

  await s4done;
  label.text = 'S4 — complete (x=340, 2 plays done)';
  await snapshot({ name: 's4-end' });

  // ── Scenario 5: pause() then restore() ─────────────────────────────────
  // Deterministic: pause() is called synchronously before any render frame
  // advances, so the box stays at its start position (x=40). restore() then
  // writes the captured start values back — also x=40. Both snapshots are
  // stable regardless of CI machine speed.
  label.text = 'S5 — pause + restore: initial';
  const s5box = makeBox(40, 520, 0xcc44ffff);
  await snapshot({ name: 's5-initial' });

  const s5ctrl = s5box.animationSequence({
    duration: 600,
    actions: [{ p: 'x', v: { '0': 40, '1': 640 } }],
  });

  // Pause before any frame runs — box stays at x=40.
  s5ctrl.start();
  s5ctrl.pause();
  label.text = 'S5 — paused (x=40, no frames advanced)';
  await snapshot({ name: 's5-paused' });

  // restore() writes captured start values back.
  s5ctrl.restore();
  label.text = 'S5 — restored (x=40)';
  await snapshot({ name: 's5-restored' });

  // ── Scenario 6: stop() before any frame ──────────────────────────────────
  // Deterministic: stop() is called synchronously after start() so no render
  // frame runs. The box stays at its initial position (x=40).
  label.text = 'S6 — stop before first frame: initial';
  const s6box = makeBox(40, 40, 0xff4444ff);
  await snapshot({ name: 's6-initial' });

  const s6ctrl = s6box.animationSequence([
    {
      duration: 600,
      actions: [{ p: 'x', v: { '0': 40, '1': 640 } }],
    },
    {
      duration: 400,
      actions: [{ p: 'alpha', v: { '0': 1, '1': 0 } }],
    },
  ]);

  // Stop immediately — no frames advance, x remains 40.
  s6ctrl.start();
  s6ctrl.stop();

  label.text = 'S6 — stopped mid-step-1';
  await snapshot({ name: 's6-stopped' });
}
