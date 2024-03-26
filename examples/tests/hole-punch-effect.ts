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

export async function automation(settings: ExampleSettings) {
  // Snapshot single page
  await test(settings);
  await settings.snapshot();
}

export default async function test({ renderer, testRoot }: ExampleSettings) {
  const degToRad = (deg: number) => {
    return (Math.PI / 180) * deg;
  };

  const t1 = renderer.createNode({
    x: 0,
    y: 0,
    width: 960,
    height: 540,
    color: 0xff0000ff,
    shader: renderer.createShader('DynamicShader', {
      effects: [
        {
          type: 'holePunch',
          props: {
            width: 200,
            height: 200,
            y: 20,
            x: 50,
            radius: 0,
          },
        },
      ],
    }),
    parent: testRoot,
  });

  const t2 = renderer.createNode({
    x: 960,
    y: 0,
    width: 960,
    height: 540,
    color: 0xff0000ff,
    shader: renderer.createShader('DynamicShader', {
      effects: [
        {
          type: 'holePunch',
          props: {
            width: 200,
            height: 400,
            y: 120,
            x: 50,
            radius: 0,
          },
        },
        {
          type: 'linearGradient',
          props: {
            angle: degToRad(40),
            colors: [
              0xff0000ff, 0x00ff00ff, 0xff0000ff, 0x0000ffff, 0xffff00ff,
              0xff0000ff,
            ],
          },
        },
      ],
    }),
    parent: testRoot,
  });

  const t3 = renderer.createNode({
    x: 0,
    y: 540,
    width: 960,
    height: 540,
    color: 0xff0000ff,
    shader: renderer.createShader('DynamicShader', {
      effects: [
        {
          type: 'linearGradient',
          props: {
            angle: degToRad(40),
            colors: [
              0xff0000ff, 0x00ff00ff, 0xff0000ff, 0x0000ffff, 0xffff00ff,
              0xff0000ff,
            ],
          },
        },
        {
          type: 'holePunch',
          props: {
            width: 400,
            height: 400,
            y: 20,
            x: 540,
            radius: 0,
          },
        },
      ],
    }),
    parent: testRoot,
  });

  const noiseTexture = renderer.createTexture('NoiseTexture', {
    width: 666,
    height: 333,
  });

  const t4 = renderer.createNode({
    x: 960,
    y: 540,
    width: 960,
    height: 540,
    texture: noiseTexture,
    shader: renderer.createShader('DynamicShader', {
      effects: [
        {
          type: 'holePunch',
          props: {
            width: 400,
            height: 200,
            y: 20,
            x: 540,
            radius: 0,
          },
        },
      ],
    }),
    parent: testRoot,
  });

  console.log('ready!');
}
