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
import robot from '../assets/robot/robot.png';

export default async function ({ renderer }: ExampleSettings) {
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
            angle: 220,
            colors: [
              0xff0000ff, 0x00ff00ff, 0xff0000ff, 0x0000ffff, 0xffff00ff,
              0xff0000ff,
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
            angle: 40,
            colors: [
              0xff0000ff, 0x00ff00ff, 0xff0000ff, 0x0000ffff, 0xffff00ff,
              0xff0000ff,
            ],
          },
        },
      ],
    }),
    parent: renderer.root,
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
    parent: renderer.root,
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
            angle: 60,
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
    parent: renderer.root,
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
    parent: renderer.root,
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
          type: 'radius',
          props: {
            radius: 100,
          },
        },
        {
          type: 'border',
          props: {
            width: 20,
            color: 0x00ff00ff,
          },
        },
      ],
    }),
    parent: renderer.root,
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
    parent: renderer.root,
  });

  /*
   * End: Sprite Map Demo
   */
  console.log('ready!');
}
