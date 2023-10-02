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

const SQUARE_SIZE = 200;
const PADDING = 20;

export default async function ({
  testName,
  renderer,
  appDimensions,
}: ExampleSettings) {
  const pageContainer = new PageContainer(renderer, {
    width: appDimensions.width,
    height: appDimensions.height,
    parent: renderer.root,
    title: 'Clipping Tests',
    testName,
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
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          color: 0x00ff00ff,
          parent: rowNode,
          clipping: true,
        });
        renderer.createNode({
          x: -100,
          y: -100,
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          color: 0xff0000ff,
          parent: clipContainerTopLeft,
        });

        curX += SQUARE_SIZE + PADDING;

        /// TOP RIGHT
        const clipContainerTopRight = renderer.createNode({
          x: curX,
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          color: 0x00ff00ff,
          parent: rowNode,
          clipping: true,
        });
        renderer.createNode({
          x: 100,
          y: -100,
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          color: 0xff0000ff,
          parent: clipContainerTopRight,
        });

        curX += SQUARE_SIZE + PADDING;

        /// BOTTOM RIGHT
        const clipContainerBottomRight = renderer.createNode({
          x: curX,
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          color: 0x00ff00ff,
          parent: rowNode,
          clipping: true,
        });
        renderer.createNode({
          x: 100,
          y: 100,
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          color: 0xff0000ff,
          parent: clipContainerBottomRight,
        });

        curX += SQUARE_SIZE + PADDING;

        /// BOTTOM LEFT
        const clipContainerBottomLeft = renderer.createNode({
          x: curX,
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          color: 0x00ff00ff,
          parent: rowNode,
          clipping: true,
        });
        renderer.createNode({
          x: -100,
          y: 100,
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          color: 0xff0000ff,
          parent: clipContainerBottomLeft,
        });

        curX += SQUARE_SIZE + PADDING;

        // ALL SIDES
        const clipAllSides = renderer.createNode({
          x: curX,
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          color: 0x00ff00ff,
          parent: rowNode,
          clipping: true,
        });
        renderer.createNode({
          x: -100,
          y: -100,
          width: SQUARE_SIZE * 2,
          height: SQUARE_SIZE * 2,
          color: 0xff0000ff,
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
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
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
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          color: 0xff0000ff,
          parent: clipContainerTopLeft2,
        });

        curX += SQUARE_SIZE + PADDING;

        /// TOP RIGHT
        const clipContainerTopRight = renderer.createNode({
          x: curX,
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
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
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          color: 0xff0000ff,
          parent: clipContainerTopRight2,
        });

        curX += SQUARE_SIZE + PADDING;

        /// BOTTOM RIGHT
        const clipContainerBottomRight = renderer.createNode({
          x: curX,
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
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
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          color: 0xff0000ff,
          parent: clipContainerBottomRight2,
        });

        curX += SQUARE_SIZE + PADDING;

        /// BOTTOM LEFT
        const clipContainerBottomLeft = renderer.createNode({
          x: curX,
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
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
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          color: 0xff0000ff,
          parent: clipContainerBottomLeft2,
        });

        curX += SQUARE_SIZE + PADDING;

        // ALL SIDES
        const clipAllSides = renderer.createNode({
          x: curX,
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
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
          width: SQUARE_SIZE * 2,
          height: SQUARE_SIZE * 2,
          color: 0xff0000ff,
          parent: clipAllSides2,
        });

        rowNode.height = SQUARE_SIZE;
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
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          color: 0x00ff00ff,
          parent: rowNode,
          clipping: true,
        });
        const clipContainerTopLeft2 = renderer.createNode({
          x: -100,
          y: -100,
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          color: 0xff0000ff,
          parent: clipContainerTopLeft,
          clipping: true,
        });
        renderer.createNode({
          x: 50,
          y: 50,
          width: SQUARE_SIZE / 2,
          height: SQUARE_SIZE / 2,
          color: 0x0000ffff,
          parent: clipContainerTopLeft2,
        });

        curX += SQUARE_SIZE + PADDING;

        /// TOP RIGHT
        const clipContainerTopRight = renderer.createNode({
          x: curX,
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          color: 0x00ff00ff,
          parent: rowNode,
          clipping: true,
        });
        const clipContainerTopRight2 = renderer.createNode({
          x: -100,
          y: -100,
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          color: 0xff0000ff,
          parent: clipContainerTopRight,
          clipping: true,
        });
        renderer.createNode({
          x: 150,
          y: 50,
          width: SQUARE_SIZE / 2,
          height: SQUARE_SIZE / 2,
          color: 0x0000ffff,
          parent: clipContainerTopRight2,
        });

        curX += SQUARE_SIZE + PADDING;

        /// BOTTOM RIGHT
        const clipContainerBottomRight = renderer.createNode({
          x: curX,
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          color: 0x00ff00ff,
          parent: rowNode,
          clipping: true,
        });
        const clipContainerBottomRight2 = renderer.createNode({
          x: -100,
          y: -100,
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          color: 0xff0000ff,
          parent: clipContainerBottomRight,
          clipping: true,
        });
        renderer.createNode({
          x: 150,
          y: 150,
          width: SQUARE_SIZE / 2,
          height: SQUARE_SIZE / 2,
          color: 0x0000ffff,
          parent: clipContainerBottomRight2,
        });

        curX += SQUARE_SIZE + PADDING;

        /// BOTTOM LEFT
        const clipContainerBottomLeft = renderer.createNode({
          x: curX,
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          color: 0x00ff00ff,
          parent: rowNode,
          clipping: true,
        });
        const clipContainerBottomLeft2 = renderer.createNode({
          x: -100,
          y: -100,
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          color: 0xff0000ff,
          parent: clipContainerBottomLeft,
          clipping: true,
        });
        renderer.createNode({
          x: 50,
          y: 150,
          width: SQUARE_SIZE / 2,
          height: SQUARE_SIZE / 2,
          color: 0x0000ffff,
          parent: clipContainerBottomLeft2,
        });

        curX += SQUARE_SIZE + PADDING;

        // ALL SIDES
        const clipContainerAllSides = renderer.createNode({
          x: curX,
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          color: 0x00ff00ff,
          parent: rowNode,
          clipping: true,
        });
        const clipContainerAllSides2 = renderer.createNode({
          x: -100,
          y: -100,
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          color: 0xff0000ff,
          parent: clipContainerAllSides,
          clipping: true,
        });
        renderer.createNode({
          x: 50,
          y: 50,
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          color: 0x0000ffff,
          parent: clipContainerAllSides2,
        });
        return SQUARE_SIZE;
      },
    },
    {
      title:
        'Canvas text node clips DIRECT text node children that is outside of its bounds',
      content: async (rowNode) => {
        const curX = 0;

        /// Direct
        renderer.createTextNode({
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          parent: rowNode,
          fontFamily: 'Ubuntu',
          fontSize: 40,
          textRendererOverride: 'canvas',
          text: 'Canvas direct clipping',
          clipping: true,
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
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          parent: rowNode,
          clipping: true,
        });

        renderer.createTextNode({
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          parent,
          fontFamily: 'Ubuntu',
          fontSize: 40,
          color: 0x000000ff,
          textRendererOverride: 'canvas',
          text: 'Canvas ancestor clipping',
        });

        return SQUARE_SIZE;
      },
    },
    {
      title:
        'SDF text clips DIRECT text node children that is outside of its bounds',
      content: async (rowNode) => {
        const curX = 0;

        /// Direct
        renderer.createTextNode({
          x: curX,
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          parent: rowNode,
          fontFamily: 'Ubuntu',
          fontSize: 40,
          textRendererOverride: 'sdf',
          text: 'SDF direct clipping',
          clipping: true,
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
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          parent: rowNode,
          clipping: true,
        });

        renderer.createTextNode({
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          parent,
          fontFamily: 'Ubuntu',
          fontSize: 40,
          color: 0x000000ff,
          textRendererOverride: 'sdf',
          text: 'SDF ancestor clipping',
        });

        return SQUARE_SIZE;
      },
    },
  ]);

  pageContainer.bindWindowKeys();
}
