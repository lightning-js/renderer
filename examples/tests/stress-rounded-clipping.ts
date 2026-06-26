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
 * Stress test for WebGL stencil-buffer rounded corner clipping.
 *
 * Three scenes are cycled through every 6 seconds (press LEFT/RIGHT to
 * switch manually):
 *
 *  Scene 0 — Scrolling list
 *    A vertical list of rounded-clip portlets scrolls continuously.
 *    Each portlet has an overflowing image child.  Tests the common TV-UI
 *    pattern where many stencil regions translate in lock-step.
 *
 *  Scene 1 — Flying cards
 *    Rounded-clip cards fly independently across the screen with random
 *    velocity + bounce.  Tests many independent stencil regions being
 *    created/torn-down every frame.
 *
 *  Scene 2 — Nested rounded clips
 *    An outer rounded-clip row scrolls while each cell contains an inner
 *    rounded-clip thumbnail that zooms in/out.  Tests nested stencil ref
 *    counting (outer ref + inner ref per cell).
 */

import type { INode } from '@lightningjs/renderer';
import type { ExampleSettings } from '../common/ExampleSettings.js';
import robotImg from '../assets/robot/robot.png';

const W = 1920;
const H = 1080;
const CARD_W = 280;
const CARD_H = 180;
const CARD_RADIUS = 24;
const PADDING = 20;
const SCENE_DURATION_MS = 6000;

const randomBetween = (lo: number, hi: number) =>
  lo + Math.random() * (hi - lo);

export default async function test({
  renderer,
  testRoot,
  perfMultiplier,
}: ExampleSettings) {
  // ── background ──────────────────────────────────────────────────────────
  const bg = renderer.createNode({
    w: W,
    h: H,
    color: 0xff0f172aff,
    parent: testRoot,
  });

  // ── scene roots (only one visible at a time) ─────────────────────────────
  const scenes: INode[] = [];
  let activeScene = 0;

  const makeScene = () => {
    const node = renderer.createNode({
      x: 0,
      y: 0,
      w: W,
      h: H,
      alpha: 0,
      parent: bg,
    });
    scenes.push(node);
    return node;
  };

  // ────────────────────────────────────────────────────────────────────────
  // Scene 0 — Scrolling list
  // ────────────────────────────────────────────────────────────────────────
  const scene0 = makeScene();
  {
    const COLS = Math.max(1, Math.floor(perfMultiplier * 5));
    const ROWS = 8;
    const colW = Math.floor((W - PADDING * (COLS + 1)) / COLS);
    const rowH = CARD_H + PADDING;
    const listH = ROWS * rowH;
    // viewport — clips the list
    const viewport = renderer.createNode({
      x: PADDING,
      y: PADDING,
      w: W - PADDING * 2,
      h: H - PADDING * 2,
      clipping: true,
      parent: scene0,
    });
    const list = renderer.createNode({
      x: 0,
      y: 0,
      w: W - PADDING * 2,
      h: listH,
      parent: viewport,
    });

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const hue = Math.floor((col / COLS) * 360);
        const card = renderer.createNode({
          x: col * (colW + PADDING),
          y: row * rowH,
          w: colW,
          h: CARD_H,
          color: hslToArgb(hue, 55, 30),
          clipping: true,
          clipRadius: CARD_RADIUS,
          parent: list,
        });
        // overflowing image child
        renderer.createNode({
          mount: 0.5,
          x: colW / 2,
          y: CARD_H / 2,
          w: colW * 1.4,
          h: CARD_H * 1.4,
          src: robotImg,
          parent: card,
        });
      }
    }

    // scroll the list up/down continuously
    list
      .animate(
        { y: -(listH - (H - PADDING * 2)) },
        {
          duration: 4000,
          loop: true,
          stopMethod: 'reverse',
          easing: 'ease-in-out',
        },
      )
      .start();
  }

  // ────────────────────────────────────────────────────────────────────────
  // Scene 1 — Flying cards
  // ────────────────────────────────────────────────────────────────────────
  const scene1 = makeScene();
  {
    const NUM_CARDS = 20 * perfMultiplier;
    for (let i = 0; i < NUM_CARDS; i++) {
      const hue = Math.floor((i / NUM_CARDS) * 360);
      const card = renderer.createNode({
        x: randomBetween(0, W - CARD_W),
        y: randomBetween(0, H - CARD_H),
        w: CARD_W,
        h: CARD_H,
        color: hslToArgb(hue, 60, 35),
        clipping: true,
        clipRadius: CARD_RADIUS,
        parent: scene1,
      });
      renderer.createNode({
        mount: 0.5,
        x: CARD_W / 2,
        y: CARD_H / 2,
        w: CARD_W * 1.5,
        h: CARD_H * 1.5,
        src: robotImg,
        parent: card,
      });

      // randomised bounce animation
      const destX = randomBetween(0, W - CARD_W);
      const destY = randomBetween(0, H - CARD_H);
      const dur = randomBetween(1500, 4000);
      card
        .animate(
          { x: destX, y: destY },
          {
            duration: dur,
            loop: true,
            stopMethod: 'reverse',
            easing: 'ease-in-out',
          },
        )
        .start();
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Scene 2 — Nested rounded clips
  //   outer row scrolls horizontally; each cell has an inner clip that zooms
  // ────────────────────────────────────────────────────────────────────────
  const scene2 = makeScene();
  {
    const THUMB_W = 200;
    const THUMB_H = 130;
    const THUMB_RADIUS = 16;
    const OUTER_W = THUMB_W + PADDING * 2;
    const OUTER_H = THUMB_H + PADDING * 2;
    const NUM_CELLS = Math.max(4, 8 * perfMultiplier);
    const rowW = NUM_CELLS * (OUTER_W + PADDING);

    // outer clip — masks the scrolling row
    const rowViewport = renderer.createNode({
      x: 0,
      y: (H - OUTER_H) / 2,
      w: W,
      h: OUTER_H,
      clipping: true,
      clipRadius: 0,
      parent: scene2,
    });

    const row = renderer.createNode({
      x: 0,
      y: 0,
      w: rowW,
      h: OUTER_H,
      parent: rowViewport,
    });

    for (let i = 0; i < NUM_CELLS; i++) {
      const hue = Math.floor((i / NUM_CELLS) * 360);
      // outer cell — rounded clip
      const cell = renderer.createNode({
        x: i * (OUTER_W + PADDING) + PADDING,
        y: PADDING,
        w: OUTER_W,
        h: OUTER_H,
        color: hslToArgb(hue, 40, 20),
        clipping: true,
        clipRadius: CARD_RADIUS,
        parent: row,
      });
      // inner thumbnail — nested rounded clip
      const thumb = renderer.createNode({
        x: PADDING,
        y: PADDING,
        w: THUMB_W,
        h: THUMB_H,
        clipping: true,
        clipRadius: THUMB_RADIUS,
        parent: cell,
      });
      renderer.createNode({
        mount: 0.5,
        x: THUMB_W / 2,
        y: THUMB_H / 2,
        w: THUMB_W * 1.5,
        h: THUMB_H * 1.5,
        src: robotImg,
        parent: thumb,
      });

      // inner zoom animation — different phase per cell
      const zoomDur = randomBetween(800, 1800);
      const zoomScale = randomBetween(1.1, 1.6);
      thumb
        .animate(
          { scaleX: zoomScale, scaleY: zoomScale },
          {
            duration: zoomDur,
            loop: true,
            stopMethod: 'reverse',
            easing: 'ease-in-out',
            delay: (i / NUM_CELLS) * zoomDur,
          },
        )
        .start();
    }

    // scroll the row
    row
      .animate(
        { x: -(rowW - W) },
        {
          duration: 5000,
          loop: true,
          stopMethod: 'reverse',
          easing: 'ease-in-out',
        },
      )
      .start();
  }

  // ── scene switcher ───────────────────────────────────────────────────────
  const showScene = (idx: number) => {
    for (let i = 0; i < scenes.length; i++) {
      scenes[i]!.alpha = i === idx ? 1 : 0;
    }
    activeScene = idx;
  };

  showScene(0);

  // auto-cycle
  let cycleTimer = setInterval(() => {
    showScene((activeScene + 1) % scenes.length);
  }, SCENE_DURATION_MS);

  // keyboard switching
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      clearInterval(cycleTimer);
      showScene((activeScene + 1) % scenes.length);
      cycleTimer = setInterval(
        () => showScene((activeScene + 1) % scenes.length),
        SCENE_DURATION_MS,
      );
    } else if (e.key === 'ArrowLeft') {
      clearInterval(cycleTimer);
      showScene((activeScene + scenes.length - 1) % scenes.length);
      cycleTimer = setInterval(
        () => showScene((activeScene + 1) % scenes.length),
        SCENE_DURATION_MS,
      );
    }
  });
}

// ── helpers ────────────────────────────────────────────────────────────────

const hslToArgb = (h: number, s: number, l: number): number => {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const r = Math.round(f(0) * 255);
  const g = Math.round(f(8) * 255);
  const b = Math.round(f(4) * 255);
  return ((r << 24) | (g << 16) | (b << 8) | 0xff) >>> 0;
};
