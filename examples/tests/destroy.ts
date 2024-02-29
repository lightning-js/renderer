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

export async function automation(settings: ExampleSettings) {
  const destroy = await test(settings);
  await settings.snapshot();
  destroy(100);
  await settings.snapshot();
}

export default async function test({
  renderer,
  testRoot,
  automation,
  perfMultiplier,
}: ExampleSettings) {
  // create 100 nodes
  const numOuterNodes = (100 * Math.max(perfMultiplier, 1)) / 2;
  const nodes: INode[] = [];

  const bg = renderer.createNode({
    width: 1920,
    height: 1080,
    color: 0xff1e293b,
    parent: testRoot,
  });

  const gridSize = Math.ceil(Math.sqrt(numOuterNodes));
  for (let i = 0; i < numOuterNodes; i++) {
    const baseX = (i % gridSize) * 150;
    const baseY = Math.floor(i / gridSize) * 60;

    const node = renderer.createNode({
      width: 125,
      height: 25,
      x: baseX,
      y: baseY,
      src: logo,
      parent: bg,
    });

    nodes.push(node);

    const textNode = renderer.createTextNode({
      width: 125,
      height: 25,
      x: baseX,
      y: baseY + 25,
      text: 'Lightning 3',
      color: 0xffffffff,
      parent: bg,
    });

    nodes.push(textNode);
  }

  console.log(
    `Created ${numOuterNodes} texture nodes and ${numOuterNodes} text nodes`,
  );

  const destroy = (amount = 10) => {
    const nodesToDestroy = nodes.splice(0, amount);
    nodesToDestroy.forEach((node) => {
      node.destroy();
    });

    console.log(`Destroyed ${amount} nodes, ${nodes.length} remaining`);

    if (nodes.length > 0) {
      setTimeout(destroy, 100);
    } else {
      console.log('All nodes destroyed');
    }
  };

  if (!automation) {
    setTimeout(destroy, 100);
  }

  return destroy;
}
