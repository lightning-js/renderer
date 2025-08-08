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
    title: 'Text Rotation',
  });

  await paginateTestRows(pageContainer, [
    ...generateRotationTest(renderer, 'sdf'),
    ...generateRotationTest(renderer, 'canvas'),
  ]);

  return pageContainer;
}

const NODE_PROPS = {
  x: 100,
  y: 100,
  color: 0x000000ff,
  text: 'xyz',
  fontFamily: 'Ubuntu',
  textRendererOverride: 'sdf',
  fontSize: 50,
} satisfies Partial<ITextNodeProps>;

function generateRotationTest(
  renderer: RendererMain,
  textRenderer: 'canvas' | 'sdf',
): TestRow[] {
  return [
    {
      title: `Text Node ('rotation', ${textRenderer}, mount = 0)`,
      content: async (rowNode) => {
        const nodeProps = {
          ...NODE_PROPS,
          textRendererOverride: textRenderer,
        } satisfies Partial<ITextNodeProps>;

        const baselineNode = renderer.createTextNode({
          ...nodeProps,
        });
        // Get the position for the center of the container based on mount = 0
        const position = {
          x: 75,
          y: 75,
        };

        baselineNode.x = position.x;
        baselineNode.y = position.y;

        return await constructTestRow({ renderer, rowNode }, [
          baselineNode,
          'rotation 45 deg ->\npivot 0.5 ->',
          renderer.createTextNode({
            ...nodeProps,
            ...position,
            rotation: Math.PI / 4,
            // pivot: 0.5, (should be default)
          }),
          'pivot 0 ->',
          renderer.createTextNode({
            ...nodeProps,
            ...position,
            pivot: 0,
            rotation: Math.PI / 4,
          }),
          'pivot 1 ->',
          renderer.createTextNode({
            ...nodeProps,
            ...position,
            pivot: 1,
            rotation: Math.PI / 4,
          }),
        ]);
      },
    },
    {
      title: `Text Node ('rotation', ${textRenderer},  mount = 0.5)`,
      content: async (rowNode) => {
        const nodeProps = {
          ...NODE_PROPS,
          mount: 0.5,
          x: 100,
          y: 100,
          textRendererOverride: textRenderer,
        } satisfies Partial<ITextNodeProps>;

        return await constructTestRow({ renderer, rowNode }, [
          renderer.createTextNode({
            ...nodeProps,
          }),
          'scale 2 ->\npivot 0.5 ->',
          renderer.createTextNode({
            ...nodeProps,
            rotation: Math.PI / 4,
            // pivot: 0.5, (should be default)
          }),
          'pivot 0 ->',
          renderer.createTextNode({
            ...nodeProps,
            pivot: 0,
            rotation: Math.PI / 4,
          }),
          'pivot 1 ->',
          renderer.createTextNode({
            ...nodeProps,
            pivot: 1,
            rotation: Math.PI / 4,
          }),
        ]);
      },
    },
    {
      title: `Text Node ('rotation', ${textRenderer},  mount = 1)`,
      content: async (rowNode) => {
        const nodeProps = {
          ...NODE_PROPS,
          mount: 1,
          textRendererOverride: textRenderer,
        } satisfies Partial<ITextNodeProps>;

        const baselineNode = renderer.createTextNode({
          ...nodeProps,
        });
        const position = {
          x: 75,
          y: 75,
        };

        baselineNode.x = position.x;
        baselineNode.y = position.y;

        return await constructTestRow({ renderer, rowNode }, [
          baselineNode,
          'scale 2 ->\npivot 0.5 ->',
          renderer.createTextNode({
            ...nodeProps,
            ...position,
            rotation: Math.PI / 4,
            // pivot: 0.5, (should be default)
          }),
          'pivot 0 ->',
          renderer.createTextNode({
            ...nodeProps,
            ...position,
            pivot: 0,
            rotation: Math.PI / 4,
          }),
          'pivot 1 ->',
          renderer.createTextNode({
            ...nodeProps,
            ...position,
            pivot: 1,
            rotation: Math.PI / 4,
          }),
        ]);
      },
    },
  ] satisfies TestRow[];
}
