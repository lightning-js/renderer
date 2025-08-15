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
  const parent = renderer.createNode({
    x: 200,
    y: 240,
    w: 500,
    h: 500,
    color: 0x000000ff,
    parent: testRoot,
    zIndex: 0,
    zIndexLocked: 1,
    alpha: 0.5,
  });

  const child = renderer.createNode({
    x: 800,
    y: 0,
    w: 500,
    h: 500,
    color: 0xff0000ff,
    parent,
    zIndex: 12,
    alpha: 1,
  });

  console.log('ready!');
}
