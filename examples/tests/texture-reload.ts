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

import rockoPng from '../assets/rocko.png';

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
  const memoryThreshold = 130 * 1024 * 1024; // 130 MB
  const textureSize = nodeSize * nodeSize * 3; // RGBA bytes per pixel
  const maxNodes = Math.ceil(memoryThreshold / textureSize);
  const nodes: INode[] = [];

  const header = renderer.createTextNode({
    fontFamily: 'Ubuntu',
    text: `Texture Reload Test`,
    fontSize: 45,
    parent: testRoot,
    x: 500,
    y: 50,
  });

  const finalStatus = renderer.createTextNode({
    fontFamily: 'Ubuntu',
    text: `Running...`,
    fontSize: 30,
    parent: testRoot,
    color: 0xffff00ff,
    x: 500,
    y: 100,
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

  const testNode = async function (testNode: INode) {
    let textureFreed = false;
    let textureLoaded = false;
    let timedOut = false;
    let timeOutTimer: NodeJS.Timeout | null = null;

    function resetTimeout() {
      if (timeOutTimer) {
        clearTimeout(timeOutTimer);
      }

      timeOutTimer = setTimeout(() => {
        timedOut = true;
      }, 10000);
    }

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
    while (!textureLoaded && !timedOut) {
      await delay(100);
    }

    if (timedOut) {
      console.error('Texture failed to load within 10 seconds.');
      return false;
    }

    resetTimeout();

    // Move the node offscreen
    console.log('Moving node offscreen...');
    // Move the node out of bounds
    queueMicrotask(() => {
      testNode.x = -screenWidth * 2;
      testNode.y = -screenHeight * 2;
    });

    // Wait for the texture to be freed
    console.log('Waiting for texture to be freed...');
    while (!textureFreed && !timedOut) {
      renderer.rerender();
      await delay(100);
    }

    if (timedOut) {
      console.error('Texture failed to free within 10 seconds.');
      return false;
    }

    resetTimeout();

    // Move the node back into bounds
    console.log('Moving node back into view...');
    testNode.x = 0;
    testNode.y = 0;

    // Wait for the texture to be reloaded
    console.log('Waiting for texture to be reloaded...');
    while (!textureLoaded && !timedOut) {
      await delay(100);
    }

    if (timedOut) {
      console.error('Texture failed to reload within 10 seconds.');
      return false;
    }

    if (timeOutTimer) {
      clearTimeout(timeOutTimer);
    }

    if (textureLoaded) {
      return true;
    } else {
      return false;
    }
  };

  const image = renderer.createTexture('ImageTexture', {
    src: rockoPng,
  });

  const nodeSpawnX = 1100;
  const nodeSpawnY = 30;

  const testCases: Record<string, () => INode> = {
    'Noise Texture': () =>
      renderer.createNode({
        texture: renderer.createTexture('NoiseTexture', {
          width: nodeSize,
          height: nodeSize,
          cacheId: Math.random(),
        }),
        x: nodeSpawnX,
        y: nodeSpawnY,
        width: nodeSize,
        height: nodeSize,
        parent: testRoot,
      }),
    'Image Texture': () =>
      renderer.createNode({
        x: nodeSpawnX,
        y: nodeSpawnY,
        width: nodeSize,
        height: nodeSize,
        src: rockoPng,
        parent: testRoot,
      }),
    // No need to test color textures, they all sample from the same 1x1 pixel texture
    // and are not subject to the same memory constraints as other textures
    // "Color Texture": () => renderer.createNode({
    //   color: 0xff00ff, // Magenta
    //   x: nodeSpawnX,
    //   y: nodeSpawnY,
    //   width: nodeSize,
    //   height: nodeSize,
    //   parent: testRoot,
    // }),
    SubTexture: () =>
      renderer.createNode({
        texture: renderer.createTexture('SubTexture', {
          texture: image,
          x: 30,
          y: 0,
          width: 50,
          height: 50,
        }),
        x: nodeSpawnX,
        y: nodeSpawnY,
        width: nodeSize,
        height: nodeSize,
        parent: testRoot,
      }),
    'RTT Node': () => {
      const rtt = renderer.createNode({
        rtt: true,
        x: nodeSpawnX,
        y: nodeSpawnY,
        width: nodeSize,
        height: nodeSize,
        parent: testRoot,
      });

      const child = renderer.createNode({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        color: 0xff0000ff,
        parent: rtt,
      });

      const child2 = renderer.createNode({
        x: 0,
        y: 20,
        width: 100,
        height: 100,
        src: rockoPng,
        parent: rtt,
      });

      return rtt;
    },
  };

  // Run all tests
  let allTestsPassed = true;
  let lastStatusOffSet = 30;
  let testIdx = 1;

  for (const [name, createNode] of Object.entries(testCases)) {
    console.log(`${testIdx}. Running test for: ${name}`);
    finalStatus.text = `${testIdx}. Running test for: ${name}`;

    const testNodeInstance = createNode(); // Create the test node dynamically

    const result = await testNode(testNodeInstance);

    if (!result) {
      console.error(`${testIdx}. Test failed for: ${name}`);
      finalStatus.text = `Test failed for: ${name}`;
      finalStatus.color = 0xff0000ff;
      allTestsPassed = false;
    }

    console.log(`${testIdx}. Test passed for: ${name}`);

    testNodeInstance.x = 500;
    testNodeInstance.y = lastStatusOffSet + 128;
    testNodeInstance.width = 128;
    testNodeInstance.height = 128;

    const status = result ? 'passed' : 'failed';

    renderer.createTextNode({
      fontFamily: 'Ubuntu',
      text: `${testIdx}. Test ${status} for: ${name}`,
      fontSize: 30,
      parent: testRoot,
      color: result ? 0x00ff00ff : 0xff0000ff,
      x: 630,
      y: lastStatusOffSet + 128 + 128 / 2,
    });

    lastStatusOffSet += 130;
    testIdx++;
  }

  if (allTestsPassed) {
    console.log('All tests passed successfully!');
    finalStatus.text = `All tests passed successfully!`;
    finalStatus.color = 0x00ff00ff;
  } else {
    console.error('One or more tests failed.');
    finalStatus.text = `One or more tests failed.`;
    finalStatus.color = 0xff0000ff;
    throw new Error('Test suite failed.');
  }
}
