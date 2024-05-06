/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2024 Comcast Cable Communications Management, LLC.
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
import { waitForLoadedDimensions } from '../common/utils.js';

export async function automation(settings: ExampleSettings) {
  const next = await test(settings);
  await settings.snapshot();
  while (await next()) {
    await settings.snapshot();
  }
}

/**
 * Tests that the dimensions of a text node are correctly calculated and reported
 * when using SDF and Canvas text renderers and that switching between on
 * a single node them works.
 *
 * Use the 'right arrow' key to advance to the next test.
 *
 * @param settings
 * @returns
 */
export default async function test(settings: ExampleSettings) {
  const { renderer, testRoot } = settings;

  // Set a smaller snapshot area
  testRoot.width = 200;
  testRoot.height = 200;
  testRoot.color = 0xffffffff;

  const textBg = renderer.createNode({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    color: 0x00ff00ff,
    parent: testRoot,
  });

  const text1 = renderer.createTextNode({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    color: 0x000000ff,
    fontFamily: 'Ubuntu',
    textRendererOverride: 'sdf',
    fontSize: 50,
    text: '',
    parent: testRoot,
  });

  const indexInfo = renderer.createTextNode({
    x: testRoot.width,
    y: testRoot.height,
    mount: 1,
    width: 0,
    height: 0,
    color: 0x000000ff,
    fontFamily: 'Ubuntu',
    fontSize: 20,
    text: '1',
    parent: testRoot,
  });

  let i = 0;
  const mutations = [
    () => {
      text1.text = 'SDF';
      text1.textRendererOverride = 'sdf';
    },
    () => {
      text1.text = 'SDF\ngyqpj';
    },
    () => {
      text1.text = 'Canvas';
      text1.textRendererOverride = 'canvas';
    },
    () => {
      text1.text = 'Canvas\ngyqpj';
    },
    () => {
      // Test one more time with SDF to make sure Canvas
      text1.text = 'SDF 2nd';
      text1.textRendererOverride = 'sdf';
    },
  ];
  /**
   * Run the next mutation in the list
   *
   * @param idx
   * @returns `false` if loop is set to false and we've already gone through all mutations. Otherwise `true`.
   */
  async function next(loop = false, idx = i + 1): Promise<boolean> {
    if (idx > mutations.length - 1) {
      if (!loop) {
        return false;
      }
      idx = 0;
    }
    i = idx;
    const waitPromise = waitForLoadedDimensions(text1);
    mutations[i]?.();
    indexInfo.text = (i + 1).toString();
    const dimensions = await waitPromise;
    textBg.width = dimensions.width;
    textBg.height = dimensions.height;
    return true;
  }
  await next(false, 0);

  window.addEventListener('keydown', (event) => {
    // When right arrow is pressed, call next
    if (event.key === 'ArrowRight') {
      next(true).catch(console.error);
    }
  });

  return next;
}
