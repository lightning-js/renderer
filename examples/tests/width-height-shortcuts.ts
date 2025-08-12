/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2025 Comcast Cable Communications Management, LLC.
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

/**
 * Tests that w/h shorthand properties work identically to width/height
 * on CoreNodes
 *
 * @param settings
 * @returns
 */
export default async function test(settings: ExampleSettings) {
  const { renderer, testRoot } = settings;

  // Set test area
  testRoot.w = 600;
  testRoot.h = 270;
  testRoot.color = 0x222222ff;

  // Create header text
  renderer.createTextNode({
    x: 20,
    y: 20,
    color: 0xffffffff,
    fontFamily: 'Ubuntu',
    fontSize: 24,
    text: 'Width/Height vs W/H Shorthand Test (CoreNodes)',
    parent: testRoot,
  });

  // Test CoreNodes - using width/height
  const nodeWithLongProps = renderer.createNode({
    x: 50,
    y: 80,
    w: 120,
    h: 80,
    color: 0xff0000ff,
    parent: testRoot,
  });

  // Test CoreNodes - using w/h shorthand
  renderer.createNode({
    x: 200,
    y: 80,
    w: 120,
    h: 80,
    color: 0x00ff00ff,
    parent: testRoot,
  });

  // Additional test with different sizes
  renderer.createNode({
    x: 350,
    y: 80,
    w: 80,
    h: 120,
    color: 0x0080ffff,
    parent: testRoot,
  });

  renderer.createNode({
    x: 450,
    y: 80,
    w: 80,
    h: 120,
    color: 0xff8000ff,
    parent: testRoot,
  });

  // Label for CoreNodes
  renderer.createTextNode({
    x: 50,
    y: 170,
    color: 0xffffffff,
    fontFamily: 'Ubuntu',
    fontSize: 14,
    text: 'w: 120\nheight: 80',
    parent: testRoot,
  });

  renderer.createTextNode({
    x: 200,
    y: 170,
    color: 0xffffffff,
    fontFamily: 'Ubuntu',
    fontSize: 14,
    text: 'w: 120\nh: 80',
    parent: testRoot,
  });

  renderer.createTextNode({
    x: 350,
    y: 210,
    color: 0xffffffff,
    fontFamily: 'Ubuntu',
    fontSize: 14,
    text: 'w: 80\nheight: 120',
    parent: testRoot,
  });

  renderer.createTextNode({
    x: 450,
    y: 210,
    color: 0xffffffff,
    fontFamily: 'Ubuntu',
    fontSize: 14,
    text: 'w: 80\nh: 120',
    parent: testRoot,
  });

  return Promise.resolve();
}
