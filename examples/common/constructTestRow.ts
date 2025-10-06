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

import type { INode, ITextNode, RendererMain } from '@lightningjs/renderer';
import { waitForLoadedDimensions } from './utils.js';

const CONTAINER_SIZE = 200;
const PADDING = 20;
const POSITION = null;

export interface TestRowOptions {
  renderer: RendererMain;
  rowNode: INode;
  containerSize?: number;
  containerHeight?: number;
  padding?: number;
  descriptionPosition?: 'top' | 'bottom';
}

export async function constructTestRow(
  options: TestRowOptions,
  testNodes: (INode | ITextNode | string)[],
): Promise<number> {
  const {
    renderer,
    rowNode,
    containerSize = CONTAINER_SIZE,
    containerHeight = containerSize,
    padding = PADDING,
    descriptionPosition = POSITION,
  } = options;
  let curX = 0;
  const curY = 0;
  for (const testNode of testNodes) {
    let textPos =
      descriptionPosition === 'top'
        ? 0
        : descriptionPosition === 'bottom'
        ? containerHeight + padding
        : containerHeight / 2;
    if (typeof testNode === 'string') {
      const dimensions = await waitForLoadedDimensions(
        renderer.createTextNode({
          mountY: descriptionPosition ? 1 : 0.5,
          x: curX,
          y: textPos,
          text: testNode,
          forceLoad: true,
          parent: rowNode,
        }),
      );
      curX += descriptionPosition ? 0 : dimensions.w + padding;
    } else {
      const container = renderer.createNode({
        parent: rowNode,
        color: 0xffffffff,
        w: containerSize,
        h: containerHeight,
        clipping: true,
        x: curX,
        y: curY,
      });
      testNode.parent = container;
      curX += containerSize + padding;
    }
  }
  return curY + containerHeight;
}
