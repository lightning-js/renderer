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

import { type CoreNode } from '@lightningjs/renderer';
import type { ExampleSettings } from '../common/ExampleSettings.js';

const randomIntBetween = (from: number, to: number) =>
  Math.floor(Math.random() * (to - from + 1) + from);

export default async function ({
  renderer,
  testRoot,
  perfMultiplier,
}: ExampleSettings) {
  // create 100 nodes
  const numOuterNodes = 100 * perfMultiplier;
  const nodes: CoreNode[] = [];

  const startMin = -1000;
  const startMax = 3000;
  const endMin = -1000;
  const endMax = 3000;

  const bg = renderer.createNode({
    width: 1920,
    height: 1080,
    color: 0xff1e293b,
    parent: testRoot,
  });

  for (let i = 0; i < numOuterNodes; i++) {
    const node = renderer.createTextNode({
      x: randomIntBetween(startMin, startMax),
      y: randomIntBetween(startMin, startMax),
      fontFamily: 'Ubuntu',
      textRendererOverride: 'sdf',
      text: 'Lightning 3.0',
      // contain: 'both',
      // width: 237,
      // height: 45,
      color: 0xffffffff,
      fontSize: 40,
      parent: bg,
    });

    nodes.push(node);
  }

  console.log(`Created ${numOuterNodes} nodes with the same text`);

  // create 100 animations
  const animate = () => {
    nodes.forEach((node) => {
      node
        .animate(
          {
            x: randomIntBetween(endMin, endMax),
            y: randomIntBetween(endMin, endMax),
          },
          {
            duration: 3000,
            loop: true,
          },
        )
        .start();
    });
  };

  animate();
}
