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

export default async function ({ renderer, testRoot }: ExampleSettings) {
  console.log('Target Animation FPS Test');
  console.log('Global targetFPS:', renderer.targetFPS);

  // Demonstrate runtime setting of target FPS
  console.log('Setting global target to 24fps...');
  renderer.targetFPS = 24;

  const node = renderer.createNode({
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    color: 0x000000ff,
    parent: testRoot,
  });

  // Test node 1: Uses global default FPS (no targetFps specified)
  const globalFpsNode = renderer.createNode({
    x: 100,
    y: 100,
    width: 200,
    height: 200,
    color: 0xff0000ff, // Red
    parent: node,
  });

  // Test node 2: Overrides with specific FPS
  const specificFpsNode = renderer.createNode({
    x: 400,
    y: 100,
    width: 200,
    height: 200,
    color: 0x00ff00ff, // Green
    parent: node,
  });

  // Test node 3: No FPS throttling (should run at display refresh rate)
  const noThrottleNode = renderer.createNode({
    x: 700,
    y: 100,
    width: 200,
    height: 200,
    color: 0x0000ffff, // Blue
    parent: node,
  });

  // Labels
  const globalLabel = renderer.createTextNode({
    x: 100,
    y: 320,
    text: 'Global Target FPS',
    fontFamily: 'Ubuntu',
    fontSize: 32,
    color: 0xffffffff,
    parent: node,
  });

  const specificLabel = renderer.createTextNode({
    x: 400,
    y: 320,
    text: 'Specific 12 FPS',
    fontFamily: 'Ubuntu',
    fontSize: 32,
    color: 0xffffffff,
    parent: node,
  });

  const noThrottleLabel = renderer.createTextNode({
    x: 700,
    y: 320,
    text: 'No Throttling',
    fontFamily: 'Ubuntu',
    fontSize: 32,
    color: 0xffffffff,
    parent: node,
  });

  // Animation 1: Should use global default FPS setting
  const globalFpsAnimation = globalFpsNode.animate(
    {
      x: globalFpsNode.x + 300,
      rotation: Math.PI * 2,
    },
    {
      duration: 3000,
      loop: true,
      easing: 'ease-in-out',
      // No targetFps specified - should use global default
    },
  );

  // Animation 2: Specific 12 FPS override
  const specificFpsAnimation = specificFpsNode.animate(
    {
      x: specificFpsNode.x + 300,
      rotation: Math.PI * 2,
    },
    {
      duration: 3000,
      loop: true,
      easing: 'ease-in-out',
      targetFps: 12, // Override global default
    },
  );

  // Animation 3: No throttling (should run at display refresh rate)
  const noThrottleAnimation = noThrottleNode.animate(
    {
      x: noThrottleNode.x + 300,
      rotation: Math.PI * 2,
    },
    {
      duration: 3000,
      loop: true,
      easing: 'ease-in-out',
      targetFps: 0, // Explicitly disable throttling
    },
  );

  globalFpsAnimation.start();
  specificFpsAnimation.start();
  noThrottleAnimation.start();

  // Demonstrate dynamic FPS changes
  let fpsChangeCounter = 0;
  const fpsValues = [24, 15, 60, undefined]; // undefined = no throttling

  setInterval(() => {
    fpsChangeCounter = (fpsChangeCounter + 1) % fpsValues.length;
    const newFps = fpsValues[fpsChangeCounter];

    console.log(`Changing global target FPS to: ${newFps ?? 'no throttling'}`);
    renderer.targetFPS = newFps;

    // Update the label to show current setting
    globalLabel.text = `Global Target: ${newFps ?? 'No Throttling'}`;
  }, 4000); // Change every 4 seconds

  // Instructions
  const instructions = renderer.createTextNode({
    x: 100,
    y: 500,
    text:
      'Watch how the RED box changes smoothness as global FPS changes every 4 seconds:\n' +
      '• Red box: Uses dynamic global target FPS (changes automatically)\n' +
      '• Green box: Always 12 FPS (never changes)\n' +
      '• Blue box: Always no throttling (never changes)\n' +
      '\nAlso try: renderer.targetFPS = 30;',
    fontFamily: 'Ubuntu',
    fontSize: 24,
    color: 0xffffffff,
    parent: node,
  });
}
