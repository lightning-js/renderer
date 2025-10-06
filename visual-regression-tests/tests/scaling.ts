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
import type { INodeProps } from '@lightningjs/renderer';
import type { ExampleSettings } from '../common/ExampleSettings.js';
import { paginateTestRows } from '../common/paginateTestRows.js';
import { PageContainer } from '../common/PageContainer.js';
import { constructTestRow } from '../common/constructTestRow.js';
import robotImg from '../assets/robot/robot.png';

export async function automation(settings: ExampleSettings) {
  // Snapshot all the pages
  await (await test(settings)).snapshotPages();
}

export default async function test(settings: ExampleSettings) {
  const { renderer } = settings;
  const pageContainer = new PageContainer(settings, {
    w: renderer.settings.appWidth,
    h: renderer.settings.appHeight,
    title: 'Scaling',
  });

  await paginateTestRows(pageContainer, [
    {
      title: 'Base Node (`scale`, mount = 0)',
      content: async (rowNode) => {
        // The three Base Node test rows should render identically despite
        // different mount values, as the x/y coordinates are shifted appropriately
        // to cancel out the difference in mount.
        const nodeProps = {
          // mount: 0, (should be default)
          x: 50,
          y: 50,
          w: 100,
          h: 100,
          src: robotImg,
        } satisfies Partial<INodeProps>;

        return await constructTestRow({ renderer, rowNode }, [
          renderer.createNode({
            ...nodeProps,
          }),
          'scale 2 ->\npivot 0.5 ->',
          renderer.createNode({
            ...nodeProps,
            scale: 2,
            // pivot: 0.5, (should be default)
          }),
          'pivot 0 ->',
          renderer.createNode({
            ...nodeProps,
            pivot: 0,
            scale: 2,
          }),
          'pivot 1 ->',
          renderer.createNode({
            ...nodeProps,
            pivot: 1,
            scale: 2,
          }),
        ]);
      },
    },
    {
      title: 'Base Node (`scale`, mount = 0.5)',
      content: async (rowNode) => {
        const nodeProps = {
          mount: 0.5,
          x: 100,
          y: 100,
          w: 100,
          h: 100,
          src: robotImg,
        } satisfies Partial<INodeProps>;

        return await constructTestRow({ renderer, rowNode }, [
          renderer.createNode({
            ...nodeProps,
          }),
          'scale 2 ->\npivot 0.5 ->',
          renderer.createNode({
            ...nodeProps,
            scale: 2,
            // pivot: 0.5, (should be default)
          }),
          'pivot 0 ->',
          renderer.createNode({
            ...nodeProps,
            pivot: 0,
            scale: 2,
          }),
          'pivot 1 ->',
          renderer.createNode({
            ...nodeProps,
            pivot: 1,
            scale: 2,
          }),
        ]);
      },
    },
    {
      title: 'Base Node (`scale`, mount = 1)',
      content: async (rowNode) => {
        const nodeProps = {
          mount: 1,
          x: 150,
          y: 150,
          w: 100,
          h: 100,
          src: robotImg,
        } satisfies Partial<INodeProps>;

        return await constructTestRow({ renderer, rowNode }, [
          renderer.createNode({
            ...nodeProps,
          }),
          'scale 2 ->\npivot 0.5 ->',
          renderer.createNode({
            ...nodeProps,
            scale: 2,
            // pivot: 0.5, (should be default)
          }),
          'pivot 0 ->',
          renderer.createNode({
            ...nodeProps,
            pivot: 0,
            scale: 2,
          }),
          'pivot 1 ->',
          renderer.createNode({
            ...nodeProps,
            pivot: 1,
            scale: 2,
          }),
        ]);
      },
    },
    {
      title: 'Base Node (`scaleX`, mount = 0)',
      content: async (rowNode) => {
        // The three Base Node test rows should render identically despite
        // different mount values, as the x/y coordinates are shifted appropriately
        // to cancel out the difference in mount.
        const nodeProps = {
          // mount: 0, (should be default)
          x: 50,
          y: 50,
          w: 100,
          h: 100,
          src: robotImg,
        } satisfies Partial<INodeProps>;

        return await constructTestRow({ renderer, rowNode }, [
          renderer.createNode({
            ...nodeProps,
          }),
          'scale 2 ->\npivot 0.5 ->',
          renderer.createNode({
            ...nodeProps,
            scaleX: 2,
            // pivot: 0.5, (should be default)
          }),
          'pivot 0 ->',
          renderer.createNode({
            ...nodeProps,
            pivot: 0,
            scaleX: 2,
          }),
          'pivot 1 ->',
          renderer.createNode({
            ...nodeProps,
            pivot: 1,
            scaleX: 2,
          }),
        ]);
      },
    },
    {
      title: 'Base Node (`scaleX`, mount = 0.5)',
      content: async (rowNode) => {
        const nodeProps = {
          mount: 0.5,
          x: 100,
          y: 100,
          w: 100,
          h: 100,
          src: robotImg,
        } satisfies Partial<INodeProps>;

        return await constructTestRow({ renderer, rowNode }, [
          renderer.createNode({
            ...nodeProps,
          }),
          'scale 2 ->\npivot 0.5 ->',
          renderer.createNode({
            ...nodeProps,
            scaleX: 2,
            // pivot: 0.5, (should be default)
          }),
          'pivot 0 ->',
          renderer.createNode({
            ...nodeProps,
            pivot: 0,
            scaleX: 2,
          }),
          'pivot 1 ->',
          renderer.createNode({
            ...nodeProps,
            pivot: 1,
            scaleX: 2,
          }),
        ]);
      },
    },
    {
      title: 'Base Node (`scaleX`, mount = 1)',
      content: async (rowNode) => {
        const nodeProps = {
          mount: 1,
          x: 150,
          y: 150,
          w: 100,
          h: 100,
          src: robotImg,
        } satisfies Partial<INodeProps>;

        return await constructTestRow({ renderer, rowNode }, [
          renderer.createNode({
            ...nodeProps,
          }),
          'scale 2 ->\npivot 0.5 ->',
          renderer.createNode({
            ...nodeProps,
            scaleX: 2,
            // pivot: 0.5, (should be default)
          }),
          'pivot 0 ->',
          renderer.createNode({
            ...nodeProps,
            pivot: 0,
            scaleX: 2,
          }),
          'pivot 1 ->',
          renderer.createNode({
            ...nodeProps,
            pivot: 1,
            scaleX: 2,
          }),
        ]);
      },
    },
    {
      title: 'Base Node (`scaleY`, mount = 0)',
      content: async (rowNode) => {
        // The three Base Node test rows should render identically despite
        // different mount values, as the x/y coordinates are shifted appropriately
        // to cancel out the difference in mount.
        const nodeProps = {
          // mount: 0, (should be default)
          x: 50,
          y: 50,
          w: 100,
          h: 100,
          src: robotImg,
        } satisfies Partial<INodeProps>;

        return await constructTestRow({ renderer, rowNode }, [
          renderer.createNode({
            ...nodeProps,
          }),
          'scale 2 ->\npivot 0.5 ->',
          renderer.createNode({
            ...nodeProps,
            scaleY: 2,
            // pivot: 0.5, (should be default)
          }),
          'pivot 0 ->',
          renderer.createNode({
            ...nodeProps,
            pivot: 0,
            scaleY: 2,
          }),
          'pivot 1 ->',
          renderer.createNode({
            ...nodeProps,
            pivot: 1,
            scaleY: 2,
          }),
        ]);
      },
    },
    {
      title: 'Base Node (`scaleY`, mount = 0.5)',
      content: async (rowNode) => {
        const nodeProps = {
          mount: 0.5,
          x: 100,
          y: 100,
          w: 100,
          h: 100,
          src: robotImg,
        } satisfies Partial<INodeProps>;

        return await constructTestRow({ renderer, rowNode }, [
          renderer.createNode({
            ...nodeProps,
          }),
          'scale 2 ->\npivot 0.5 ->',
          renderer.createNode({
            ...nodeProps,
            scaleY: 2,
            // pivot: 0.5, (should be default)
          }),
          'pivot 0 ->',
          renderer.createNode({
            ...nodeProps,
            pivot: 0,
            scaleY: 2,
          }),
          'pivot 1 ->',
          renderer.createNode({
            ...nodeProps,
            pivot: 1,
            scaleY: 2,
          }),
        ]);
      },
    },
    {
      title: 'Base Node (`scaleY`, mount = 1)',
      content: async (rowNode) => {
        const nodeProps = {
          mount: 1,
          x: 150,
          y: 150,
          w: 100,
          h: 100,
          src: robotImg,
        } satisfies Partial<INodeProps>;

        return await constructTestRow({ renderer, rowNode }, [
          renderer.createNode({
            ...nodeProps,
          }),
          'scale 2 ->\npivot 0.5 ->',
          renderer.createNode({
            ...nodeProps,
            scaleY: 2,
            // pivot: 0.5, (should be default)
          }),
          'pivot 0 ->',
          renderer.createNode({
            ...nodeProps,
            pivot: 0,
            scaleY: 2,
          }),
          'pivot 1 ->',
          renderer.createNode({
            ...nodeProps,
            pivot: 1,
            scaleY: 2,
          }),
        ]);
      },
    },
  ]);

  return pageContainer;
}
