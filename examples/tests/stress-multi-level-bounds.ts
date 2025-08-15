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
import logo from '../assets/lightning.png';
import type { ExampleSettings } from '../common/ExampleSettings.js';

const randomIntBetween = (from: number, to: number) =>
  Math.floor(Math.random() * (to - from + 1) + from);

export default async function ({
  renderer,
  testRoot,
  perfMultiplier,
}: ExampleSettings) {
  // create nodes
  const numOuterNodes = 100 * perfMultiplier;
  const nodes: INode[] = [];
  let totalNodes = 0;

  const bg = renderer.createNode({
    w: 1920,
    h: 1080,
    color: 0xff1e293b,
    parent: testRoot,
  });

  for (let i = 0; i < numOuterNodes; i++) {
    const container = renderer.createNode({
      x: Math.random() * (1920 * 2), //going to render out of bounds as well
      y: Math.random() * (1080 * 2),
      parent: bg,
    });
    const node = renderer.createNode({
      w: 505,
      h: 101,
      src: logo,
      parent: container,
    });

    nodes.push(container);
    totalNodes += 2;
  }

  console.log(
    `Created ${numOuterNodes} outer nodes with another node nested inside. Total nodes: ${totalNodes}`,
  );

  // create 100 animations
  const animate = () => {
    nodes.forEach((node) => {
      node
        .animate(
          {
            x: randomIntBetween(20, 1740 * 2), //going to render out of bounds as well
            y: randomIntBetween(20, 900 * 2),
          },
          {
            duration: 3000,
            easing: 'ease-out',
            loop: false,
          },
        )
        .start();
    });
  };

  setInterval(animate, 3000);
}
