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
 * Confetti 2 — continuous spawn stress test
 *
 * Unlike confetti.ts which recycles a fixed set of nodes, this test
 * continuously creates brand-new nodes, animates them, and destroys them
 * on completion. This stresses the full animation lifecycle:
 *
 *   - Node creation + destruction every cycle
 *   - Animation controller + animation init on every spawn
 *   - Pool warm-up and steady-state recycling under constant churn
 *   - No long-lived node state — every particle is ephemeral
 *
 * A new wave of WAVE_SIZE particles is fired every WAVE_INTERVAL_MS,
 * overlapping with the previous wave still in flight. Use ?multiplier=N
 * to scale the wave size.
 */

import type { ExampleSettings } from '../common/ExampleSettings.js';

const SHAPE_1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAEjSURBVHgBnZO9TgJBFIXvbEllQqsJNrTaSmVhqdHKViyplCewsTXhDcAnkBcwUkm52tqwJrYmVLTDOXAWJsPfhJN8e/fuzD2TmblrFsl7fw66YOSXyvWtZpuEwQPw5nfrKaxzZTFCDrjCBLyDIfjXvDo4Aw3lPefcfWjQRWiq4CUojEWjFqiANkw6jntG8qGVn7cUlzqVyRgcZ3jcaWCYUEx9gR/AbTczOVKflq5c8SQ0+LN0lXNrWfCxYnuIBoXeDy1d5dxvGrwqaVi6LhQHNOgpYaPUE4qvQBUU6IN+hkeBpK3Blow26RZc6n3ZiRQaqoPwoJT3zKviafNwj2Rc1fisC1fsYfIY/YWxRurchdwaE3bYDbi2ebexZX9BH6sO4vlTUbSnqsTgwTgAAAAASUVORK5CYII=';
const SHAPE_2 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAABOSURBVHgB7ZKhDQAgDAQfwiA4loEhUKzFZoxSqKtAtFUILmnST/7cByJaADJs9OiQmJxEGAqhnmv8RDj54lOiHEBV9MtNbDDAYod9r3MDaHkHotN0PbEAAAAASUVORK5CYII=';
const SHAPE_3 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAATCAYAAACQjC21AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAFcSURBVHgBrVQtTwNBEJ1tMKCa8AOoqj6LK6BJjl8AFleCwsE/AEGQdx5RgYXUYTnbmjsSJKQ1xW7f5N4m28u2d/14ybuZ2515O9PerEgNrLVtMAf7sgtA6MqWmMguwOocerINVMAuYijbAAIJhb7AGf22bAIkdrzK7sB3+ver8gwCYtgIPOJah3R+Br6AXfCW6wXp/G/66R4eCbiqjQ/aMdmtHOqj0Ap1Y+gFpExU/AWSDsB98BA8k7I7xZMxpt/Co8DLidfCORNCYop/7kWe2I2KqWNcFP89bT9m0iv4uaTCaylbn1IsdZst52BxCl7AfWDSpYRxSrFCO/PFFgQ9ZLRjCcOtawFZdTMk2KMd0eqPry0e8/2HNmr0ket48QN+Bt+8CVH88iMfNZptXlUOvlBSuSRmTaYmdBnkrgoe9mjXuSz0RAZOlp3OGc9dXJ1gDA44PXWxevEOqutzNZRW6qN+HjoAAAAASUVORK5CYII=';

const SHAPES = [SHAPE_1, SHAPE_2, SHAPE_3];
const COLORS = [0x3c91efff, 0x847effff, 0x00a75eff, 0xf1604bff, 0xc4defaff];

const Y_START = -40;
const Y_END = 1600;
// How many new particles to spawn per wave
const WAVE_SIZE = 50;
// How often to fire a new wave (ms) -- overlaps with previous wave in flight
const WAVE_INTERVAL_MS = 500;
// Duration range for each particle (ms)
const DURATION_MIN_MS = 2000;
const DURATION_MAX_MS = 4000;

export default async function ({
  renderer,
  testRoot,
  perfMultiplier,
}: ExampleSettings) {
  const waveSize = WAVE_SIZE * perfMultiplier;

  /**
   * Spawn a single ephemeral particle: create node, animate it falling,
   * then destroy both the node and the controller on completion.
   */
  function spawnParticle() {
    const size = 11 + Math.random() * 25;
    const startX = Math.random() * 1920;
    const endX = startX + (Math.random() - 0.5) * 80;
    const durationMs =
      DURATION_MIN_MS +
      Math.floor(Math.random() * (DURATION_MAX_MS - DURATION_MIN_MS));

    const node = renderer.createNode({
      x: startX,
      y: Y_START,
      w: size,
      h: size,
      rotation: Math.random() * Math.PI * 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      src: SHAPES[Math.floor(Math.random() * SHAPES.length)]!,
      parent: testRoot,
    });

    // Animate Y -- linear fall
    const animateY = node.animate(
      { y: Y_END },
      { duration: durationMs, easing: 'linear' },
    );

    // Animate X -- cubic-bezier drift
    const animateX = node.animate(
      { x: endX },
      { duration: durationMs, easing: 'cubic-bezier(0,0,0.4,1)' },
    );

    // Animate rotation
    const animateRot = node.animate(
      { rotation: Math.random() * Math.PI * 4 },
      { duration: durationMs, easing: 'ease-out' },
    );

    animateY.start();
    animateX.start();
    animateRot.start();

    // When Y finishes: stop siblings and destroy node -- tests the full
    // create-animate-destroy path continuously with no node reuse
    animateY.on('stopped', () => {
      animateX.stop();
      animateRot.stop();
      node.parent = null;
      node.destroy();
    });
  }

  /**
   * Fire a wave of particles, staggered by 1 frame each to avoid
   * creating all nodes in the same frame.
   */
  function fireWave() {
    for (let i = 0; i < waveSize; i++) {
      setTimeout(spawnParticle, i * (WAVE_INTERVAL_MS / waveSize));
    }
  }

  // Fire the first wave immediately, then repeat on interval
  fireWave();
  setInterval(fireWave, WAVE_INTERVAL_MS);
}
