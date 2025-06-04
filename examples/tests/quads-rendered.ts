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
  destroy(120);
  await settings.snapshot();
}

export default async function test({
  renderer,
  testRoot,
  automation,
}: ExampleSettings) {
  // create 100 nodes
  const numOuterNodes = 190;
  const nodes: INode[] = [];

  const bg = renderer.createNode({
    y: 80,
    width: 1920,
    height: 1000,
    color: 0xff1e293b,
    parent: testRoot,
  });

  const quadsNode = renderer.createTextNode({
    fontFamily: 'Ubuntu',
    fontSize: 40,
    x: 20,
    y: 20,
    parent: testRoot,
    text: 'Number of Quads Rendered: ',
  });

  renderer.on('quadsUpdate', (target, payload) => {
    quadsNode.text = `Number of Quads Rendered: ${payload.quads}`;
  });

  const create = async (nodes: INode[] = [], delay = 0) => {
    const gridSize = Math.floor(Math.sqrt(numOuterNodes));

    for (let i = 0; i < numOuterNodes; i++) {
      const baseX = (i % gridSize) * 150;
      const baseY = Math.floor(i / gridSize) * 60;

      if (automation === false)
        await new Promise((resolve) => setTimeout(resolve, delay));
      const node = renderer.createNode({
        width: 125,
        height: 25,
        x: baseX,
        y: baseY,
        color: 0xff0000ff,
        src: logo,
        shader: renderer.createShader('Rounded', {
          radius: 50,
        }),
        parent: bg,
      });

      nodes.push(node);

      const textNode = renderer.createTextNode({
        width: 125,
        height: 25,
        rtt: false,
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
  };

  const destroy = (amount = 1) => {
    const nodesToDestroy = nodes.splice(0, amount);
    nodesToDestroy.forEach((node) => {
      node.destroy();
    });

    if (nodes.length > 0 && automation === false) {
      setTimeout(destroy, 10);
    } else if (nodes.length === 0 && automation === false) {
      console.log('All nodes destroyed');
      create(nodes, 10);
      setTimeout(destroy, 1000 + numOuterNodes * 2 * 10);
    }
  };

  if (automation === false) {
    await create(nodes, 10);
    setTimeout(destroy, 1000);
  } else {
    await create(nodes, 0);
  }

  return destroy;
}
