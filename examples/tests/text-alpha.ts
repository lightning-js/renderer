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
  INodeWritableProps,
  ITextNodeWritableProps,
  RendererMain,
} from '@lightningjs/renderer';
import type { ExampleSettings } from '../common/ExampleSettings.js';
import { paginateTestRows, type TestRow } from '../common/paginateTestRows.js';
import { PageContainer } from '../common/PageContainer.js';
import { constructTestRow } from '../common/constructTestRow.js';

const containerSize = 100;

const NODE_PROPS = {
  mount: 0.5,
  x: containerSize / 2,
  y: containerSize / 2,
  color: 0x000000ff,
  text: 'xyz',
  fontFamily: 'Ubuntu',
  textRendererOverride: 'sdf',
  fontSize: 50,
} satisfies Partial<ITextNodeWritableProps>;

export async function automation(settings: ExampleSettings) {
  // Snapshot all the pages
  await (await test(settings)).snapshotPages();
}

export default async function test(settings: ExampleSettings) {
  const { renderer, testRoot } = settings;
  const pageContainer = new PageContainer(settings, {
    width: renderer.settings.appWidth,
    height: renderer.settings.appHeight,
    parent: testRoot,
    title: 'Text Alpha',
  });

  await paginateTestRows(pageContainer, [
    ...generateAlphaTest(renderer, 'sdf'),
    ...generateAlphaTest(renderer, 'canvas'),
  ]);

  return pageContainer;
}

function generateAlphaTest(
  renderer: RendererMain,
  textRenderer: 'canvas' | 'sdf',
): TestRow[] {
  return [
    {
      title: `Direct Alpha Prop (${textRenderer})`,
      content: async (rowNode) => {
        const nodeProps = {
          ...NODE_PROPS,
          textRendererOverride: textRenderer,
        } satisfies Partial<ITextNodeWritableProps>;

        return await constructTestRow({ renderer, rowNode, containerSize }, [
          renderer.createTextNode({
            ...nodeProps,
          }),
          'alpha 0.5 ->',
          renderer.createTextNode({
            ...nodeProps,
            alpha: 0.5,
          }),
          'alpha 0.05 ->',
          renderer.createTextNode({
            ...nodeProps,
            alpha: 0.05,
          }),
          'alpha 0 ->',
          renderer.createTextNode({
            ...nodeProps,
            alpha: 0,
          }),
        ]);
      },
    },
    {
      title: `Parent Alpha Prop (${textRenderer})`,
      content: async (rowNode) => {
        const nodeProps = {
          ...NODE_PROPS,
          textRendererOverride: textRenderer,
        } satisfies Partial<ITextNodeWritableProps>;

        return await constructTestRow({ renderer, rowNode, containerSize }, [
          createContainedTextNode(renderer, textRenderer, {
            alpha: 1.0,
          }),
          'alpha 0.5 ->',
          createContainedTextNode(renderer, textRenderer, {
            alpha: 0.5,
          }),
          'alpha 0.05 ->',
          createContainedTextNode(renderer, textRenderer, {
            alpha: 0.05,
          }),
          'alpha 0 ->',
          createContainedTextNode(renderer, textRenderer, {
            alpha: 0,
          }),
        ]);
      },
    },
    {
      title: `Direct Alpha Prop + Color Alpha (${textRenderer})`,
      content: async (rowNode) => {
        const nodeProps = {
          ...NODE_PROPS,
          textRendererOverride: textRenderer,
        } satisfies Partial<ITextNodeWritableProps>;

        return await constructTestRow({ renderer, rowNode, containerSize }, [
          renderer.createTextNode({
            ...nodeProps,
            alpha: 1.0,
            color: 0x000000ff,
          }),
          'color.a -> 0.5',
          renderer.createTextNode({
            ...nodeProps,
            alpha: 1.0,
            color: 0x00000080,
          }),
          'alpha -> 0.5',
          renderer.createTextNode({
            ...nodeProps,
            alpha: 0.5,
            color: 0x00000080,
          }),
        ]);
      },
    },
    {
      title: `Parent Alpha Prop + Color Alpha (${textRenderer})`,
      content: async (rowNode) => {
        const nodeProps = {
          ...NODE_PROPS,
          textRendererOverride: textRenderer,
        } satisfies Partial<ITextNodeWritableProps>;

        return await constructTestRow({ renderer, rowNode, containerSize }, [
          createContainedTextNode(renderer, textRenderer, {
            alpha: 1.0,
            color: 0xff0000ff,
          }),
          'container\n  .color.a -> 0.5',
          createContainedTextNode(renderer, textRenderer, {
            alpha: 1.0,
            // Just changing the color alpha of the container doesn't affect
            // the contained text's alpha
            color: 0xff000080,
          }),
          'container\n  .alpha -> 0.5',
          createContainedTextNode(renderer, textRenderer, {
            alpha: 0.5,
            color: 0xff000080,
          }),
        ]);
      },
    },
    null,
  ] satisfies TestRow[];
}

function createContainedTextNode(
  renderer: RendererMain,
  textRenderer: 'canvas' | 'sdf',
  containerProps: Partial<INodeWritableProps>,
) {
  const container = renderer.createNode({
    width: containerSize,
    height: containerSize,
    color: 0x00ff00ff,
    ...containerProps,
  });
  renderer.createTextNode({
    ...NODE_PROPS,
    textRendererOverride: textRenderer,
    parent: container,
    // alpha: 0.50,
  });
  return container;
}
