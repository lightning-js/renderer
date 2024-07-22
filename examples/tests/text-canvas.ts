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

import type { ExampleSettings } from '../common/ExampleSettings.js';

const Colors = {
  Black: 0x000000ff,
  Red: 0xff0000ff,
  Green: 0x00ff00ff,
  Blue: 0x0000ffff,
  Magenta: 0xff00ffff,
  Gray: 0x7f7f7fff,
  White: 0xffffffff,
};

const randomIntBetween = (from: number, to: number) =>
  Math.floor(Math.random() * (to - from + 1) + from);

/**
 * Tests that Single-Channel Signed Distance Field (SSDF) fonts are rendered
 * correctly.
 *
 * Text that is thinner than the certified snapshot may indicate that the
 * SSDF font atlas texture was premultiplied before being uploaded to the GPU.
 *
 * @param settings
 * @returns
 */
export default async function test(settings: ExampleSettings) {
  const { renderer, testRoot } = settings;

  // Set a smaller snapshot area
  // testRoot.width = 200;
  // testRoot.height = 200;
  // testRoot.color = 0xffffffff;

  const nodes: any[] = [];

  const renderNode = (t: string) => {
    const node = renderer.createTextNode({
      x: Math.random() * 1900,
      y: Math.random() * 1080,
      text: 'CANVAS ' + t,
      fontFamily: 'sans-serif',
      parent: testRoot,
      fontSize: 80,
    });

    nodes.push(node);

    // pick random color from Colors
    node.color =
      Object.values(Colors)[
        randomIntBetween(0, Object.keys(Colors).length - 1)
      ] || 0xff0000ff;
  };

  const spawn = (amount = 100) => {
    for (let i = 0; i < amount; i++) {
      renderNode(i.toString());
    }
  };

  const despawn = (amount = 100) => {
    for (let i = 0; i < amount; i++) {
      const node = nodes.pop();
      node.destroy();
    }
  };

  const move = () => {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      node.x = randomIntBetween(0, 1600);
      node.y = randomIntBetween(0, 880);
    }
  };

  const newColor = () => {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      node.color =
        Object.values(Colors)[
          randomIntBetween(0, Object.keys(Colors).length - 1)
        ] || 0x000000ff;
    }
  };

  let animating = false;
  const animate = () => {
    animating = !animating;

    const animateNode = (node: any) => {
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
            },
          )
          .start();
      });
    };

    const animateRun = () => {
      if (animating) {
        for (let i = 0; i < nodes.length; i++) {
          animateNode(nodes[i]);
        }
        setTimeout(animateRun, 3050);
      }
    };

    animateRun();
  };

  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp') {
      spawn();
    } else if (event.key === 'ArrowDown') {
      despawn();
    } else if (event.key === 'ArrowLeft') {
      move();
    } else if (event.key === 'ArrowRight') {
      move();
    } else if (event.key === '1') {
      newColor();
    } else if (event.key === ' ') {
      animate();
    }
  });

  spawn();
}
