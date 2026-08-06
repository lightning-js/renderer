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

import { type INode } from '@lightningjs/renderer';
import robotImg from '../assets/robot/robot.png';
import type { ExampleSettings } from '../common/ExampleSettings.js';

/**
 * Visual regression coverage for the dirty quad buffer (C2) optimization in
 * the WebGL renderer.
 *
 * The scene is small on purpose: with at most a handful of dirty nodes per
 * frame the renderer takes the surgical `bufferSubData` path (instead of a
 * full buffer upload), which is the branch most at risk of stale or misplaced
 * quads. Snapshots are taken after each single-node mutation, after a
 * structural add/remove (which triggers the render-list invalidation and a
 * full re-upload), and after an RTT child mutation (dedicated RTT buffer).
 *
 * Use the 'right arrow' key to step through the same states interactively.
 */
export async function automation(settings: ExampleSettings) {
  const next = (await test(settings)) as unknown as {
    (): void;
    robot?: INode;
  };
  // The robot asset must be uploaded before the initial snapshot so the
  // certified images are deterministic instead of racing the texture load.
  const robot = next.robot;
  if (robot !== undefined) {
    await new Promise<void>((resolve, reject) => {
      if (robot.texture && robot.texture.state === 'loaded') {
        resolve();
        return;
      }
      const timer = setTimeout(
        () => reject(new Error('robot texture load timeout')),
        5000,
      );
      robot.once('loaded', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
  await settings.snapshot({ name: 'initial' });
  next();
  await settings.snapshot({ name: 'move' });
  next();
  await settings.snapshot({ name: 'color' });
  next();
  await settings.snapshot({ name: 'alpha' });
  next();
  await settings.snapshot({ name: 'rtt-child-move' });
  next();
  await settings.snapshot({ name: 'add' });
  next();
  await settings.snapshot({ name: 'remove' });
}

export default async function test({ renderer, testRoot }: ExampleSettings) {
  // Set a smaller snapshot area
  testRoot.w = 480;
  testRoot.h = 270;
  testRoot.color = 0xffffffff;

  const B_ORIGINAL = {
    x: 130,
  };
  const C_ORIGINAL = {
    alpha: 1,
  };
  const RTT_CHILD2_ORIGINAL = {
    x: 100,
  };

  // Main scene quads
  const a = renderer.createNode({
    x: 30,
    y: 30,
    w: 80,
    h: 80,
    // color: 0xff0000ff, // (optional red tint) removed so the robot shows its
    // texture colors; the 'color' step below proves the tint mutation instead
    src: robotImg,
    parent: testRoot,
  });

  let b: INode = renderer.createNode({
    x: B_ORIGINAL.x,
    y: 30,
    w: 80,
    h: 80,
    color: 0x00ff00ff,
    parent: testRoot,
  });
  let bAlive = true;
  const makeB = () => {
    b = renderer.createNode({
      x: B_ORIGINAL.x,
      y: 30,
      w: 80,
      h: 80,
      color: 0x00ff00ff,
      parent: testRoot,
    });
    bAlive = true;
  };

  const c = renderer.createNode({
    x: 230,
    y: 30,
    w: 80,
    h: 80,
    color: 0x0000ffff,
    alpha: C_ORIGINAL.alpha,
    parent: testRoot,
  });

  // Render-to-texture scene
  const rttNode = renderer.createNode({
    x: 30,
    y: 140,
    w: 200,
    h: 90,
    rtt: true,
    parent: testRoot,
  });

  const rttChild1 = renderer.createNode({
    x: 0,
    y: 0,
    w: 100,
    h: 90,
    color: 0xffff00ff,
    parent: rttNode,
  });

  const rttChild2 = renderer.createNode({
    x: RTT_CHILD2_ORIGINAL.x,
    y: 0,
    w: 100,
    h: 90,
    color: 0xff00ffff,
    parent: rttNode,
  });

  // Display the RTT texture on screen
  renderer.createNode({
    x: 30,
    y: 140,
    w: 200,
    h: 90,
    texture: rttNode.texture,
    parent: testRoot,
  });

  let d: INode | null = null;
  const makeD = () => {
    d = renderer.createNode({
      x: 330,
      y: 30,
      w: 80,
      h: 80,
      color: 0xff8800ff,
      parent: testRoot,
    });
  };

  let step = 0;
  const MAX_STEP = 6;

  const reset = () => {
    if (bAlive === false) {
      makeB();
    }
    a.color = 0xffffffff;
    b.x = B_ORIGINAL.x;
    c.alpha = C_ORIGINAL.alpha;
    rttChild2.x = RTT_CHILD2_ORIGINAL.x;
    if (d !== null) {
      d.destroy();
      d = null;
    }
  };

  function next() {
    step++;
    if (step > MAX_STEP) {
      step = 0;
      reset();
      return;
    }
    if (step === 1) {
      // Single-node move -> surgical bufferSubData upload
      b.x = B_ORIGINAL.x + 40;
      console.log('step 1: b.x =', b.x);
    } else if (step === 2) {
      // Single-node color change -> surgical upload
      a.color = 0x0000ffff;
      console.log('step 2: a.color =', a.color);
    } else if (step === 3) {
      // Single-node alpha change -> surgical upload
      c.alpha = 0.3;
      console.log('step 3: c.alpha =', c.alpha);
    } else if (step === 4) {
      // RTT child mutation -> dedicated RTT buffer re-upload
      rttChild2.x = RTT_CHILD2_ORIGINAL.x + 40;
      console.log('step 4: rttChild2.x =', rttChild2.x);
    } else if (step === 5) {
      // Structural add -> render list invalidation + full re-upload
      makeD();
      console.log('step 5: d =', d);
    } else if (step === 6) {
      // Structural remove -> render list invalidation + full re-upload
      b.destroy();
      bAlive = false;
      console.log('step 6: b destroyed');
    }
  }

  window.addEventListener('keydown', (event) => {
    // When right arrow is pressed, call next
    if (event.key === 'ArrowRight') {
      next();
    }
  });

  const ret = next as unknown as { (): void; robot?: INode };
  ret.robot = a;

  return ret;
}
