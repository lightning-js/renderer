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

import type {
  ITextNode,
  ITextNodeWritableProps,
  RendererMain,
} from '@lightningjs/renderer';
import type { ExampleSettings } from '../common/ExampleSettings.js';

const commonTextProps = {
  mount: 0.5,
  width: 400,
  height: 400,
  contain: 'none',
  text: 'Test passes if this text appears only as green',
  fontFamily: 'Ubuntu',
  textRendererOverride: 'canvas',
  fontSize: 50,
} satisfies Partial<ITextNodeWritableProps>;

export default async function ({ renderer }: ExampleSettings) {
  const subheader = renderer.createTextNode({
    x: 0,
    y: 0,
    text: '',
    fontFamily: 'Ubuntu',
    textRendererOverride: 'sdf',
    fontSize: 50,
    parent: renderer.root,
  });

  const testCaseArr = [
    createTestCase(renderer, 1, subheader, 'sdf', 'none'),
    createTestCase(renderer, 2, subheader, 'sdf', 'width'),
    createTestCase(renderer, 3, subheader, 'sdf', 'both'),
    createTestCase(renderer, 4, subheader, 'canvas', 'none'),
    createTestCase(renderer, 5, subheader, 'canvas', 'width'),
    createTestCase(renderer, 6, subheader, 'canvas', 'both'),
  ];

  let i = 0;
  let destroyTest = testCaseArr[i]!();

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      destroyTest();
    }

    if (e.key === 'ArrowRight') {
      i++;
      if (i >= testCaseArr.length) {
        i = 0;
      }
    }

    if (e.key === 'ArrowLeft') {
      i--;
      if (i < 0) {
        i = testCaseArr.length - 1;
      }
    }

    destroyTest = testCaseArr[i]!();
  });
}

function constructHeader(
  testNum: number,
  textRenderer: 'canvas' | 'sdf',
  contain: ITextNodeWritableProps['contain'],
) {
  return `Text Offscreen Move Test #${testNum}\n\ntextRenderer = ${textRenderer}\ncontain = ${contain}\n`;
}

function createTestCase(
  renderer: RendererMain,
  testNum: number,
  subheader: ITextNode,
  textRenderer: 'canvas' | 'sdf',
  contain: ITextNodeWritableProps['contain'],
) {
  return function () {
    subheader.text = constructHeader(testNum, textRenderer, contain);
    const onscreenStartText = renderer.createTextNode({
      ...commonTextProps,
      color: 0xff0000ff,
      x: renderer.settings.appWidth / 2,
      y: renderer.settings.appHeight / 2,
      textRendererOverride: textRenderer,
      contain,
      parent: renderer.root,
    });

    const offscreenStartText = renderer.createTextNode({
      ...commonTextProps,
      color: 0x00ff00ff,
      x: -1000,
      y: -1000,
      textRendererOverride: textRenderer,
      contain,
      parent: renderer.root,
    });

    // await delay(1000);

    subheader.text = constructHeader(testNum, textRenderer, contain);

    // Move Offscreen Text on screen
    offscreenStartText.x = renderer.settings.appWidth / 2;
    offscreenStartText.y = renderer.settings.appHeight / 2;

    return function destroy() {
      offscreenStartText.parent = null;
      onscreenStartText.parent = null;
      offscreenStartText.destroy();
      onscreenStartText.destroy();
    };
  };
}
