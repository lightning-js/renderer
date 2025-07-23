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
import { getLoremIpsum } from '../common/LoremIpsum.js';

export async function automation(settings: ExampleSettings) {
  const next = await test(settings);
  await settings.snapshot();
  while (await next()) {
    await settings.snapshot();
  }
}

/**
 * This test is to ensure that the canvas text renderer and the sdf text
 * renderer both support the `textAlign` property consistently.
 *
 * Two text nodes are created with the same text, font size, and font family.
 * The only difference is that one uses the canvas text renderer (red text) and
 * the other uses the sdf text renderer (blue text). The `textAlign` property
 * is changed during each step.
 *
 * This test includes a single line text case to ensure that the `textAlign`
 * bug reported in https://github.com/lightning-js/renderer/issues/171 works.
 *
 * Unfortunately, the canvas text renderer horitzonal layout will vary between
 * browsers and platforms. There will be some differences in the horizontal
 * text layout between the two text nodes. Don't expect entirely homogeneous
 * purple text.
 *
 * Expected results: The two text nodes align text properly according to the
 * `textAlign` property.
 *
 * Press the right arrow key to cycle through the different `textAlign` values.
 *
 * @param param0
 * @returns
 */
export default async function test({ renderer, testRoot }: ExampleSettings) {
  const fontFamily = 'Ubuntu';
  const fontSize = 20;
  const yPos = 0;
  testRoot.width = 500;
  testRoot.height = 500;
  testRoot.clipping = true;
  testRoot.color = 0xffffffff;

  const canvasText = renderer.createTextNode({
    y: yPos,
    maxWidth: testRoot.width,
    fontSize,
    fontFamily,
    color: 0xff0000ff,
    textRendererOverride: 'canvas',
    parent: testRoot,
  });
  const sdfText = renderer.createTextNode({
    y: yPos,
    maxWidth: testRoot.width,
    fontSize,
    fontFamily,
    color: 0x0000ff77,
    parent: testRoot,
    zIndex: 3,
  });
  const indexInfo = renderer.createTextNode({
    x: testRoot.width,
    y: testRoot.height,
    mount: 1,
    color: 0x000000ff,
    fontFamily: 'Ubuntu',
    fontSize: 20,
    text: '1',
    parent: testRoot,
  });

  let i = 0;
  const mutations = [
    () => {
      canvasText.text = sdfText.text = getLoremIpsum(1200);
      canvasText.textAlign = sdfText.textAlign = 'left';
    },
    () => {
      canvasText.textAlign = sdfText.textAlign = 'center';
    },
    () => {
      canvasText.textAlign = sdfText.textAlign = 'right';
    },
    () => {
      canvasText.text = sdfText.text = 'Single Line Text';
      canvasText.textAlign = sdfText.textAlign = 'left';
    },
    () => {
      canvasText.textAlign = sdfText.textAlign = 'center';
    },
    () => {
      canvasText.textAlign = sdfText.textAlign = 'right';
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
    mutations[i]?.();
    indexInfo.text = (i + 1).toString();
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
