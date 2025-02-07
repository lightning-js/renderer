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

import type { INode, RendererMainSettings } from '@lightningjs/renderer';
import type { ExampleSettings } from '../common/ExampleSettings.js';

export function customSettings(): Partial<RendererMainSettings> {
  return {
    textureMemory: {
      cleanupInterval: 5000,
      debugLogging: true,
    },
  };
}

const COLORS = [
  0xff0000ff, // Red
  0x00ff00ff, // Green
  0x0000ffff, // Blue
  0xffff00ff, // Yellow
  0xff00ffff, // Magenta
  0x00ffffff, // Cyan
  0xffffffff, // White
];

/**
 * Function that chooses a random color from the `COLORS` array
 */
function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export default async function test({ renderer, testRoot }: ExampleSettings) {
  const nodeSize = 128; // Each node will be 128x128 pixels
  const memoryThreshold = 130 * 1024 * 1024; // 130 MB
  const textureSize = nodeSize * nodeSize * 4 * 1.1; // RGBA bytes per pixel
  const memoryBaseline = 25e6; // 25 MB
  const maxNodes = Math.ceil((memoryThreshold - memoryBaseline) / textureSize);
  const nodes: INode[] = [];

  console.log(`Creating ${maxNodes} nodes...`);

  let lastNoiseNodePosition = 0;
  const generateNoiseNodes = (count: number) => {
    // Create nodes with unique noise textures until the memory threshold is reached
    for (let i = 0; i < count; i++) {
      const x = (i % 27) * 10;
      const y = ~~(i / 27) * 10;

      const node = renderer.createNode({
        x,
        y: lastNoiseNodePosition + y,
        width: nodeSize,
        height: nodeSize,
        parent: testRoot,
        color: randomColor(),
        texture: renderer.createTexture('NoiseTexture', {
          width: nodeSize,
          height: nodeSize,
          cacheId: i + Math.random(),
        }),
      });
      nodes.push(node);
    }

    lastNoiseNodePosition = nodes[nodes.length - 1]!.y + 10;
  };

  generateNoiseNodes(maxNodes);
  console.log(`Created ${nodes.length} nodes. Memory threshold reached.`);

  const clippingNode = renderer.createNode({
    x: 600,
    y: 200,
    width: 1300,
    height: 800,
    parent: testRoot,
    color: 0xff0000ff,
    clipping: true,
  });

  const containerNode = renderer.createNode({
    x: 0,
    y: 0,
    width: 1300,
    height: 800,
    parent: clippingNode,
    color: 0x000000ff,
    clipping: false,
  });

  const nodeWidth = 200;
  const nodeHeight = 200;
  const gap = 10; // Define the gap between items

  const spawnRow = function (rowIndex = 0, amount = 20) {
    const items = [];

    let totalWidth = 0; // Track the total width used in the current row
    const y = rowIndex * (nodeHeight + gap);

    const rowNode = renderer.createNode({
      x: 0,
      y: y,
      width: containerNode.width,
      height: nodeHeight,
      parent: containerNode,
      color: 0x000000ff,
    });

    for (let i = 0; i < amount; i++) {
      totalWidth += nodeWidth + gap; // Include gap in total width calculation

      const x = totalWidth - nodeWidth; // Adjust position by subtracting the node width
      const id = rowIndex * amount + i;

      // Create the green node slightly smaller than the black rectangle
      const childNode = renderer.createNode({
        x: x, // Adjust position by subtracting the gap
        y: 0,
        width: nodeWidth, // Width of the green node
        height: nodeHeight, // Slightly smaller height
        parent: rowNode,
        src: `https://picsum.photos/id/${id}/${nodeWidth}/${nodeHeight}`, // Random images
      });

      items.push(childNode);
    }

    return items;
  };

  // Generate up to 200 rows
  const amountOfRows = 20;
  for (let rowIndex = 0; rowIndex < amountOfRows; rowIndex++) {
    console.log(`Spawning row ${rowIndex + 1}`);
    spawnRow(rowIndex);
  }

  // adjust container node size
  containerNode.height = amountOfRows * (nodeHeight + gap);

  window.addEventListener('keydown', async (e) => {
    if (e.key === 'ArrowDown') {
      // move container down
      containerNode.y += 50;
    }

    if (e.key === 'ArrowUp') {
      // move container up
      containerNode.y -= 50;
    }

    if (e.key === 'ArrowLeft') {
      generateNoiseNodes(27);
    }

    if (e.key === 'ArrowRight') {
      for (let i = 0; i < 27; i++) {
        const node = nodes.pop();
        if (node) {
          node.destroy();
        }
      }

      lastNoiseNodePosition -= 10;
    }
  });
}
