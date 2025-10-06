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
  const node = renderer.createNode({
    x: 0,
    y: 0,
    w: 1920,
    h: 1080,
    color: 0xffffffff,
    parent: testRoot,
  });

  renderer.createNode({
    x: 300,
    y: 300,
    mount: 0.5,
    w: 250,
    h: 250,
    color: 0xff00ffff,
    shader: renderer.createShader('Shadow', {
      x: 50,
      spread: 50,
      blur: 100,
    }),
    parent: node,
  });

  renderer.createNode({
    x: 700,
    y: 300,
    mount: 0.5,
    w: 250,
    h: 250,
    color: 0xff00ffff,
    shader: renderer.createShader('RoundedWithShadow', {
      radius: 10,
      'shadow-x': 50,
      'shadow-spread': 50,
      'shadow-blur': 100,
    }),
    parent: node,
  });

  renderer.createNode({
    x: 1100,
    y: 300,
    mount: 0.5,
    w: 250,
    h: 250,
    color: 0xff00ffff,
    shader: renderer.createShader('RoundedWithBorderAndShadow', {
      radius: 10,
      'shadow-x': 50,
      'shadow-spread': 50,
      'shadow-blur': 100,
      'border-w': 20,
    }),
    parent: node,
  });
}
