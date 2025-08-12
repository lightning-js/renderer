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

import type { ExampleSettings } from '../common/ExampleSettings.js';

export default async function ({ renderer, testRoot }: ExampleSettings) {
  const rand = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  new Array(16).fill(0).forEach((el, idx) => {
    const pivot = Math.random();

    const node = renderer.createNode({
      x: (idx % 5) * 250 + 100,
      y: Math.floor(idx / 5) * 250 + 100,
      w: rand(50, 120),
      h: rand(50, 120),
      color: 0x0000ffaa,
      parent: testRoot,
    });

    const R1 = renderer.createNode({
      x: 10,
      y: 10,
      w: 20,
      h: 20,
      color: 0xffffffff,
      parent: node,
      scale: 1,
    });

    const R3 = renderer.createNode({
      x: 40,
      y: 40,
      w: 10,
      h: 10,
      color: 0xffffffff,
      parent: node,
      scale: 1,
      rotation: 0.5,
    });

    setTimeout(() => {
      // node.rotation = 0.9;
      node
        .animate(
          {
            rotation: Math.PI * 2,
            x: rand(-500, 1700),
            y: rand(-500, 900),
            scale: 2,
          },
          {
            duration: 4000,
            loop: true,
            easing: 'cubic-bezier(0.5, 0.5, 0.5, 0.5)',
          },
        )
        .start();
    }, 1400);
  });
}
