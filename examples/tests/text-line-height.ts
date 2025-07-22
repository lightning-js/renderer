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

import type { ITextNodeProps, RendererMain } from '@lightningjs/renderer';
import type { ExampleSettings } from '../common/ExampleSettings.js';
import { paginateTestRows, type TestRow } from '../common/paginateTestRows.js';
import { PageContainer } from '../common/PageContainer.js';
import { constructTestRow } from '../common/constructTestRow.js';

export async function automation(settings: ExampleSettings) {
  // Snapshot all the pages
  await (await test(settings)).snapshotPages();
}

export default async function test(settings: ExampleSettings) {
  const { renderer } = settings;
  const pageContainer = new PageContainer(settings, {
    width: renderer.settings.appWidth,
    height: renderer.settings.appHeight,
    title: 'Text Line Height',
  });

  await paginateTestRows(pageContainer, [
    ...generateLineHeightTest(renderer, 'sdf'),
    ...generateLineHeightTest(renderer, 'canvas'),
  ]);

  return pageContainer;
}

const NODE_PROPS = {
  x: 90,
  y: 90,
  mount: 0.5,
  color: 0x000000ff,
  text: 'abcd\ntxyz',
  fontFamily: 'Ubuntu',
  textRendererOverride: 'sdf',
  verticalAlign: 'middle',
  fontSize: 50,
} satisfies Partial<ITextNodeProps>;

function generateLineHeightTest(
  renderer: RendererMain,
  textRenderer: 'canvas' | 'sdf',
): TestRow[] {
  function createTextWithBox(props: Partial<ITextNodeProps>) {
    // Create a container for the text and its background box
    const container = renderer.createNode({
      x: 0,
      y: 0,
      width: 180,
      height: 180,
    });

    // Create the text node
    const textNode = renderer.createTextNode({
      ...props,
      parent: container,
    });

    // Wait for text to load and then add a background box showing its actual dimensions
    textNode.on('loaded', () => {
      // Background box showing text node boundaries
      renderer.createNode({
        x: textNode.x,
        y: textNode.y,
        mount: textNode.mount,
        width: textNode.width,
        height: textNode.height,
        color: 0x0066cc40,
        parent: container,
        zIndex: -1,
      });
    });

    return container;
  }

  return [
    {
      title: `Text Node ('lineHeight', ${textRenderer}, fontSize=50) - with boundary boxes${
        textRenderer === 'canvas' ? ', "BROKEN!"' : ''
      }`,
      content: async (rowNode) => {
        const nodeProps = {
          ...NODE_PROPS,
          textRendererOverride: textRenderer,
        } satisfies Partial<ITextNodeProps>;

        return await constructTestRow(
          { renderer, rowNode, containerSize: 180 },
          [
            'lineHeight: (default)\n->',
            createTextWithBox(nodeProps),
            '60 ->',
            createTextWithBox({
              ...nodeProps,
              lineHeight: 60,
            }),
            '70 ->',
            createTextWithBox({
              ...nodeProps,
              lineHeight: 70,
            }),
            '25 ->',
            createTextWithBox({
              ...nodeProps,
              lineHeight: 25,
            }),
            '10 ->',
            createTextWithBox({
              ...nodeProps,
              lineHeight: 10,
            }),
            '1 ->',
            createTextWithBox({
              ...nodeProps,
              lineHeight: 1,
            }),
          ],
        );
      },
    },
  ] satisfies TestRow[];
}
