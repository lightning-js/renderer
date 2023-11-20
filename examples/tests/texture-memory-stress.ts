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
import type { RendererMainSettings } from '../../dist/exports/main-api.js';
import type { ExampleSettings } from '../common/ExampleSettings.js';

export function customSettings(
  urlParams: URLSearchParams,
): Partial<RendererMainSettings> {
  const finalizationRegistry = urlParams.get('finalizationRegistry') === 'true';
  return {
    textureCleanupOptions: {
      textureCleanupAgeThreadholdMs: 6000,
      textureCleanupIntervalMs: 1000,
    },
    experimental_FinalizationRegistryTextureUsageTracker: finalizationRegistry,
  };
}

export default async function ({ renderer, testRoot }: ExampleSettings) {
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
    text: 'Texture Memory Stress Test',
    parent: screen,
    fontFamily: 'Ubuntu',
    fontSize: 60,
  });

  renderer.createTextNode({
    x: 0,
    y: 100,
    width: renderer.settings.appWidth,
    contain: 'width',
    text: `This test will create and display a random texture every 10ms.

To test that the textures are being properly disposed of, you can use the Chrome Task Manager to monitor the GPU's memory usage:

1. Click Window > Task Manager
2. Locate the "GPU Process"
3. Observe the "Memory Footprint" column
4. The value should eventually drop significantly toward a minimum and/or reach a
threadhold.

By default, the ManualCountTextureUsageTracker is used to track texture usage. Also test the experimental FinalizationRegistryTextureUsageTracker instead, by setting the URL param "finalizationRegistry=true".
    `,
    parent: screen,
    fontFamily: 'Ubuntu',
    fontSize: 40,
  });

  // Create a new random texture every 10ms
  setInterval(() => {
    screen.texture = renderer.createTexture(
      'NoiseTexture',
      {
        width: 500,
        height: 500,
        cacheId: Math.floor(Math.random() * 100000),
      },
      {
        preload: true,
      },
    );
  }, 10);
}
