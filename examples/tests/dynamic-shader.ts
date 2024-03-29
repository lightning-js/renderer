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
    x: 200,
    y: 100,
    width: 250,
    height: 500,
    shader: renderer.createShader('DynamicShader', {
      effects: [
        {
          type: 'radius',
          props: {
            radius: 50,
          },
        },
        {
          type: 'linearGradient',
          props: {
            angle: 0,
            colors: [
              0xff0000ff, 0x00ff00ff, 0xff0000ff, 0x0000ffff, 0xffff00ff,
              0xff000000,
            ],
          },
        },
        {
          type: 'border',
          props: {
            width: 30,
            color: 0xffffffff,
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

  const t2 = renderer.createNode({
    x: 500,
    y: 100,
    width: 250,
    height: 500,
    color: 0x00ff00ff,
    shader: renderer.createShader('DynamicShader', {
      effects: [
        {
          type: 'borderTop',
          props: {
            width: 30,
            color: 0xff0000ff,
          },
        },
        {
          type: 'borderBottom',
          props: {
            width: 30,
            color: 0xff0000ff,
          },
        },
      ],
    }),
    parent: testRoot,
  });

  const t3 = renderer.createNode({
    x: 800,
    y: 100,
    width: 250,
    height: 500,
    shader: renderer.createShader('DynamicShader', {
      effects: [
        {
          type: 'linearGradient',
          props: {
            angle: degToRad(90),
            stops: [0.2, 0.3],
            colors: [
              0xff0000ff, 0x00ff00ff, 0xff0000ff, 0x0000ffff, 0xffff00ff,
              0xff0000ff,
            ],
          },
        },
        {
          type: 'radius',
          props: {
            radius: 50,
          },
        },
      ],
    }),
    parent: testRoot,
  });

  const t4 = renderer.createNode({
    x: 1100,
    y: 100,
    width: 250,
    height: 500,
    color: 0x0000ffff,
    shader: renderer.createShader('DynamicShader', {
      effects: [
        {
          type: 'borderRight',
          props: {
            width: 30,
            color: 0xff00ffff,
          },
        },
        {
          type: 'borderLeft',
          props: {
            width: 15,
            color: 0xff00ffff,
          },
        },
      ],
    }),
    parent: testRoot,
  });

  const t5 = renderer.createNode({
    x: 1400,
    y: 100,
    width: 250,
    height: 500,
    color: 0xff0000ff,
    shader: renderer.createShader('DynamicShader', {
      effects: [
        {
          type: 'linearGradient',
          props: {
            angle: degToRad(180),
            stops: [0.4, 0.8],
            colors: [0x0000ffff, 0x00000000],
          },
        },
        {
          type: 'linearGradient',
          props: {
            angle: degToRad(-90),
            stops: [0.1, 0.75],
            colors: [0x0000ffff, 0x00000000],
          },
        },
      ],
    }),
    parent: testRoot,
  });

  const t6 = renderer.createNode({
    x: 200,
    y: 700,
    width: 750,
    height: 250,
    color: 0xff0000ff,
    shader: renderer.createShader('DynamicShader', {
      effects: [
        {
          type: 'radius',
          props: {
            radius: 100,
          },
        },
        {
          type: 'fadeOut',
          props: {
            fade: [200, 100, 0, 0],
          },
        },
      ],
    }),
    parent: testRoot,
  });

  const t7 = renderer.createNode({
    x: 1000,
    y: 700,
    width: 750,
    height: 250,
    shader: renderer.createShader('DynamicShader', {
      effects: [
        {
          type: 'radialGradient',
          props: {
            colors: [0xff0000ff, 0x00ff00ff, 0x00000000],
            stops: [0.1, 0.4, 1.0],
            height: 200,
            width: 1000,
            pivot: [0, 0.5],
          },
        },
      ],
    }),
    parent: testRoot,
  });

  /*
   * End: Sprite Map Demo
   */
  console.log('ready!');
}
