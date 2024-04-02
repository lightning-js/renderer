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
import { waitForLoadedDimensions } from '../common/utils.js';
import type {
  ITextNodeWritableProps,
  RendererMain,
} from '../../dist/exports/main-api.js';
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
    title: 'Text Vertical Align',
  });

  await paginateTestRows(pageContainer, [
    ...generateVerticalAlignTest(renderer, 'sdf'),
    null,
    ...generateVerticalAlignTest(renderer, 'canvas'),
  ]);

  return pageContainer;
}

const NODE_PROPS = {
  color: 0x000000ff,
  fontFamily: 'Ubuntu',
  textRendererOverride: 'sdf',
  fontSize: 50,
  lineHeight: 70,
} satisfies Partial<ITextNodeWritableProps>;

function generateVerticalAlignTest(
  renderer: RendererMain,
  textRenderer: 'canvas' | 'sdf',
): TestRow[] {
  return [
    {
      title: `One Line ('verticalAlign', ${textRenderer}, fontSize = 50, lineHeight = 70)`,
      content: async (rowNode) => {
        const nodeProps = {
          ...NODE_PROPS,
          text: 'txyz',
          textRendererOverride: textRenderer,
        } satisfies Partial<ITextNodeWritableProps>;

        const baselineNode = renderer.createTextNode({
          ...nodeProps,
        });

        return await constructTestRow({ renderer, rowNode }, [
          'verticalAlign: top\n(default)\n->',
          baselineNode,
          'middle ->',
          renderer.createTextNode({
            ...nodeProps,
            verticalAlign: 'middle',
          }),
          'bottom ->',
          renderer.createTextNode({
            ...nodeProps,
            verticalAlign: 'bottom',
          }),
        ]);
      },
    },
    {
      title: `Two Lines ('verticalAlign', ${textRenderer}, fontSize = 50, lineHeight = 70)`,
      content: async (rowNode) => {
        const nodeProps = {
          ...NODE_PROPS,
          text: 'abcd\ntxyz',
          textRendererOverride: textRenderer,
        } satisfies Partial<ITextNodeWritableProps>;

        const baselineNode = renderer.createTextNode({
          ...nodeProps,
        });

        return await constructTestRow({ renderer, rowNode }, [
          'verticalAlign: top\n(default)\n->',
          baselineNode,
          'middle ->',
          renderer.createTextNode({
            ...nodeProps,
            verticalAlign: 'middle',
          }),
          'bottom ->',
          renderer.createTextNode({
            ...nodeProps,
            verticalAlign: 'bottom',
          }),
        ]);
      },
    },
  ] satisfies TestRow[];
}
