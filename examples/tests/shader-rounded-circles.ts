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
  const sizes = [10, 20, 40, 80, 100, 200, 300, 400, 800];
  let x = 20;
  let y = 20;
  let rowHeight = 0;

  sizes.forEach((size) => {
    if (x + size > 1900) {
      x = 20;
      y += rowHeight + 20;
      rowHeight = 0;
    }
    renderer.createNode({
      x,
      y,
      w: size,
      h: size,
      color: 0xff0000ff,
      shader: renderer.createShader('Rounded', { radius: size / 2 }),
      parent: testRoot,
    });

    x += size + 20;
    rowHeight = Math.max(rowHeight, size);
  });
}
