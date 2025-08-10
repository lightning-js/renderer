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

import type { ExampleSettings } from '../common/ExampleSettings.js';

export default async function ({ renderer, testRoot }: ExampleSettings) {
  const randomColor = () => {
    const randomInt = Math.floor(Math.random() * Math.pow(2, 32));
    const hexString = randomInt.toString(16).padStart(8, '0');

    return parseInt(hexString, 16);
  };

  const rnd = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
  };

  const bg = renderer.createNode({
    x: 0,
    y: 0,
    w: 1920,
    h: 1080,
    color: 0x000000ff,
    parent: testRoot,
  });

  const x = renderer.createNode({
    x: 0,
    y: 1080 / 2,
    w: 1920,
    h: 4,
    color: 0xffffffff,
    parent: testRoot,
    mountY: 0.5,
  });

  const y = renderer.createNode({
    x: 1920 / 2,
    y: 0,
    w: 4,
    h: 1080,
    color: 0xffffffff,
    parent: testRoot,
    mountX: 0.5,
  });

  const pivotX = 0.5;
  const pivotY = 0.5;

  const mountX = 0.5;
  const mountY = 0.5;

  const node = renderer.createNode({
    x: 1920 / 2,
    y: 1080 / 2,
    w: 500,
    h: 500,
    colorBottom: randomColor() * 0xffffffaa,
    colorTop: randomColor() * 0xffffffaa,
    parent: testRoot,
    shader: renderer.createShader('RoundedRectangle', {
      radius: rnd(10, 50),
    }),
    mountX,
    mountY,
    pivotX,
    pivotY,
  });

  const pivotPoint = renderer.createNode({
    x: pivotX * 500,
    y: pivotY * 500,
    w: 20,
    h: 20,
    color: 0xffffffff,
    parent: node,
    shader: renderer.createShader('RoundedRectangle', {
      radius: 10,
    }),
    scale: 1,
    mount: 0.5,
  });

  setTimeout(async () => {
    const dimension = node
      .animate(
        {
          w: 1920,
        },
        {
          duration: 450,
          loop: false,
          stopMethod: 'reverse',
          easing: 'ease-in-out',
        },
      )
      .start();

    await dimension.waitUntilStopped();

    const rotate = node
      .animate(
        {
          rotation: Math.PI,
        },
        {
          duration: rnd(1500, 1700),
          loop: false,
          stopMethod: 'reverse',
          easing: 'ease-in-out',
        },
      )
      .start();
    await rotate.waitUntilStopped();
  }, 2300);
}
