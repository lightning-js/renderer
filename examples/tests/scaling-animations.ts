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

  new Array(15).fill(0).forEach((el, idx) => {
    const pivot = Math.random();

    const node = renderer.createNode({
      x: Math.floor(idx % 5) * 360 + 100,
      y: Math.floor(idx / 5) * 360 + 100,
      w: rnd(200, 300),
      h: rnd(200, 300),
      colorBottom: randomColor(),
      colorTop: randomColor(),
      parent: testRoot,
      shader: renderer.createShader('RoundedRectangle', {
        radius: rnd(10, 50),
      }),
      scale: 1,
      pivot, // x: 0.5 / y:0.5
    });

    const pivotPoint = renderer.createNode({
      x: pivot * 140 - 5,
      y: pivot * 140 - 5,
      w: 20,
      h: 20,
      color: 0xffffff55,
      parent: node,
      // shader: renderer.createShader('RoundedRectangle', {
      //   radius: 5,
      // }),
      scale: 1,
    });

    const pointInner = renderer.createNode({
      x: 2,
      y: 2,
      w: 16,
      h: 16,
      color: 0x000000ff,
      parent: pivotPoint,
      // shader: renderer.createShader('RoundedRectangle', {
      //   radius: 3,
      // }),
    });

    setTimeout(() => {
      node
        .animate(
          {
            scale: rnd(2, 4),
            rotation: Math.random() * Math.PI,
            y: 460,
            x: 820,
            w: 3,
            h: 180,
          },
          {
            duration: rnd(1500, 1700),
            loop: false,
            stopMethod: 'reverse',
            easing: 'cubic-bezier(0,1.35,.99,-0.07)',
          },
        )
        .start();
    }, 1500);
  });

  console.log('ready!');
}
