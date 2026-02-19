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
import { paginateTestRows } from '../common/paginateTestRows.js';
import { PageContainer } from '../common/PageContainer.js';
import { waitForLoadedDimensions } from '../common/utils.js';
import { deg2Rad } from '@lightningjs/renderer/utils';
import type { INodeProps } from '@lightningjs/renderer';
import robotImg from '../assets/robot/robot.png';

export async function automation(settings: ExampleSettings) {
  // Snapshot all the pages
  await (await test(settings)).snapshotPages();
}

const SQUARE_SIZE = 200;
const PADDING = 20;

export default async function test(settings: ExampleSettings) {
  const { renderer } = settings;
  const pageContainer = new PageContainer(settings, {
    w: renderer.settings.appWidth,
    h: renderer.settings.appHeight,
    title: 'Clipping Tests',
  });

  await paginateTestRows(pageContainer, [
    {
      title:
        'Standard node clips DIRECT children that are outside of its bounds',
      content: async (rowNode) => {
        let curX = 0;
        /// TOP LEFT
        const clipContainerTopLeft = renderer.createNode({
          x: curX,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0x00ff00ff,
          parent: rowNode,
          clipping: true,
        });
        renderer.createNode({
          x: -100,
          y: -100,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          src: robotImg,
          parent: clipContainerTopLeft,
        });

        curX += SQUARE_SIZE + PADDING;

        /// TOP RIGHT
        const clipContainerTopRight = renderer.createNode({
          x: curX,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0x00ff00ff,
          parent: rowNode,
          clipping: true,
        });
        renderer.createNode({
          x: 100,
          y: -100,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          src: robotImg,
          parent: clipContainerTopRight,
        });

        curX += SQUARE_SIZE + PADDING;

        /// BOTTOM RIGHT
        const clipContainerBottomRight = renderer.createNode({
          x: curX,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0x00ff00ff,
          parent: rowNode,
          clipping: true,
        });
        renderer.createNode({
          x: 100,
          y: 100,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          src: robotImg,
          parent: clipContainerBottomRight,
        });

        curX += SQUARE_SIZE + PADDING;

        /// BOTTOM LEFT
        const clipContainerBottomLeft = renderer.createNode({
          x: curX,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0x00ff00ff,
          parent: rowNode,
          clipping: true,
        });
        renderer.createNode({
          x: -100,
          y: 100,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          src: robotImg,
          parent: clipContainerBottomLeft,
        });

        curX += SQUARE_SIZE + PADDING;

        // ALL SIDES
        const clipAllSides = renderer.createNode({
          x: curX,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0x00ff00ff,
          parent: rowNode,
          clipping: true,
        });
        renderer.createNode({
          x: -100,
          y: -100,
          w: SQUARE_SIZE * 2,
          h: SQUARE_SIZE * 2,
          src: robotImg,
          parent: clipAllSides,
        });
        return SQUARE_SIZE;
      },
    },
    {
      title:
        'Standard node clips ANCESTOR children that are outside of its bounds',
      content: async (rowNode) => {
        let curX = 0;

        /// TOP LEFT
        const clipContainerTopLeft = renderer.createNode({
          x: curX,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0x00ff00ff,
          parent: rowNode,
          clipping: true,
        });
        const clipContainerTopLeft2 = renderer.createNode({
          parent: clipContainerTopLeft,
        });
        renderer.createNode({
          x: -100,
          y: -100,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          src: robotImg,
          parent: clipContainerTopLeft2,
        });

        curX += SQUARE_SIZE + PADDING;

        /// TOP RIGHT
        const clipContainerTopRight = renderer.createNode({
          x: curX,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0x00ff00ff,
          parent: rowNode,
          clipping: true,
        });
        const clipContainerTopRight2 = renderer.createNode({
          parent: clipContainerTopRight,
        });
        renderer.createNode({
          x: 100,
          y: -100,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          src: robotImg,
          parent: clipContainerTopRight2,
        });

        curX += SQUARE_SIZE + PADDING;

        /// BOTTOM RIGHT
        const clipContainerBottomRight = renderer.createNode({
          x: curX,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0x00ff00ff,
          parent: rowNode,
          clipping: true,
        });
        const clipContainerBottomRight2 = renderer.createNode({
          parent: clipContainerBottomRight,
        });
        renderer.createNode({
          x: 100,
          y: 100,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          src: robotImg,
          parent: clipContainerBottomRight2,
        });

        curX += SQUARE_SIZE + PADDING;

        /// BOTTOM LEFT
        const clipContainerBottomLeft = renderer.createNode({
          x: curX,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0x00ff00ff,
          parent: rowNode,
          clipping: true,
        });
        const clipContainerBottomLeft2 = renderer.createNode({
          parent: clipContainerBottomLeft,
        });
        renderer.createNode({
          x: -100,
          y: 100,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          src: robotImg,
          parent: clipContainerBottomLeft2,
        });

        curX += SQUARE_SIZE + PADDING;

        // ALL SIDES
        const clipAllSides = renderer.createNode({
          x: curX,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0x00ff00ff,
          parent: rowNode,
          clipping: true,
        });
        const clipAllSides2 = renderer.createNode({
          parent: clipAllSides,
        });
        renderer.createNode({
          x: -100,
          y: -100,
          w: SQUARE_SIZE * 2,
          h: SQUARE_SIZE * 2,
          src: robotImg,
          parent: clipAllSides2,
        });

        rowNode.h = SQUARE_SIZE;
        return SQUARE_SIZE;
      },
    },
    {
      title:
        'Nested clipping nodes clip children that are outside of their interesected bounds',
      content: async (rowNode) => {
        let curX = 0;
        /// TOP LEFT
        const clipContainerTopLeft = renderer.createNode({
          x: curX,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0x00ff00ff,
          parent: rowNode,
          clipping: true,
        });
        const clipContainerTopLeft2 = renderer.createNode({
          x: -100,
          y: -100,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0xff0000ff,
          src: robotImg,
          parent: clipContainerTopLeft,
          clipping: true,
        });
        renderer.createNode({
          x: 50,
          y: 50,
          w: SQUARE_SIZE / 2,
          h: SQUARE_SIZE / 2,
          src: robotImg,
          parent: clipContainerTopLeft2,
        });

        curX += SQUARE_SIZE + PADDING;

        /// TOP RIGHT
        const clipContainerTopRight = renderer.createNode({
          x: curX,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0x00ff00ff,
          parent: rowNode,
          clipping: true,
        });
        const clipContainerTopRight2 = renderer.createNode({
          x: -100,
          y: -100,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0xff0000ff,
          src: robotImg,
          parent: clipContainerTopRight,
          clipping: true,
        });
        renderer.createNode({
          x: 150,
          y: 50,
          w: SQUARE_SIZE / 2,
          h: SQUARE_SIZE / 2,
          src: robotImg,
          parent: clipContainerTopRight2,
        });

        curX += SQUARE_SIZE + PADDING;

        /// BOTTOM RIGHT
        const clipContainerBottomRight = renderer.createNode({
          x: curX,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0x00ff00ff,
          parent: rowNode,
          clipping: true,
        });
        const clipContainerBottomRight2 = renderer.createNode({
          x: -100,
          y: -100,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0xff0000ff,
          src: robotImg,
          parent: clipContainerBottomRight,
          clipping: true,
        });
        renderer.createNode({
          x: 150,
          y: 150,
          w: SQUARE_SIZE / 2,
          h: SQUARE_SIZE / 2,
          src: robotImg,
          parent: clipContainerBottomRight2,
        });

        curX += SQUARE_SIZE + PADDING;

        /// BOTTOM LEFT
        const clipContainerBottomLeft = renderer.createNode({
          x: curX,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0x00ff00ff,
          parent: rowNode,
          clipping: true,
        });
        const clipContainerBottomLeft2 = renderer.createNode({
          x: -100,
          y: -100,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0xff0000ff,
          src: robotImg,
          parent: clipContainerBottomLeft,
          clipping: true,
        });
        renderer.createNode({
          x: 50,
          y: 150,
          w: SQUARE_SIZE / 2,
          h: SQUARE_SIZE / 2,
          src: robotImg,
          parent: clipContainerBottomLeft2,
        });

        curX += SQUARE_SIZE + PADDING;

        // ALL SIDES
        const clipContainerAllSides = renderer.createNode({
          x: curX,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0x00ff00ff,
          parent: rowNode,
          clipping: true,
        });
        const clipContainerAllSides2 = renderer.createNode({
          x: -100,
          y: -100,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0xff0000ff,
          src: robotImg,
          parent: clipContainerAllSides,
          clipping: true,
        });
        renderer.createNode({
          x: 50,
          y: 50,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          src: robotImg,
          parent: clipContainerAllSides2,
        });
        return SQUARE_SIZE;
      },
    },
    {
      title:
        'Canvas text clips ANCESTOR text node children that is outside of its bounds',
      content: async (rowNode) => {
        const curX = 0;

        const parent = renderer.createNode({
          x: curX,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          parent: rowNode,
          clipping: true,
        });

        renderer.createTextNode({
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          parent,
          fontFamily: 'Canvas-Ubuntu',
          fontSize: 40,
          color: 0x000000ff,
          text: 'Canvas ancestor clipping',
        });

        return SQUARE_SIZE;
      },
    },
    {
      title:
        'SDF text clips ANCESTOR text node children that is outside of its bounds',
      content: async (rowNode) => {
        const curX = 0;

        const parent = renderer.createNode({
          x: curX,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          parent: rowNode,
          clipping: true,
        });

        renderer.createTextNode({
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          parent,
          fontFamily: 'SDF-Ubuntu',
          fontSize: 40,
          color: 0x000000ff,
          text: 'SDF ancestor clipping',
        });

        return SQUARE_SIZE;
      },
    },
    {
      title: 'Clipping bounds are scaled with the `scale` property',
      content: async (rowNode) => {
        let curX = 0;

        const containerProps = {
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          parent: rowNode,
          color: 0x00ff00ff,
          clipping: true,
        } satisfies Partial<INodeProps>;

        const clippingParentProps = {
          mount: 0.5,
          x: SQUARE_SIZE / 2,
          y: SQUARE_SIZE / 2,
          w: SQUARE_SIZE / 2,
          h: SQUARE_SIZE / 2,
          clipping: true,
          // rotation: Math.PI / 4
        } satisfies Partial<INodeProps>;

        const clippingChildProps = {
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          mount: 0.5,
          src: robotImg,
        } satisfies Partial<INodeProps>;

        const container = renderer.createNode({
          ...containerProps,
          x: curX,
        });

        const clippingParent = renderer.createNode({
          ...clippingParentProps,
          parent: container,
        });

        renderer.createNode({
          ...clippingChildProps,
          parent: clippingParent,
        });

        curX += SQUARE_SIZE + PADDING;

        const dim = await waitForLoadedDimensions(
          renderer.createTextNode({
            mountY: 0.5,
            x: curX,
            y: SQUARE_SIZE / 2,
            forceLoad: true,
            text: 'scale 2 >',
            parent: rowNode,
          }),
        );

        curX += dim.w + PADDING;

        const container2 = renderer.createNode({
          ...containerProps,
          x: curX,
        });

        const clippingParent2 = renderer.createNode({
          ...clippingParentProps,
          parent: container2,
          scale: 2,
        });

        renderer.createNode({
          ...clippingChildProps,
          parent: clippingParent2,
        });

        curX += SQUARE_SIZE + PADDING;

        curX += dim.w + PADDING;

        const container3 = renderer.createNode({
          ...containerProps,
          x: curX,
        });

        const clippingParent3 = renderer.createNode({
          ...clippingParentProps,
          parent: container3,
          scale: 2,
          pivot: 0,
        });

        renderer.createNode({
          ...clippingChildProps,
          parent: clippingParent3,
        });

        curX += SQUARE_SIZE + PADDING;

        curX += dim.w + PADDING;

        const container4 = renderer.createNode({
          ...containerProps,
          x: curX,
        });

        const clippingParent4 = renderer.createNode({
          ...clippingParentProps,
          parent: container4,
          scale: 2,
          pivot: 1,
        });

        renderer.createNode({
          ...clippingChildProps,
          parent: clippingParent4,
        });

        return SQUARE_SIZE;
      },
    },
    {
      title: 'Clipping is automatically disabled when node is rotated',
      content: async (rowNode) => {
        let curX = 0;

        const containerProps = {
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          parent: rowNode,
          color: 0x00ff00ff,
          clipping: true,
        } satisfies Partial<INodeProps>;

        const clippingParentProps = {
          mount: 0.5,
          x: SQUARE_SIZE / 2,
          y: SQUARE_SIZE / 2,
          w: SQUARE_SIZE / 2,
          h: SQUARE_SIZE / 2,
          clipping: true,
        } satisfies Partial<INodeProps>;

        const clippingChildProps = {
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          mount: 0.5,
          src: robotImg,
        } satisfies Partial<INodeProps>;

        const container = renderer.createNode({
          ...containerProps,
          x: curX,
        });

        const clippingParent = renderer.createNode({
          ...clippingParentProps,
          parent: container,
        });

        renderer.createNode({
          ...clippingChildProps,
          parent: clippingParent,
        });

        curX += SQUARE_SIZE + PADDING;

        const dimensions = await waitForLoadedDimensions(
          renderer.createTextNode({
            mountY: 0.5,
            forceLoad: true,
            x: curX,
            y: SQUARE_SIZE / 2,
            text: 'rotate 45 degrees >',
            parent: rowNode,
          }),
        );

        curX += dimensions.w + PADDING;

        const container2 = renderer.createNode({
          ...containerProps,
          x: curX,
        });

        const clippingParent2 = renderer.createNode({
          ...clippingParentProps,
          parent: container2,
          rotation: deg2Rad(45),
        });

        renderer.createNode({
          ...clippingChildProps,
          parent: clippingParent2,
        });

        return SQUARE_SIZE;
      },
    },
  ]);

  return pageContainer;
}
