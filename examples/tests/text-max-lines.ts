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
import { paginateTestRows, type TestRow } from '../common/paginateTestRows.js';
import { PageContainer } from '../common/PageContainer.js';
import type {
  ITextNodeWritableProps,
  RendererMain,
} from '../../dist/exports/main-api.js';
import { constructTestRow } from '../common/constructTestRow.js';
import { getLoremIpsum } from '../common/LoremIpsum.js';

export async function automation(settings: ExampleSettings) {
  // Snapshot all the pages
  await (await test(settings)).snapshotPages();
}

export default async function test(settings: ExampleSettings) {
  const { renderer } = settings;
  const pageContainer = new PageContainer(settings, {
    width: renderer.settings.appWidth,
    height: renderer.settings.appHeight,
    title: 'Text Max Lines',
  });

  await paginateTestRows(pageContainer, [
    ...generateMaxLinesTest(renderer, 'sdf'),
    ...generateMaxLinesTest(renderer, 'canvas'),
  ]);

  return pageContainer;
}

const NODE_PROPS = {
  x: 100,
  y: 100,
  width: 200,
  color: 0x000000ff,
  text: getLoremIpsum(100),
  fontFamily: 'Ubuntu',
  textRendererOverride: 'sdf',
  fontSize: 20,
  lineHeight: 28,
  contain: 'width',
} satisfies Partial<ITextNodeWritableProps>;

function generateMaxLinesTest(
  renderer: RendererMain,
  textRenderer: 'canvas' | 'sdf',
): TestRow[] {
  return [
    {
      title: `Text Node ('maxLines', ${textRenderer})${
        textRenderer === 'sdf' ? ', "BROKEN!"' : ''
      }`,
      content: async (rowNode) => {
        const nodeProps = {
          ...NODE_PROPS,
          textRendererOverride: textRenderer,
        } satisfies Partial<ITextNodeWritableProps>;

        const baselineNode = renderer.createTextNode({
          ...nodeProps,
        });

        const position = {
          x: 0,
          y: 0,
        };

        baselineNode.x = position.x;
        baselineNode.y = position.y;

        return await constructTestRow({ renderer, rowNode }, [
          baselineNode,
          'maxLines: 1 ->',
          renderer.createTextNode({
            ...nodeProps,
            ...position,
            maxLines: 1,
          }),
          'maxLines: 2 ->',
          renderer.createTextNode({
            ...nodeProps,
            ...position,
            maxLines: 2,
          }),
          'maxLines: 3 ->',
          renderer.createTextNode({
            ...nodeProps,
            ...position,
            maxLines: 3,
          }),
        ]);
      },
    },
  ] satisfies TestRow[];
}
