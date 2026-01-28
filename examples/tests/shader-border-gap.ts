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

export default async function test({
  renderer,
  testRoot,
  snapshot,
}: ExampleSettings) {
  const RedRect = renderer.createNode({
    x: 90,
    y: 90,
    w: 200,
    h: 200,
    color: 0xff0000ff,
    shader: renderer.createShader('Border', { w: 20, align: 0, gap: -10 }),
    parent: testRoot,
  });

  const RedRect2 = renderer.createNode({
    x: 390,
    y: 90,
    w: 200,
    h: 200,
    color: 0xff0000ff,
    shader: renderer.createShader('Border', { w: 20, align: 0.5 }),
    parent: testRoot,
  });

  const RedRect3 = renderer.createNode({
    x: 720,
    y: 90,
    w: 200,
    h: 200,
    color: 0xff0000ff,
    shader: renderer.createShader('Border', { w: 20, align: 1, gap: 10 }),
    parent: testRoot,
  });

  const GreenRect = renderer.createNode({
    x: 90,
    y: 400,
    w: 200,
    h: 200,
    color: 0x00ff00ff,
    shader: renderer.createShader('RoundedWithBorder', {
      'border-w': 20,
      'border-align': 'inside',
      'border-gap': -10,
      radius: 30,
    }),
    parent: testRoot,
  });

  const GreenRect2 = renderer.createNode({
    x: 390,
    y: 400,
    w: 200,
    h: 200,
    color: 0x00ff00ff,
    shader: renderer.createShader('RoundedWithBorder', {
      'border-w': 20,
      'border-align': 'center',
      radius: 30,
    }),
    parent: testRoot,
  });

  const GreenRect3 = renderer.createNode({
    x: 720,
    y: 400,
    w: 200,
    h: 200,
    color: 0x00ff00ff,
    shader: renderer.createShader('RoundedWithBorder', {
      'border-w': 20,
      'border-align': 'outside',
      'border-gap': 10,
      radius: 30,
    }),
    parent: testRoot,
  });

  const BlueRect = renderer.createNode({
    x: 90,
    y: 710,
    w: 200,
    h: 200,
    color: 0x0000ffff,
    shader: renderer.createShader('RoundedWithBorderAndShadow', {
      'border-w': 20,
      'border-align': 'inside',
      'border-gap': -10,
      radius: 30,
    }),
    parent: testRoot,
  });

  const BlueRect2 = renderer.createNode({
    x: 390,
    y: 710,
    w: 200,
    h: 200,
    color: 0x0000ffff,
    shader: renderer.createShader('RoundedWithBorderAndShadow', {
      'border-w': 20,
      'border-align': 'center',
      radius: 30,
    }),
    parent: testRoot,
  });

  const BlueRect3 = renderer.createNode({
    x: 720,
    y: 710,
    w: 200,
    h: 200,
    color: 0x0000ffff,
    shader: renderer.createShader('RoundedWithBorderAndShadow', {
      'border-w': 20,
      'border-align': 'outside',
      'border-gap': 10,
      radius: 30,
    }),
    parent: testRoot,
  });
}
