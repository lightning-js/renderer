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

import testscreenImg from '../assets/testscreen.png';
import testscreenRImg from '../assets/testscreen_rotated.png';
import type { ExampleSettings } from '../common/ExampleSettings.js';

import { paginateTestRows } from '../common/paginateTestRows.js';
import { PageContainer } from '../common/PageContainer.js';

const SQUARE_SIZE = 600;
const PADDING = 20;

export default async function test(settings: ExampleSettings) {
  const { renderer } = settings;
  const pageContainer = new PageContainer(settings, {
    width: renderer.settings.appWidth,
    height: renderer.settings.appHeight,
    title: 'Resizemode Tests',
  });

  await paginateTestRows(pageContainer, [
    {
      title:
        'Texture Width > Height - resizeMode cover maximum width of node and clipY - 0, 0.5, 1',
      content: async (rowNode) => {
        let curX = 0;

        for (let i = 0; i < 3; i++) {
          renderer.createNode({
            x: curX,
            width: SQUARE_SIZE,
            height: SQUARE_SIZE - 300,
            texture: renderer.createTexture(
              'ImageTexture',
              { src: testscreenImg },
              {
                resizeMode: {
                  type: 'cover',
                  clipY: [0, 0.5, 1][i],
                  clipX: [0, 0.5, 1][i],
                },
              },
            ),
            parent: rowNode,
          });
          curX += SQUARE_SIZE + PADDING;
        }

        rowNode.height = SQUARE_SIZE - 300;
        return rowNode.height;
      },
    },
    {
      title:
        'Texture Width > Height - resizeMode cover maximum height of node and clipX - 0, 0.5, 1',
      content: async (rowNode) => {
        let curX = 0;

        for (let i = 0; i < 3; i++) {
          renderer.createNode({
            x: curX,
            width: SQUARE_SIZE,
            height: SQUARE_SIZE - 200,
            texture: renderer.createTexture(
              'ImageTexture',
              { src: testscreenImg },
              {
                resizeMode: {
                  type: 'cover',
                  clipY: [0, 0.5, 1][i],
                  clipX: [0, 0.5, 1][i],
                },
              },
            ),
            parent: rowNode,
          });
          curX += SQUARE_SIZE + PADDING;
        }

        rowNode.height = SQUARE_SIZE - 200;
        return rowNode.height;
      },
    },
    {
      title:
        'Texture Width < Height - resizeMode cover maximum width of node and clipY - 0, 0.5, 1',
      content: async (rowNode) => {
        let curX = 0;

        for (let i = 0; i < 3; i++) {
          renderer.createNode({
            x: curX,
            width: SQUARE_SIZE,
            height: SQUARE_SIZE - 300,
            texture: renderer.createTexture(
              'ImageTexture',
              { src: testscreenRImg },
              {
                resizeMode: {
                  type: 'cover',
                  clipY: [0, 0.5, 1][i],
                  clipX: [0, 0.5, 1][i],
                },
              },
            ),
            parent: rowNode,
          });
          curX += SQUARE_SIZE + PADDING;
        }

        rowNode.height = SQUARE_SIZE - 300;
        return rowNode.height;
      },
    },
    {
      title:
        'Texture Width < Height - resizeMode cover maximum height of node and clipX - 0,0.25,0.5,0.75,1',
      content: async (rowNode) => {
        let curX = 0;

        for (let i = 0; i < 5; i++) {
          renderer.createNode({
            x: curX,
            width: SQUARE_SIZE - 400,
            height: SQUARE_SIZE - 100,
            texture: renderer.createTexture(
              'ImageTexture',
              { src: testscreenRImg },
              {
                resizeMode: {
                  type: 'cover',
                  clipX: [0, 0.25, 0.5, 0.75, 1][i],
                  clipY: [0, 0.25, 0.5, 0.75, 1][i],
                },
              },
            ),
            parent: rowNode,
          });
          curX += SQUARE_SIZE + PADDING - 330;
        }

        rowNode.height = SQUARE_SIZE - 200;
        return rowNode.height;
      },
    },

    {
      title:
        'Texture Width > Height resizeMode contain, maximimum width of node',
      content: async (rowNode) => {
        let curX = 0;
        const mountPosition = 0.5;
        const container1 = renderer.createNode({
          x: curX,
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          color: 0x333333ff,
          parent: rowNode,
        });

        renderer.createNode({
          x: curX,
          y: SQUARE_SIZE / 2,
          mountY: mountPosition,
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          texture: renderer.createTexture(
            'ImageTexture',
            { src: testscreenImg },
            {
              resizeMode: {
                type: 'contain',
              },
            },
          ),
          parent: container1,
        });

        curX += SQUARE_SIZE + PADDING;

        const container2 = renderer.createNode({
          x: curX,
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          color: 0x333333ff,
          parent: rowNode,
        });

        renderer.createNode({
          x: SQUARE_SIZE / 2,
          mountX: mountPosition,
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          texture: renderer.createTexture(
            'ImageTexture',
            { src: testscreenRImg },
            {
              resizeMode: {
                type: 'contain',
              },
            },
          ),
          parent: container2,
        });

        rowNode.height = SQUARE_SIZE;
        return rowNode.height;
      },
    },
  ]);

  return pageContainer;
}
