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
import pexels from '../assets/pexels.jpg';
import robotImg from '../assets/robot/robot.png';
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
    w: 1200,
    h: 700,
    x: 200,
    y: 200,
    src: pexels,
    shader: renderer.createShader('Refraction'),
    parent: testRoot,
  });
}
