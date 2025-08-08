/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2024 Comcast Cable Communications Management, LLC.
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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function ({ renderer, testRoot }: ExampleSettings) {
  renderer.createTextNode({
    x: 0,
    y: 0,
    text: 'Idle Texture Memory Cleanup Test',
    parent: testRoot,
    fontFamily: 'Ubuntu',
    fontSize: 60,
    zIndex: 1,
  });

  renderer.createTextNode({
    x: 0,
    y: 100,
    maxWidth: renderer.settings.appWidth,
    text: `This test will create and display a grid of random NoiseTexture nodes and move them off of the bounds margin every second.

The Texture Memory Manager should perform Idle Texture Cleanup roughly every 5 seconds.

See docs/ManualRegressionTests.md for more information.
    `,
    parent: testRoot,
    fontFamily: 'Ubuntu',
    fontSize: 40,
    zIndex: 1,
  });

  const screenWidth = renderer.settings.appWidth;
  const screenHeight = renderer.settings.appHeight;
  const gridWidth = 4;
  const gridHeight = 2;
  const nodeWidth = screenWidth / gridWidth;
  const nodeHeight = screenHeight / gridHeight;

  while (true) {
    const curNodes: INode[] = [];
    // Create a 4x2 grid of nodes
    for (let i = 0; i < gridWidth; i++) {
      for (let j = 0; j < gridHeight; j++) {
        const node = renderer.createNode({
          x: i * nodeWidth,
          y: j * nodeHeight,
          width: nodeWidth,
          height: nodeHeight,
          parent: testRoot,
          color: randomColor(),
          texture: renderer.createTexture('NoiseTexture', {
            width: nodeWidth,
            height: nodeHeight,
            cacheId: Math.floor(Math.random() * 100000),
          }),
          textureOptions: {
            preload: true,
          },
        });
        curNodes.push(node);
      }
    }
    await delay(1000);
    // Move all nodes offscreen beyond the bounds margin
    for (const node of curNodes) {
      node.x = -screenWidth * 2;
      node.y = -screenHeight * 2;
      node.on('freed', (thisNode: INode) => {
        thisNode.destroy();
      });
    }
  }
}
