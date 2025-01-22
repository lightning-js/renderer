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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function ({ renderer, testRoot }: ExampleSettings) {
  const screenWidth = renderer.settings.appWidth;
  const screenHeight = renderer.settings.appHeight;
  const nodeSize = 128; // Each node will be 128x128 pixels
  const memoryThreshold = 125 * 1024 * 1024; // 50 MB
  const textureSize = nodeSize * nodeSize * 3; // RGBA bytes per pixel
  const maxNodes = Math.ceil(memoryThreshold / textureSize);
  const nodes: INode[] = [];

  const header = renderer.createTextNode({
    fontFamily: 'Ubuntu',
    text: `Texture Reload Test`,
    fontSize: 45,
    parent: testRoot,
    x: 900,
    y: 50,
  });

  const status = renderer.createTextNode({
    fontFamily: 'Ubuntu',
    text: `Creating nodes...`,
    fontSize: 30,
    parent: testRoot,
    color: 0xffff00ff,
    x: 900,
    y: 150,
  });

  // Create nodes with unique noise textures until the memory threshold is reached
  for (let i = 0; i < maxNodes; i++) {
    const x = (i % 27) * 10;
    const y = ~~(i / 27) * 10;

    const node = renderer.createNode({
      x,
      y,
      width: nodeSize,
      height: nodeSize,
      parent: testRoot,
      color: randomColor(),
      texture: renderer.createTexture('NoiseTexture', {
        width: nodeSize,
        height: nodeSize,
        cacheId: i,
      }),
    });
    nodes.push(node);
  }

  console.log(`Created ${nodes.length} nodes. Memory threshold reached.`);
  status.text = `Created ${nodes.length} nodes. Memory threshold reached.`;

  // Choose a node to move offscreen
  function getNode() {
    const testNode = nodes[0];
    if (!testNode) {
      throw new Error('Test failed: No node found to move offscreen.');
    }
    return testNode;
  }

  let textureFreed = false;
  let textureLoaded = false;

  const testNode = getNode();
  testNode.on('freed', () => {
    console.log('Texture freed event received.');
    textureFreed = true;
    textureLoaded = false;
  });

  testNode.on('loaded', () => {
    console.log('Texture loaded event received.');
    textureLoaded = true;
    textureFreed = false;
  });

  // Wait for the texture to be freed
  console.log('Waiting for texture to be loaded...');
  status.text = `Waiting for texture to be loaded...`;
  while (!textureLoaded) {
    await delay(100);
  }

  // Move the node offscreen
  console.log('Moving node offscreen...');
  status.text = `Moving node offscreen...`;
  // Move the node out of bounds
  testNode.x = -screenWidth * 2;
  testNode.y = -screenHeight * 2;

  // Wait for the texture to be freed
  console.log('Waiting for texture to be freed...');
  status.text = `Waiting for texture to be freed...`;
  while (!textureFreed) {
    await delay(100);
  }

  // Move the node back into bounds
  console.log('Moving node back into view...');
  status.text = `Moving node back into view...`;
  testNode.x = 0;
  testNode.y = 0;

  // Wait for the texture to be reloaded
  console.log('Waiting for texture to be reloaded...');
  status.text = `Waiting for texture to be reloaded...`;
  while (!textureLoaded) {
    await delay(100);
  }

  if (textureLoaded) {
    console.log('Test passed: Texture was freed and reloaded successfully.');
    status.text = `Test passed: Texture was freed and reloaded successfully.`;
    status.color = 0x00ff00ff;

    // make texture really big in the center of the screen to display it to the user
    testNode.x = screenWidth / 2 - nodeSize / 2;
    testNode.y = screenHeight / 2 - nodeSize / 2;
    testNode.width = nodeSize * 4;
    testNode.height = nodeSize * 4;
  } else {
    console.error('Test failed: Texture was not freed or reloaded correctly.');
    status.text = `Test failed: Texture was not freed or reloaded correctly.`;
    status.color = 0xff0000ff;
    throw new Error(
      'Test failed: Texture was not freed or reloaded correctly.',
    );
  }
}
