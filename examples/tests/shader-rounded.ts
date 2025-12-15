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
  await test(settings);
  await settings.snapshot();
}

export default async function test({ renderer, testRoot }: ExampleSettings) {
  const size = 220;
  const radius = 40;

  const integerParent = renderer.createNode({
    x: 40,
    y: 40,
    width: size,
    height: size,
    color: 0x00000000,
    parent: testRoot,
  });

  renderer.createNode({
    x: 0,
    y: 0,
    width: size,
    height: size,
    color: 0xff0000ff,
    shader: renderer.createShader('DynamicShader', {
      effects: [
        {
          type: 'radius',
          props: {
            radius,
          },
        },
      ],
    }),
    parent: integerParent,
  });

  const fractionalParent = renderer.createNode({
    x: 320.5,
    y: 40.5,
    width: size,
    height: size,
    color: 0x00000000,
    parent: testRoot,
  });

  renderer.createNode({
    x: 0,
    y: 0,
    width: size,
    height: size,
    color: 0x00ff00ff,
    shader: renderer.createShader('DynamicShader', {
      effects: [
        {
          type: 'radius',
          props: {
            radius,
          },
        },
      ],
    }),
    parent: fractionalParent,
  });

  const fractionalParent2 = renderer.createNode({
    x: 600.25,
    y: 40.75,
    width: size,
    height: size,
    color: 0x00000000,
    parent: testRoot,
  });

  renderer.createNode({
    x: 0,
    y: 0,
    width: size,
    height: size,
    color: 0x0000ffff,
    shader: renderer.createShader('DynamicShader', {
      effects: [
        {
          type: 'radius',
          props: {
            radius: [radius, radius / 2, radius, radius / 2],
          },
        },
      ],
    }),
    parent: fractionalParent2,
  });
}
