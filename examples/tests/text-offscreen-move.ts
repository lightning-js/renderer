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
  INode,
  ITextNodeProps,
  RendererMain,
} from '@lightningjs/renderer';
import type { ExampleSettings } from '../common/ExampleSettings.js';
import { PageContainer } from '../common/PageContainer.js';

export async function automation(settings: ExampleSettings) {
  // Snapshot all the pages
  await (await test(settings)).snapshotPages();
}

/**
 * This test is to ensure that text that starts offscreen and moves onscreen
 * is rendered correctly.
 *
 * This test was designed around the following bug report:
 * https://github.com/lightning-js/renderer/issues/50
 *
 * @param param0
 */
export default async function test(settings: ExampleSettings) {
  const { renderer } = settings;

  // const controlbox = renderer.createNode({
  //   x: renderer.settings.appWidth / 2,
  //   y: renderer.settings.appHeight / 2,
  //   mount: 0.5,
  //   width: 400,
  //   height: 400,
  //   color: 0xffffffff,
  //   alpha: 0.2,
  //   parent: settings.testRoot
  // });

  const pageContainer = new PageContainer(settings, {
    width: renderer.settings.appWidth,
    height: renderer.settings.appHeight,
    title: 'Text Offscreen Move Tests',
  });

  pageContainer.pushPage(createTestCase(renderer, 'sdf', 'none'));
  pageContainer.pushPage(createTestCase(renderer, 'sdf', 'width'));
  pageContainer.pushPage(createTestCase(renderer, 'sdf', 'both'));
  pageContainer.pushPage(createTestCase(renderer, 'canvas', 'none'));
  pageContainer.pushPage(createTestCase(renderer, 'canvas', 'width'));
  pageContainer.pushPage(createTestCase(renderer, 'canvas', 'both'));

  await delay(200);
  pageContainer.finalizePages();
  return pageContainer;
}

const commonTextProps = {
  mount: 0.5,
  width: 400,
  height: 400,
  contain: 'none',
  text: 'Test passes if this text appears only as green',
  fontFamily: 'Ubuntu',
  textRendererOverride: 'canvas',
  fontSize: 50,
} satisfies Partial<ITextNodeProps>;

function createTestCase(
  renderer: RendererMain,
  textRenderer: 'canvas' | 'sdf',
  contain: ITextNodeProps['contain'],
) {
  return async function (page: INode) {
    const subheader = renderer.createTextNode({
      x: 0,
      y: 10,
      text: '',
      fontFamily: 'Ubuntu',
      textRendererOverride: 'sdf',
      fontSize: 30,
      parent: page,
    });

    subheader.text = `textRenderer = ${textRenderer}\ncontain = ${contain}`;
    renderer.createTextNode({
      ...commonTextProps,
      color: 0xff0000ff,
      x: renderer.settings.appWidth / 2,
      y: renderer.settings.appHeight / 2,
      textRendererOverride: textRenderer,
      contain,
      parent: page,
    });

    const offscreenStartText = renderer.createTextNode({
      ...commonTextProps,
      color: 0x00ff00ff,
      x: -1000,
      y: -1000,
      textRendererOverride: textRenderer,
      contain,
      parent: page,
    });

    // Move Offscreen Text on screen
    offscreenStartText.x = renderer.settings.appWidth / 2;
    offscreenStartText.y = renderer.settings.appHeight / 2;
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
