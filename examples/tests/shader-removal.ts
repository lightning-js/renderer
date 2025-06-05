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
  // Snapshot tests
  await test(settings);
  await settings.snapshot({ name: 'initial-state' });

  // Wait 1 second and take another snapshot
  await settings.wait(1000);
  await settings.snapshot({ name: 'after-shader-removal' });
}

export default async function test({
  renderer,
  testRoot,
  snapshot,
}: ExampleSettings) {
  // Create title text
  renderer.createTextNode({
    x: testRoot.width / 2,
    y: 50,
    mountX: 0.5,
    fontSize: 40,
    fontFamily: 'Ubuntu',
    text: 'Shader Removal Test',
    parent: testRoot,
    color: 0xffffffff,
  });

  // Create first rounded rectangle
  const rectangle1 = renderer.createNode({
    x: 200,
    y: 150,
    width: 300,
    height: 300,
    color: 0xff0000ff,
    shader: renderer.createShader('RoundedRectangle', {
      radius: 50,
    }),
    parent: testRoot,
  });

  // Create label
  renderer.createTextNode({
    x: 200,
    y: 470,
    mountX: 0,
    fontSize: 24,
    fontFamily: 'Ubuntu',
    text: 'Original Shader',
    parent: testRoot,
    color: 0xffffffff,
  });

  // Store the shader reference
  const shader = rectangle1.shader;

  // Create second rectangle using the same shader
  const rectangle2 = renderer.createNode({
    x: 600,
    y: 150,
    width: 300,
    height: 300,
    color: 0x00ff00ff,
    shader: shader,
    parent: testRoot,
  });

  // Create label
  renderer.createTextNode({
    x: 600,
    y: 470,
    mountX: 0,
    fontSize: 24,
    fontFamily: 'Ubuntu',
    text: 'Same Shader Instance',
    parent: testRoot,
    color: 0xffffffff,
  });

  // Create a status text that will be updated
  const statusText = renderer.createTextNode({
    x: testRoot.width / 2,
    y: 550,
    mountX: 0.5,
    fontSize: 32,
    fontFamily: 'Ubuntu',
    text: 'Shader active in cache',
    parent: testRoot,
    color: 0xffffffff,
  });

  // After 500ms, remove the shader and create a new rectangle
  setTimeout(() => {
    // Remove the shader
    const removed = renderer.removeShader(shader);
    console.log(`Shader removed: ${removed}`);

    // Update status text
    statusText.text = `Shader removed from cache: ${removed}`;

    // Create a third rectangle with the same shader config
    // This will create a new shader instance since the original was removed
    const rectangle3 = renderer.createNode({
      x: 1000,
      y: 150,
      width: 300,
      height: 300,
      color: 0x0000ffff,
      shader: renderer.createShader('RoundedRectangle', {
        radius: 50,
      }),
      parent: testRoot,
    });

    // Create label
    renderer.createTextNode({
      x: 1000,
      y: 470,
      mountX: 0,
      fontSize: 24,
      fontFamily: 'Ubuntu',
      text: 'New Shader Instance',
      parent: testRoot,
      color: 0xffffffff,
    });

    // Add explanation text
    renderer.createTextNode({
      x: testRoot.width / 2,
      y: 620,
      mountX: 0.5,
      fontSize: 24,
      fontFamily: 'Ubuntu',
      text: 'Note: Existing nodes still work with removed shader',
      parent: testRoot,
      color: 0xffffffff,
    });
  }, 500);

  console.log('Shader removal test initialized');
}
