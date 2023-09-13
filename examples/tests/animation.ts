/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2023 Comcast
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

export default async function ({ renderer, appDimensions }: ExampleSettings) {
  const randomColor = () => {
    const alpha = Math.floor(Math.random() * 256);
    const red = Math.floor(Math.random() * 256);
    const green = Math.floor(Math.random() * 256);
    const blue = Math.floor(Math.random() * 256);

    // Combine components into a single ARGB number
    return (alpha << 24) | (red << 16) | (green << 8) | blue;
  };

  const create = (idx: number) => {
    return renderer.createNode({
      x: -150,
      y: 50 * idx,
      width: 40,
      height: 40,
      color: randomColor(),
      parent: renderer.root,
    });
  };

  const node = renderer.createNode({
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    color: 0x000000ff,
    parent: renderer.root,
  });

  /**
   * Reverse Animation Demo
   */
  new Array(1).fill(0).forEach((el, i) => {
    create(i)
      .animate(
        {
          x: appDimensions.width + 100,
        },
        {
          duration: 4400,
          loop: false,
          stopMethod: 'reverse',
          easing: 'ease-in',
        },
      )
      .start();
  });

  /**
   * Loop animation demo
   */
  const easings = [
    'linear',
    'ease-in',
    'ease-out',
    'ease-in-out',
    'ease-in-sine',
    'ease-out-sine',
    'ease-in-out-sine',
    'ease-in-cubic',
    'ease-out-cubic',
    'ease-in-out-cubic',
    'ease-in-circ',
    'ease-out-circ',
    'ease-in-out-circ',
    'ease-in-back',
    'ease-out-back',
    'ease-in-out-back',
    'cubic-bezier(0,1.35,.99,-0.07)',
    'cubic-bezier(.41,.91,.99,-0.07)',
  ];

  new Array(easings.length).fill(0).forEach((el, i) => {
    create(2 + i)
      .animate(
        {
          x: appDimensions.width + 100,
        },
        {
          duration: 3400,
          loop: true,
          easing: easings[i],
        },
      )
      .start();
  });

  /*
   * End: Sprite Map Demo
   */
  console.log('ready!');
}
