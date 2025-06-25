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
      criticalThreshold: 13e6,
      baselineMemoryAllocation: 5e6,
      doNotExceedCriticalThreshold: true,
      debugLogging: false,
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

  console.log(`Creating ${maxNodes} nodes...`);

  let testMode: 'normal' | 'rtt' = 'normal';

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

  const currentModeText = renderer.createTextNode({
    x: 10,
    y: 40,
    parent: testRoot,
    text: `Current mode: ${testMode}`,
    fontSize: 20,
    color: 0xffffffff,
  });

  const modeExplainText = renderer.createTextNode({
    x: 10,
    y: 10,
    parent: testRoot,
    text: 'Press SPACE to switch mode',
    fontSize: 20,
    color: 0xffffffff,
  });

  const nodeWidth = 200;
  const nodeHeight = 200;
  const gap = 10; // Define the gap between items

  const spawnRow = function (rowIndex = 0, amount = 20) {
    let totalWidth = 0; // Track the total width used in the current row
    const y = rowIndex * (nodeHeight + gap);

    const rowNode = renderer.createNode({
      x: 0,
      y: y,
      width: containerNode.width,
      height: nodeHeight,
      parent: containerNode,
      color: 0x000000ff,
      clipping: true,
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
        rtt: testMode === 'rtt',
      });

      const imageNode = renderer.createNode({
        x: 0,
        y: 0,
        width: nodeWidth,
        height: nodeHeight,
        parent: childNode,
        src: `https://picsum.photos/id/${id}/${nodeWidth}/${nodeHeight}`, // Random images
      });

      imageNode.on('failed', () => {
        console.log(`Image failed to load for node ${id}`);
        childNode.color = 0xffff00ff; // Change color to yellow on error
      });

      const textNode = renderer.createTextNode({
        x: 0,
        y: 0,
        autosize: true,
        parent: childNode,
        text: `Card ${id}`,
        fontFamily: 'Ubuntu',
        fontSize: 20,
        color: 0xffffffff,
      });

      // items.push(childNode);
    }

    return rowNode;
  };

  const destroyAll = () => {
    // Destroy all nodes
    while (nodes.length > 0) {
      const node = nodes.pop();
      if (node) {
        node.destroy();
      }
    }
  };

  const runRoutine = (count = 150) => {
    count--;

    if (count < 0) {
      return;
    }

    // Destroy all nodes
    destroyAll();

    setTimeout(async () => {
      await spawnRows(20);

      setTimeout(() => {
        runRoutine(count);
      }, 300);
    }, 300);
  };

  const nodes: INode[] = [];
  const spawnRows = async (amountOfRows: number) => {
    for (let rowIndex = 0; rowIndex < amountOfRows; rowIndex++) {
      console.log(`Spawning row ${rowIndex + 1}`);
      nodes.push(spawnRow(rowIndex, 20));
    }

    // adjust container node size
    containerNode.height = amountOfRows * (nodeHeight + gap);
  };

  await spawnRows(20);

  window.addEventListener('keydown', async (e) => {
    if (e.key === 'ArrowDown') {
      if (containerNode.y > clippingNode.height + 200) {
        return;
      }

      containerNode.y += 50;
    }

    if (e.key === 'ArrowUp') {
      if (containerNode.y < containerNode.height * -1 - 200) {
        return;
      }

      // move container up
      containerNode.y -= 50;
    }

    if (e.key === 'c') {
      spawnRows(20);
    }

    if (e.key === 'd') {
      // destroy all nodes
      destroyAll();
    }

    if (e.key === 'r') {
      runRoutine(150);
    }

    // space switches mode
    if (e.key === ' ' || e.key === 'Enter') {
      testMode = testMode === 'normal' ? 'rtt' : 'normal';

      currentModeText.text = `Current mode: ${testMode}`;

      nodes.forEach((row) => {
        row.destroy();
      });

      spawnRows(20);
    }
  });
}
