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

  let loadedSpritemaps: any = [];
  const loadSpritemap = async (id: number) => {
    const spritemap = renderer.createTexture('ImageTexture', {
      src: `https://picsum.photos/id/${id}/800/150`, // Random images,
      // src: `../assets/spritemap${id}.png`
    });

    console.log(`Loading spritemap spritemap${id}.png`);

    const loadedIdx = id;
    loadedSpritemaps.push(spritemap);
    console.log(`Loaded spritemap ${loadedIdx}`);

    spritemap.on('loaded', () => {
      console.log(`Spritemap ${loadedIdx} loaded`);
    });

    spritemap.on('freed', () => {
      console.log(`Spritemap ${loadedIdx} freed`);
    });
  };

  // load a bunch of spritemaps
  for (let i = 0; i < 100; i++) {
    await loadSpritemap(i);
  }

  console.log(`Loaded ${loadedSpritemaps.length} spritemaps`);

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
    width: 500 * (nodeSize + 10),
    height: 800,
    parent: clippingNode,
    color: 0x00000022,
    clipping: false,
  });

  const nodeWidth = 100;
  const nodeHeight = 150;
  const gap = 10; // Define the gap between items

  let subtextureX = 0;
  let subtextureY = 0;

  let currentTextureIndex = 0;

  const spawnRow = function (rowIndex = 0, amount = 20) {
    const items = [];

    let totalWidth = 0; // Track the total width used in the current row

    // y is fixed
    const y = 200;

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

      // spritemap is 150x800 with 100px evenly spaced characters
      subtextureX += 100;

      // if we reach the end of the spritemap, move to the next one
      if (subtextureX >= 800) {
        subtextureX = 0;
        currentTextureIndex++;

        if (currentTextureIndex >= loadedSpritemaps.length) {
          currentTextureIndex = 0;
        }
      }

      // pick color that belongs to current spritemap
      const color = COLORS[currentTextureIndex % COLORS.length];

      // Create the green node slightly smaller than the black rectangle
      const childNode = renderer.createNode({
        x: x, // Adjust position by subtracting the gap
        y: 0,
        width: nodeWidth, // Width of the green node
        height: nodeHeight, // Slightly smaller height
        parent: rowNode,
        color: color,
        texture: renderer.createTexture('SubTexture', {
          // @ts-ignore
          texture: loadedSpritemaps[currentTextureIndex],
          x: subtextureX,
          y: subtextureY,
          width: 100,
          height: 150,
        }),
      });

      items.push(childNode);
    }

    return items;
  };

  // Generate up to 200 rows
  const amountOfRows = 500;
  spawnRow(0, amountOfRows);

  // adjust container node size
  containerNode.width = amountOfRows * (nodeWidth + gap);
  console.log(`Container node width: ${containerNode.width}`);

  window.addEventListener('keydown', async (e) => {
    if (e.key === 'ArrowLeft') {
      // move container down
      containerNode.x += 200;
    }

    if (e.key === 'ArrowRight') {
      // move container up
      containerNode.x -= 200;
    }

    if (e.key === 'ArrowUp') {
      generateNoiseNodes(27);
    }

    if (e.key === 'ArrowDown') {
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
