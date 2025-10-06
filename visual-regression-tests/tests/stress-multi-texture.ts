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
import robot from '../assets/robot/robot.png';

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

  const bg = renderer.createNode({
    w: 1920,
    h: 1080,
    color: 0xff1e293b,
    parent: testRoot,
  });

  for (let i = 0; i < numOuterNodes; i++) {
    const node = renderer.createNode({
      x: Math.random() * 1920,
      y: Math.random() * 1080,
      ...(i % 2 === 0
        ? {
            w: 505,
            h: 101,
            src: logo,
          }
        : {
            w: 140,
            h: 140,
            src: robot,
          }),
      parent: bg,
    });

    nodes.push(node);
  }

  console.log(`Created ${numOuterNodes} nodes with alternating textures`);

  // create animations
  const animate = () => {
    nodes.forEach((node) => {
      node
        .animate(
          {
            x: randomIntBetween(20, 1740),
            y: randomIntBetween(20, 900),
            rotation: Math.random() * Math.PI,
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

  // setInterval(animate, 3000);
}
