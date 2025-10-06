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

import type { INode, RendererMain } from '@lightningjs/renderer';
import type { ExampleSettings } from '../common/ExampleSettings.js';
import { PageContainer } from '../common/PageContainer.js';

export async function automation(settings: ExampleSettings) {
  // Snapshot all the pages
  await (await test(settings)).snapshotPages();
}

export default async function test(settings: ExampleSettings) {
  const { renderer } = settings;
  const pageContainer = new PageContainer(settings, {
    w: renderer.settings.appWidth,
    h: renderer.settings.appHeight,
    title: 'Dynamic Settings clearColor Tests',
  });

  pageContainer.pushPage(createTestCase(renderer, 'red', 0xff0000ff));
  pageContainer.pushPage(createTestCase(renderer, 'green', 0x00ff00ff));
  pageContainer.pushPage(createTestCase(renderer, 'transparent', 0x00000000));

  await delay(200);
  pageContainer.finalizePages();
  return pageContainer;
}

function createTestCase(
  renderer: RendererMain,
  colorName: 'red' | 'green' | 'transparent',
  color: number,
) {
  return async function (page: INode) {
    renderer.createTextNode({
      mount: 0.5,
      w: 400,
      h: 400,
      text: `Test passes if the background appears as ${colorName}`,
      fontFamily: 'Ubuntu',
      fontSize: 50,
      x: renderer.settings.appWidth / 2,
      y: renderer.settings.appHeight / 2,
      parent: page,
    });

    renderer.setClearColor(color);
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
