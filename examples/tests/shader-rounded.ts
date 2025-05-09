/*
 * Copyright 2023 Comcast Cable Communications Management, LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
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
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ExampleSettings } from '../common/ExampleSettings.js';

export async function automation(settings: ExampleSettings) {
  // Snapshot single page
  await test(settings);
  await settings.snapshot();
}

export default async function test({ renderer, testRoot }: ExampleSettings) {
  const RedRect = renderer.createNode({
    x: 20,
    y: 20,
    width: 200,
    height: 200,
    color: 0xff0000ff,
    shader: renderer.createShader('Rounded'),
    parent: testRoot,
  });

  const RedRect2 = renderer.createNode({
    x: 250,
    y: 20,
    width: 200,
    height: 200,
    color: 0xff0000ff,
    shader: renderer.createShader('Rounded', { radius: [20] }),
    parent: testRoot,
  });

  const GreenRect = renderer.createNode({
    x: 20,
    y: 250,
    width: 200,
    height: 200,
    color: 0x00ff00ff,
    shader: renderer.createShader('Rounded', {
      'top-left': 20,
    }),
    parent: testRoot,
  });

  const GreenRect2 = renderer.createNode({
    x: 250,
    y: 250,
    width: 200,
    height: 200,
    color: 0x00ff00ff,
    shader: renderer.createShader('Rounded', {
      'top-right': 20,
    }),
    parent: testRoot,
  });

  const GreenRect3 = renderer.createNode({
    x: 480,
    y: 250,
    width: 200,
    height: 200,
    color: 0x00ff00ff,
    shader: renderer.createShader('Rounded', {
      'bottom-right': 20,
    }),
    parent: testRoot,
  });

  const GreenRect4 = renderer.createNode({
    x: 710,
    y: 250,
    width: 200,
    height: 200,
    color: 0x00ff00ff,
    shader: renderer.createShader('Rounded', {
      'bottom-left': 20,
    }),
    parent: testRoot,
  });

  const BlueRect = renderer.createNode({
    x: 20,
    y: 480,
    width: 200,
    height: 200,
    color: 0x0000ffff,
    shader: renderer.createShader('RoundedWithBorder', {
      'top-left': 20,
      'border-width': 10,
    }),
    parent: testRoot,
  });

  const BlueRect2 = renderer.createNode({
    x: 250,
    y: 480,
    width: 200,
    height: 200,
    color: 0x0000ffff,
    shader: renderer.createShader('RoundedWithBorder', {
      'top-right': 20,
      'border-top': 10,
    }),
    parent: testRoot,
  });

  const BlueRect3 = renderer.createNode({
    x: 480,
    y: 480,
    width: 200,
    height: 200,
    color: 0x0000ffff,
    shader: renderer.createShader('RoundedWithBorder', {
      'border-width': 10,
      'border-left': 20,
      'border-right': 20,
      radius: 50,
    }),
    parent: testRoot,
  });

  const BlueRect4 = renderer.createNode({
    x: 710,
    y: 480,
    width: 200,
    height: 200,
    color: 0x0000ffff,
    shader: renderer.createShader('RoundedWithBorder', {
      'bottom-left': 20,
      'border-bottom': 10,
    }),
    parent: testRoot,
  });

  const YellowRect = renderer.createNode({
    x: 20,
    y: 710,
    width: 200,
    height: 200,
    color: 0xff9900ff,
    shader: renderer.createShader('RoundedWithShadow', {
      'top-left': 20,
    }),
    parent: testRoot,
  });

  const YellowRect2 = renderer.createNode({
    x: 250,
    y: 710,
    width: 200,
    height: 200,
    color: 0xff9900ff,
    shader: renderer.createShader('RoundedWithShadow', {
      'top-right': 20,
    }),
    parent: testRoot,
  });

  const YellowRect3 = renderer.createNode({
    x: 480,
    y: 710,
    width: 200,
    height: 200,
    color: 0xff9900ff,
    shader: renderer.createShader('RoundedWithShadow', {
      'bottom-right': 20,
    }),
    parent: testRoot,
  });

  const YellowRect4 = renderer.createNode({
    x: 710,
    y: 710,
    width: 200,
    height: 200,
    color: 0xff9900ff,
    shader: renderer.createShader('RoundedWithShadow', {
      'bottom-left': 20,
    }),
    parent: testRoot,
  });
}
