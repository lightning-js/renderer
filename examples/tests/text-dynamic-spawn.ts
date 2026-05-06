/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2024 Comcast Cable Communications Management, LLC.
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

import type { INode, ITextNode } from '@lightningjs/renderer';
import type { ExampleSettings } from '../common/ExampleSettings.js';

/**
 * Dynamic Sentence Spawn/Destroy Test
 *
 * Renders 4 columns of rows filling the entire screen (1920x1080).
 * On each cycle all existing text nodes are destroyed and a fresh
 * batch is created — stressing the renderer's node lifecycle.
 *
 * Controls:
 * - Enter: Toggle automatic cycles on/off
 * - Space: Manually trigger a single destroy+respawn cycle
 */

const createSentenceCorpus = () => ({
  SUBJECTS: [
    'The cat',
    'A fox',
    'The dog',
    'One bird',
    'The child',
    'A wizard',
    'The knight',
    'Some rain',
    'A storm',
    'The river',
  ],
  VERBS: [
    'quickly jumps',
    'slowly walks',
    'often dreams',
    'silently runs',
    'bravely fights',
    'gently sings',
    'barely moves',
    'never sleeps',
    'always listens',
    'softly glows',
  ],
  COMPLEMENTS: [
    'over mountains',
    'through the forest',
    'near the river',
    'past the moon',
    'beneath the stars',
    'inside the cave',
    'beyond the clouds',
    'along the path',
    'across the plains',
    'under the bridge',
  ],
});

const createLayoutConfig = () => {
  const COLS = 4;
  const APP_W = 1920;
  const APP_H = 1080;
  const FONT_SIZE = 26;
  const LINE_H = 36;
  const ROWS = Math.floor(APP_H / LINE_H);

  return {
    COLS,
    APP_W,
    APP_H,
    COL_W: APP_W / COLS,
    FONT_SIZE,
    LINE_H,
    ROWS,
    TOTAL: COLS * ROWS,
    CYCLE_INTERVAL_MS: 800,
  };
};

const { SUBJECTS, VERBS, COMPLEMENTS } = createSentenceCorpus();
const {
  COLS,
  APP_W,
  APP_H,
  COL_W,
  FONT_SIZE,
  LINE_H,
  ROWS,
  TOTAL,
  CYCLE_INTERVAL_MS,
} = createLayoutConfig();

/** @returns {string} */
const randomSentence = () => {
  const si = (Math.random() * SUBJECTS.length) | 0;
  const vi = (Math.random() * VERBS.length) | 0;
  const ci = (Math.random() * COMPLEMENTS.length) | 0;
  return `${SUBJECTS[si]} ${VERBS[vi]} ${COMPLEMENTS[ci]}`;
};

export default async function test({ renderer, testRoot }: ExampleSettings) {
  const bg = renderer.createNode({
    x: 0,
    y: 0,
    w: APP_W,
    h: APP_H,
    color: 0x111111ff,
    parent: testRoot,
  });

  // Reusable position descriptors — computed once, never re-allocated
  const positions: { x: number; y: number }[] = new Array(TOTAL);
  for (let i = 0; i < TOTAL; i++) {
    const col = (i / ROWS) | 0;
    const row = i % ROWS;
    positions[i] = { x: col * COL_W + 8, y: row * LINE_H };
  }

  /** Live text nodes, replaced on every cycle */
  let nodes: ITextNode[] = new Array(TOTAL);

  /** @param {INode} parent */
  const spawnAll = (parent: INode) => {
    for (let i = 0; i < TOTAL; i++) {
      const pos = positions[i]!;
      nodes[i] = renderer.createTextNode({
        x: pos.x,
        y: pos.y,
        w: COL_W - 16,
        text: randomSentence(),
        fontFamily: 'Ubuntu',
        fontSize: FONT_SIZE,
        color: 0xeeeeeeff,
        contain: 'width',
        parent,
      });
    }
  };

  const destroyAll = () => {
    for (let i = 0; i < TOTAL; i++) {
      nodes[i]!.destroy();
    }
  };

  const cycle = () => {
    destroyAll();
    spawnAll(bg);
  };

  // Initial population
  spawnAll(bg);

  let autoTimer: ReturnType<typeof setInterval> | null = null;

  const startAuto = () => {
    if (autoTimer !== null) return;
    autoTimer = setInterval(cycle, CYCLE_INTERVAL_MS);
  };

  const stopAuto = () => {
    if (autoTimer === null) return;
    clearInterval(autoTimer);
    autoTimer = null;
  };

  startAuto();

  window.addEventListener('keydown', (e) => {
    const key = e.key;
    if (key === 'Enter') {
      if (autoTimer !== null) {
        stopAuto();
      } else {
        startAuto();
      }
      return;
    }
    if (key === ' ') {
      e.preventDefault();
      cycle();
    }
  });
}
