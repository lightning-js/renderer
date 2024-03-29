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
import robotImg from '../assets/robot/robot.png';

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
    width: 1920,
    height: 1080,
    color: 0xff1e293b,
    parent: testRoot,
  });

  for (let i = 0; i < numOuterNodes; i++) {
    const container = renderer.createNode({
      x: Math.random() * 1920,
      y: Math.random() * 1080,
      width: 100,
      height: 100,
      clipping: true,
      parent: bg,
    });
    const node = renderer.createNode({
      mount: 0.5,
      x: 50,
      y: 50,
      width: 200,
      height: 200,
      src: robotImg,
      parent: container,
    });

    nodes.push(container);
    totalNodes += 2;
  }

  console.log(
    `Created ${numOuterNodes} clipping outer nodes with an image node nested inside. Total nodes: ${totalNodes}`,
  );

  // create animations
  const animate = () => {
    nodes.forEach((node) => {
      node
        .animate(
          {
            x: randomIntBetween(20, 1740),
            y: randomIntBetween(20, 900),
          },
          {
            duration: 3000,
            easing: 'ease-out',
            loop: true,
            stopMethod: 'reverse',
          },
        )
        .start();
    });
  };

  animate();
}
