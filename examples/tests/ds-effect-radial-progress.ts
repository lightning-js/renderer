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

export default async function ({ renderer }: ExampleSettings) {
  const degToRad = (deg: number) => {
    return (Math.PI / 180) * deg;
  };

  const t1 = renderer.createNode({
    x: 200,
    y: 100,
    width: 250,
    height: 250,
    shader: renderer.createShader('DynamicShader', {
      effects: [
        {
          type: 'radialProgress',
          props: {
            progress: 0.6,
          },
        },
        {
          type: 'linearGradient',
          props: {
            angle: degToRad(90),
            colors: [0xff0000ff, 0x00ff00ff],
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
    height: 250,
    color: 0xffffff00,
    shader: renderer.createShader('DynamicShader', {
      effects: [
        {
          type: 'radialProgress',
          props: {
            progress: 1,
            color: 0x000000ff,
          },
        },
        {
          type: 'radialProgress',
          props: {
            progress: 0.2,
          },
        },
        {
          type: 'linearGradient',
          props: {
            angle: degToRad(90),
            colors: [0xff0000ff, 0x00ff00ff],
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
    height: 250,
    color: 0xffffff00,
    shader: renderer.createShader('DynamicShader', {
      effects: [
        {
          type: 'radialProgress',
          props: {
            progress: 1,
            color: 0x000000ff,
            range: degToRad(180),
          },
        },
        {
          type: 'radialProgress',
          props: {
            progress: 0.2,
            range: degToRad(180),
          },
        },
        {
          type: 'linearGradient',
          props: {
            angle: degToRad(90),
            colors: [0xff0000ff, 0x00ff00ff],
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
    height: 250,
    color: 0xffffff00,
    shader: renderer.createShader('DynamicShader', {
      effects: [
        {
          type: 'radialProgress',
          props: {
            progress: 1,
            color: 0x000000ff,
            offset: -degToRad(120),
            range: degToRad(240),
          },
        },
        {
          type: 'radialProgress',
          props: {
            progress: 0.2,
            offset: -degToRad(120),
            range: degToRad(240),
          },
        },
        {
          type: 'linearGradient',
          props: {
            angle: degToRad(90),
            colors: [0xff0000ff, 0x00ff00ff],
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
    height: 250,
    color: 0xffffff00,
    shader: renderer.createShader('DynamicShader', {
      effects: [
        {
          type: 'radialProgress',
          props: {
            progress: 1,
            color: 0x000000ff,
            width: 30,
            offset: -degToRad(120),
            range: degToRad(240),
          },
        },
        {
          type: 'radialProgress',
          props: {
            progress: 0.2,
            width: 30,
            offset: -degToRad(120),
            range: degToRad(240),
          },
        },
        {
          type: 'linearGradient',
          props: {
            angle: degToRad(90),
            colors: [0xff0000ff, 0x00ff00ff],
          },
        },
      ],
    }),
    parent: renderer.root,
  });

  console.log('ready!');
}
