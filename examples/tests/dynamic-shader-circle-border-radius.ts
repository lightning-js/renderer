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
  const containerOnlyCircle1 = renderer.createNode({
    x: 40,
    y: 120,
    width: 400,
    height: 400,
    color: 0x0000ffff,
    parent: testRoot,
  });

  const nodeCircleRed1 = renderer.createNode({
    x: 0,
    y: 0,
    width: 400,
    height: 400,
    color: 0xff0000ff,
    shader: renderer.createShader('DynamicShader', {
      effects: [
        {
          type: 'radius',
          props: {
            radius: 400 / 2,
          },
        },
      ],
    }),
    parent: containerOnlyCircle1,
  });

  const containerCircle1 = renderer.createNode({
    x: 40 + 440,
    y: 120,
    width: 400,
    height: 400,
    color: 0x0000ffff,
    parent: testRoot,
  });

  const nodeCircleRedWithBorder1 = renderer.createNode({
    x: 0,
    y: 0,
    width: 400,
    height: 400,
    color: 0xff0000ff,
    shader: renderer.createShader('DynamicShader', {
      effects: [
        {
          type: 'radius',
          props: {
            radius: 400 / 2,
          },
        },
        {
          type: 'border',
          props: {
            width: 6,
            color: 0xfafafaff,
          },
        },
      ],
    }),
    parent: containerCircle1,
  });

  const containerOnlyCircle2 = renderer.createNode({
    x: 40,
    y: 120 + 440,
    width: 152,
    height: 152,
    color: 0x0000ffff,
    parent: testRoot,
  });

  const nodeCircleRed2 = renderer.createNode({
    x: 0,
    y: 0,
    width: 152,
    height: 152,
    color: 0xff0000ff,
    shader: renderer.createShader('DynamicShader', {
      effects: [
        {
          type: 'radius',
          props: {
            radius: 152 / 2,
          },
        },
      ],
    }),
    parent: containerOnlyCircle2,
  });

  const containerCircle2 = renderer.createNode({
    x: 40 + 192,
    y: 120 + 440,
    width: 152,
    height: 152,
    color: 0x0000ffff,
    parent: testRoot,
  });

  const nodeCircleRedWithBorder2 = renderer.createNode({
    x: 0,
    y: 0,
    width: 152,
    height: 152,
    color: 0xff0000ff,
    shader: renderer.createShader('DynamicShader', {
      effects: [
        {
          type: 'radius',
          props: {
            radius: 152 / 2,
          },
        },
        {
          type: 'border',
          props: {
            width: 6,
            color: 0xfafafaff,
          },
        },
      ],
    }),
    parent: containerCircle2,
  });
}
