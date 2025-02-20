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
    x: 20,
    y: 20,
    width: 200,
    height: 200,
    color: 0xff0000ff,
    shader: renderer.createShader('Border'),
    parent: testRoot,
  });

  const RedRect2 = renderer.createNode({
    x: 250,
    y: 20,
    width: 200,
    height: 200,
    color: 0xff0000ff,
    shader: renderer.createShader('Border', { width: 30 }),
    parent: testRoot,
  });

  const GreenRect = renderer.createNode({
    x: 20,
    y: 250,
    width: 200,
    height: 200,
    color: 0x00ff00ff,
    shader: renderer.createShader('Border', {
      top: 10,
    }),
    parent: testRoot,
  });

  const GreenRect2 = renderer.createNode({
    x: 250,
    y: 250,
    width: 200,
    height: 200,
    color: 0x00ff00ff,
    shader: renderer.createShader('Border', {
      right: 10,
    }),
    parent: testRoot,
  });

  const GreenRect3 = renderer.createNode({
    x: 480,
    y: 250,
    width: 200,
    height: 200,
    color: 0x00ff00ff,
    shader: renderer.createShader('Border', {
      bottom: 10,
    }),
    parent: testRoot,
  });

  const GreenRect4 = renderer.createNode({
    x: 710,
    y: 250,
    width: 200,
    height: 200,
    color: 0x00ff00ff,
    shader: renderer.createShader('Border', {
      left: 10,
    }),
    parent: testRoot,
  });
}
