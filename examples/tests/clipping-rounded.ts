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
import robotImg from '../assets/robot/robot.png';

export async function automation(settings: ExampleSettings) {
  await (await test(settings)).snapshotPages();
}

const SQUARE_SIZE = 200;
const PADDING = 20;
const RADIUS = 30;

export default async function test(settings: ExampleSettings) {
  const { renderer } = settings;
  const pageContainer = new PageContainer(settings, {
    w: renderer.settings.appWidth,
    h: renderer.settings.appHeight,
    title: 'Rounded Clipping Tests (WebGL stencil)',
  });

  await paginateTestRows(pageContainer, [
    {
      title:
        'clipRadius clips children to rounded rect - overflow on all 4 sides',
      content: async (rowNode) => {
        let curX = 0;

        // TOP LEFT overflow
        const clipTL = renderer.createNode({
          x: curX,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0x00aa00ff,
          parent: rowNode,
          clipping: true,
          clipRadius: RADIUS,
        });
        renderer.createNode({
          x: -80,
          y: -80,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          src: robotImg,
          parent: clipTL,
        });
        curX += SQUARE_SIZE + PADDING;

        // TOP RIGHT overflow
        const clipTR = renderer.createNode({
          x: curX,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0x00aa00ff,
          parent: rowNode,
          clipping: true,
          clipRadius: RADIUS,
        });
        renderer.createNode({
          x: 80,
          y: -80,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          src: robotImg,
          parent: clipTR,
        });
        curX += SQUARE_SIZE + PADDING;

        // BOTTOM RIGHT overflow
        const clipBR = renderer.createNode({
          x: curX,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0x00aa00ff,
          parent: rowNode,
          clipping: true,
          clipRadius: RADIUS,
        });
        renderer.createNode({
          x: 80,
          y: 80,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          src: robotImg,
          parent: clipBR,
        });
        curX += SQUARE_SIZE + PADDING;

        // BOTTOM LEFT overflow
        const clipBL = renderer.createNode({
          x: curX,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0x00aa00ff,
          parent: rowNode,
          clipping: true,
          clipRadius: RADIUS,
        });
        renderer.createNode({
          x: -80,
          y: 80,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          src: robotImg,
          parent: clipBL,
        });
        curX += SQUARE_SIZE + PADDING;

        // ALL SIDES overflow
        const clipAll = renderer.createNode({
          x: curX,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0x00aa00ff,
          parent: rowNode,
          clipping: true,
          clipRadius: RADIUS,
        });
        renderer.createNode({
          x: -80,
          y: -80,
          w: SQUARE_SIZE * 2,
          h: SQUARE_SIZE * 2,
          src: robotImg,
          parent: clipAll,
        });
        return SQUARE_SIZE;
      },
    },

    {
      title:
        'clipRadius zero falls through to rectangular scissor (regression guard)',
      content: async (rowNode) => {
        let curX = 0;

        const clipRect = renderer.createNode({
          x: curX,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0x0000aaff,
          parent: rowNode,
          clipping: true,
          clipRadius: 0,
        });
        renderer.createNode({
          x: -80,
          y: -80,
          w: SQUARE_SIZE * 2,
          h: SQUARE_SIZE * 2,
          src: robotImg,
          parent: clipRect,
        });
        curX += SQUARE_SIZE + PADDING;

        // clipRadius > 0 same scene for comparison
        const clipRound = renderer.createNode({
          x: curX,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0x00aa00ff,
          parent: rowNode,
          clipping: true,
          clipRadius: RADIUS,
        });
        renderer.createNode({
          x: -80,
          y: -80,
          w: SQUARE_SIZE * 2,
          h: SQUARE_SIZE * 2,
          src: robotImg,
          parent: clipRound,
        });
        return SQUARE_SIZE;
      },
    },

    {
      title: 'Ancestor children clipped to parent rounded rect',
      content: async (rowNode) => {
        let curX = 0;

        const clip = renderer.createNode({
          x: curX,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0x00aa00ff,
          parent: rowNode,
          clipping: true,
          clipRadius: RADIUS,
        });
        // non-clip intermediate node
        const mid = renderer.createNode({
          parent: clip,
        });
        renderer.createNode({
          x: -80,
          y: -80,
          w: SQUARE_SIZE * 2,
          h: SQUARE_SIZE * 2,
          src: robotImg,
          parent: mid,
        });
        curX += SQUARE_SIZE + PADDING;

        // Same with large solid-color child to clearly show corners
        const clip2 = renderer.createNode({
          x: curX,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0x00aa00ff,
          parent: rowNode,
          clipping: true,
          clipRadius: RADIUS,
        });
        renderer.createNode({
          x: -RADIUS,
          y: -RADIUS,
          w: SQUARE_SIZE + RADIUS * 2,
          h: SQUARE_SIZE + RADIUS * 2,
          color: 0xff4400ff,
          parent: clip2,
        });
        return SQUARE_SIZE;
      },
    },

    {
      title: 'Nested rounded clipping - child inside rounded-clip parent',
      content: async (rowNode) => {
        let curX = 0;

        const outer = renderer.createNode({
          x: curX,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0x00aa00ff,
          parent: rowNode,
          clipping: true,
          clipRadius: RADIUS,
        });
        const inner = renderer.createNode({
          x: -60,
          y: -60,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0xff4400ff,
          parent: outer,
          clipping: true,
          clipRadius: RADIUS,
        });
        renderer.createNode({
          x: 40,
          y: 40,
          w: SQUARE_SIZE / 2,
          h: SQUARE_SIZE / 2,
          src: robotImg,
          parent: inner,
        });
        curX += SQUARE_SIZE + PADDING;

        // Same setup - inner with no radius (plain scissor inside stencil)
        const outer2 = renderer.createNode({
          x: curX,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0x00aa00ff,
          parent: rowNode,
          clipping: true,
          clipRadius: RADIUS,
        });
        const inner2 = renderer.createNode({
          x: -60,
          y: -60,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0xff4400ff,
          parent: outer2,
          clipping: true,
          clipRadius: 0,
        });
        renderer.createNode({
          x: 40,
          y: 40,
          w: SQUARE_SIZE / 2,
          h: SQUARE_SIZE / 2,
          src: robotImg,
          parent: inner2,
        });
        return SQUARE_SIZE;
      },
    },

    {
      title: 'clipRadius with Rounded shader on the container node itself',
      content: async (rowNode) => {
        let curX = 0;

        // Node has BOTH clipRadius (clips children) and Rounded shader (visual rounding of its own content)
        const clip = renderer.createNode({
          x: curX,
          w: SQUARE_SIZE,
          h: SQUARE_SIZE,
          color: 0x0044ffff,
          parent: rowNode,
          clipping: true,
          clipRadius: RADIUS,
          shader: renderer.createShader('Rounded', { radius: [RADIUS] }),
        });
        renderer.createNode({
          x: -80,
          y: -80,
          w: SQUARE_SIZE * 2,
          h: SQUARE_SIZE * 2,
          src: robotImg,
          parent: clip,
        });
        return SQUARE_SIZE;
      },
    },
  ]);

  return pageContainer;
}
