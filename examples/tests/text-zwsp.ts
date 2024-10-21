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

export async function automation(settings: ExampleSettings) {
  const next = await test(settings);
  await settings.snapshot();
  while (await next()) {
    await settings.snapshot();
  }
}

/**
 * This test is to ensure that both the canvas text renderer and the sdf text
 * renderer correctly support zero-width space (ZWSP) for text line-breaking.
 *
 * Two text nodes are created with ZWSP inserted between words to test if the
 * line breaks appropriately without visible gaps or extra spaces.
 *
 * Expected results: The two text nodes should break lines where ZWSP is inserted,
 * without any extra spaces, gaps, or visible issues.
 *
 * Press the right arrow key to cycle through the different ZWSP test cases.
 *
 * @param param0
 * @returns
 */
export default async function test({ renderer, testRoot }: ExampleSettings) {
  const fontFamily = 'Ubuntu';
  const fontSize = 40;
  const yPos = 0;
  testRoot.width = 500;
  testRoot.height = 500;
  testRoot.clipping = true;
  testRoot.color = 0xffffffff;

  const canvasText = renderer.createTextNode({
    y: yPos,
    width: testRoot.width,
    fontSize,
    fontFamily,
    contain: 'width',
    color: 0xff0000ff,
    textRendererOverride: 'canvas',
    parent: testRoot,
  });

  const sdfText = renderer.createTextNode({
    y: yPos,
    width: testRoot.width,
    fontSize,
    fontFamily,
    contain: 'width',
    color: 0x0000ff77,
    parent: testRoot,
    zIndex: 3,
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
  const ZWSP = '\u200B';
  const mutations = [
    () => {
      canvasText.text =
        sdfText.text = `This${ZWSP}is${ZWSP}a${ZWSP}test${ZWSP}with${ZWSP}ZWSP${ZWSP}between${ZWSP}words.`;
    },
    () => {
      canvasText.text =
        sdfText.text = `Testing${ZWSP}the${ZWSP}line${ZWSP}break${ZWSP}capability${ZWSP}with${ZWSP}multiple${ZWSP}words.`;
    },
    () => {
      canvasText.text =
        sdfText.text = `Short${ZWSP}text${ZWSP}with${ZWSP}ZWSP.`;
    },
    () => {
      canvasText.text =
        sdfText.text = `A${ZWSP}single${ZWSP}ZWSP${ZWSP}test${ZWSP}case${ZWSP}to${ZWSP}check${ZWSP}behavior.`;
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
