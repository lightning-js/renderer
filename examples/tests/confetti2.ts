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
 * Confetti 2 — continuous animation spawn stress test
 *
 * Unlike confetti.ts which recycles a fixed pool of nodes with the same
 * animations, this test keeps nodes alive but continuously creates fresh
 * animations on them. Each cycle: stop existing animations, spawn 3 new
 * ones on the same node, repeat when done.
 *
 * This isolates the animation spawn/recycle cost specifically:
 * - No node create/destroy overhead
 * - Constant createAnimation() churn even with a warm pool
 * - 3 concurrent animations per node (Y/X/rotation)
 * - Each animation cycle is independent: fresh props, fresh controllers
 *
 * Use ?multiplier=N to scale the number of nodes (50 * N).
 */

import type { IAnimationController } from '../../dist/exports/index.js';
import type { INode } from '../../dist/src/main-api/INode.js';
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
const NODES = 50;
const DURATION_MIN_MS = 2000;
const DURATION_MAX_MS = 4000;

type Particle = {
  node: INode;
  animateY: IAnimationController | null;
  animateX: IAnimationController | null;
  animateRot: IAnimationController | null;
  launch(): void;
};

export default async function ({
  renderer,
  testRoot,
  perfMultiplier,
}: ExampleSettings) {
  const nodeCount = NODES * perfMultiplier;

  /**
   * Create a persistent node and continuously re-spawn fresh animations on it.
   * The node itself never changes parent or gets destroyed -- only the
   * animations are created fresh each cycle, stressing createAnimation().
   */
  function createParticle(): Particle {
    const size = 11 + Math.random() * 25;

    const node = renderer.createNode({
      x: Math.random() * 1920,
      y: Y_START,
      w: size,
      h: size,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      src: SHAPES[Math.floor(Math.random() * SHAPES.length)]!,
      parent: testRoot,
    });

    const particle: Particle = {
      node,
      animateY: null,
      animateX: null,
      animateRot: null,

      launch() {
        const n = this.node;
        const durationMs =
          DURATION_MIN_MS +
          Math.floor(Math.random() * (DURATION_MAX_MS - DURATION_MIN_MS));

        const startX = Math.random() * 1920;
        const endX = startX + (Math.random() - 0.5) * 80;
        const startRot = Math.random() * Math.PI * 2;

        // Reset node to start position for new cycle
        n.x = startX;
        n.y = Y_START;
        n.rotation = startRot;
        n.color = COLORS[Math.floor(Math.random() * COLORS.length)]!;
        n.src = SHAPES[Math.floor(Math.random() * SHAPES.length)]!;

        // Create 3 brand-new animation controllers each cycle --
        // this is the key difference from confetti.ts which reuses
        // the same controllers indefinitely via the relaunch pattern.
        this.animateY = n.animate(
          { y: Y_END },
          { duration: durationMs, easing: 'linear' },
        );
        this.animateX = n.animate(
          { x: endX },
          { duration: durationMs, easing: 'cubic-bezier(0,0,0.4,1)' },
        );
        this.animateRot = n.animate(
          { rotation: startRot + Math.random() * Math.PI * 4 },
          { duration: durationMs, easing: 'ease-out' },
        );

        this.animateY.start();
        this.animateX.start();
        this.animateRot.start();

        // When Y finishes, stop the siblings and immediately re-launch --
        // keeps the node fully animated at all times with fresh controllers
        this.animateY.on('stopped', () => {
          this.animateX!.stop();
          this.animateRot!.stop();
          this.launch();
        });
      },
    };

    return particle;
  }

  // Create all nodes upfront with a small stagger to spread the initial
  // wave of animation starts across frames
  for (let i = 0; i < nodeCount; i++) {
    const particle = createParticle();
    setTimeout(() => particle.launch(), i * 10);
  }
}
