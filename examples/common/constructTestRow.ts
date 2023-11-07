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

import type { INode, RendererMain } from '../../dist/exports/main-api.js';
import { waitForTextDimensions } from './utils.js';

const SQUARE_SIZE = 200;
const PADDING = 20;

export async function constructTestRow(
  renderer: RendererMain,
  rowNode: INode,
  testNodes: (INode | string)[],
): Promise<number> {
  let curX = 0;
  const curY = 0;
  for (const testNode of testNodes) {
    if (typeof testNode === 'string') {
      const dimensions = await waitForTextDimensions(
        renderer.createTextNode({
          mount: 0.5,
          x: curX,
          y: SQUARE_SIZE / 2,
          text: testNode,
          parent: rowNode,
        }),
      );
      curX += dimensions.width + PADDING;
    } else {
      const container = renderer.createNode({
        parent: rowNode,
        color: 0xffffffff,
        width: SQUARE_SIZE,
        height: SQUARE_SIZE,
        clipping: true,
        x: curX,
        y: curY,
      });
      testNode.parent = container;
      curX += SQUARE_SIZE + PADDING;
    }
  }
  return curY + SQUARE_SIZE;
}
