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
  const next = await test(settings);
  await settings.snapshot({ name: 'initial-state' });

  // Execute the next step
  next();
  await settings.snapshot({ name: 'after-shader-removal' });
}

export default async function test({
  renderer,
  testRoot,
  automation,
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
  const next = () => {
    // Remove the shader
    rectangle1.shader = null; // Detach shader from rectangle1
    rectangle2.shader = null; // Detach shader from rectangle2
    if (shader) {
      const removed = renderer.removeShader(shader);
      console.log(`Shader removed: ${removed}`, rectangle2.shader);

      statusText.text = `Shader removed from cache: ${removed}`;
    }

    // First test - directly setting shader property (should use default shader instead of throwing)
    // Create a node without a shader initially
    const rectangleTest1 = renderer.createNode({
      x: 450,
      y: 150,
      width: 200,
      height: 200,
      color: 0x0000ffff,
      parent: testRoot,
      shader: shader, // Using the destroyed shader - should be replaced with default
    });

    // Check if it's using the default shader or the destroyed one
    const usingDefaultShader1 = rectangleTest1.shader !== shader;
    console.log(
      `Test 1: Using ${
        usingDefaultShader1 ? 'default' : 'DESTROYED'
      } shader. Protection: ${usingDefaultShader1 ? '✓' : '❌'}`,
    );

    renderer.createTextNode({
      x: 450,
      y: 370,
      mountX: 0.5,
      fontSize: 20,
      fontFamily: 'Ubuntu',
      text: usingDefaultShader1
        ? '✓ Setter Protection Works!'
        : '❌ Setter Protection Failed!',
      parent: testRoot,
      color: usingDefaultShader1 ? 0x00ff00ff : 0xff0000ff,
    });

    // Create labels for each test case
    renderer.createTextNode({
      x: 450,
      y: 320,
      mountX: 0.5,
      fontSize: 20,
      fontFamily: 'Ubuntu',
      text: 'Test 1: Setter Check',
      parent: testRoot,
      color: 0xffffffff,
    });

    // Second test - trying to create a node with a destroyed shader in props
    // This should silently use the default shader instead
    const rectangleTest2 = renderer.createNode({
      x: 850,
      y: 150,
      width: 200,
      height: 200,
      color: 0x0000ffff,
      shader: shader, // Using the destroyed shader - should be replaced with default
      parent: testRoot,
    });

    // Check if it's using the default shader or the destroyed one
    const usingDefaultShader = rectangleTest2.shader !== shader;
    console.log(
      `Created node with ${
        usingDefaultShader ? 'default' : 'DESTROYED'
      } shader. Protection: ${usingDefaultShader ? '✓' : '❌'}`,
    );

    renderer.createTextNode({
      x: 850,
      y: 370,
      mountX: 0.5,
      fontSize: 20,
      fontFamily: 'Ubuntu',
      text: usingDefaultShader
        ? '✓ Constructor Protection Works!'
        : '❌ Constructor Protection Failed!',
      parent: testRoot,
      color: usingDefaultShader ? 0x00ff00ff : 0xff0000ff,
    });

    // Create a third rectangle with a new shader instance to show everything works properly
    const rectangle3 = renderer.createNode({
      x: 1250,
      y: 150,
      width: 200,
      height: 200,
      color: 0x0000ffff,
      shader: renderer.createShader('RoundedRectangle', {
        radius: 50,
      }),
      parent: testRoot,
    });

    // console.log('Created new rectangle with fresh shader, id:', rectangle3.id);

    // Add explanation text
    renderer.createTextNode({
      x: testRoot.width / 2,
      y: 520,
      mountX: 0.5,
      fontSize: 24,
      fontFamily: 'Ubuntu',
      text: 'Note: Both creation-time and runtime protection are active',
      parent: testRoot,
      color: 0xffffffff,
    });
  };

  if (!automation) {
    console.log(
      'Running in manual mode, waiting 3 seconds before next step...',
    );
    setTimeout(() => {
      console.log('Executing next step after delay');
      next();
    }, 3000);
  }

  console.log('Shader removal test initialized');

  return next;
}
