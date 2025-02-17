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
import type { RendererMainSettings } from '@lightningjs/renderer';
import type { ExampleSettings } from '../common/ExampleSettings.js';

export function customSettings(): Partial<RendererMainSettings> {
  return {
    textureMemory: {
      criticalThreshold: 100 * 1024 ** 2,
      targetThresholdLevel: 0.25,
      debugLogging: true,
    },
  };
}

export default async function ({
  renderer,
  testRoot,
  memMonitor,
}: ExampleSettings) {
  // Make the memory monitor update fast
  if (memMonitor) {
    memMonitor.interval = 10;
  }
  const screen = renderer.createNode({
    x: 0,
    y: 0,
    width: renderer.settings.appWidth,
    height: renderer.settings.appHeight,
    parent: testRoot,
    color: 0xff00ffff,
  });

  renderer.createTextNode({
    x: 0,
    y: 0,
    text: 'Critical Texture Memory Cleanup Test',
    parent: screen,
    fontFamily: 'Ubuntu',
    fontSize: 60,
  });

  renderer.createTextNode({
    x: 0,
    y: 100,
    width: renderer.settings.appWidth,
    contain: 'width',
    text: `This test will create and display a random NoiseTexture node every 10ms and never offer a moment for Idle Texture Cleanup. Only Critical Texture Cleanup will be triggered.

See docs/ManualRegressionTests.md for more information.
    `,
    parent: screen,
    fontFamily: 'Ubuntu',
    fontSize: 40,
  });

  // Create a new random texture every 10ms
  setInterval(() => {
    screen.texture = renderer.createTexture('NoiseTexture', {
      width: 500,
      height: 500,
      cacheId: Math.floor(Math.random() * 100000),
    });
    screen.textureOptions.preload = true;
  }, 100);
}
