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
import elevatorPng from '../assets/elevator.png';

export async function automation(settings: ExampleSettings) {
  // Snapshot single page
  await test(settings);
  await settings.snapshot();
}

export default async function test({ renderer, testRoot }: ExampleSettings) {
  const RedRect = renderer.createNode({
    x: 20,
    y: 20,
    w: 600,
    h: 400,
    color: 0xff0000ff,
    shader: renderer.createShader('RadialGradient', {
      w: 200,
      h: 200,
    }),
    parent: testRoot,
  });

  const RedRect2 = renderer.createNode({
    x: 720,
    y: 20,
    w: 600,
    h: 400,
    color: 0xff0000ff,
    shader: renderer.createShader('RadialGradient', {
      colors: [0xff00ffff, 0xffff00ff, 0x0000ffff, 0x00ff00ff],
      w: 300,
      h: 200,
    }),
    parent: testRoot,
  });

  const GreenRect = renderer.createNode({
    x: 20,
    y: 520,
    w: 600,
    h: 400,
    color: 0x00ff00ff,
    shader: renderer.createShader('RadialGradient', {
      colors: [0xff00ffff, 0xffff00ff, 0x0000ffff, 0x00ff00ff, 0xff0000ff],
      w: 200,
      h: 300,
    }),
    parent: testRoot,
  });

  const GreenRect2 = renderer.createNode({
    x: 720,
    y: 520,
    w: 600,
    h: 400,
    src: elevatorPng,
    shader: renderer.createShader('RadialGradient', {
      colors: [0x00000000, 0x000000ff],
      stops: [0.3, 1.0],
      w: 300,
      h: 200,
    }),
    parent: testRoot,
  });
}
