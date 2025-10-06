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

import type { INode } from '@lightningjs/renderer';
import { assertTruthy } from '@lightningjs/renderer/utils';
import { PageContainer } from './PageContainer.js';

const HEADER_FONT_SIZE = 30;
const PADDING = 20;

export type RowConstructor = (pageNode: INode) => Promise<INode>;
export type RowContentConstructor = (rowNode: INode) => Promise<number>;

export interface TestRowDesc {
  title: string;
  content: RowContentConstructor;
}

export type TestRow = TestRowDesc | null;

function createPageConstructor(curPageRowConstructors: RowConstructor[]) {
  return async function (
    rowConstructors: RowConstructor[],
    pageNode: INode,
  ): Promise<void> {
    let curY = 0;
    for (const rowConstructor of rowConstructors) {
      const rowNode = await rowConstructor(pageNode);
      rowNode.y = curY;
      curY += rowNode.h;
    }
  }.bind(null, curPageRowConstructors);
}

/**
 * Paginate a list of test rows
 *
 * @remarks
 * `null` values in the testRows array will be treated as manual page breaks
 *
 * @param pageContainer
 * @param testRows
 */
export async function paginateTestRows(
  pageContainer: PageContainer,
  testRows: (TestRow | null)[],
) {
  const renderer = pageContainer.renderer;
  assertTruthy(renderer.root);
  let pageCurY = 0;
  let curPageRowConstructors: RowConstructor[] = [];
  let curRowIndex = 0;
  for (const testRow of testRows) {
    const isLastRow = curRowIndex === testRows.length - 1;
    let newRowConstructor: RowConstructor | null =
      testRow &&
      (async (pageNode: INode) => {
        assertTruthy(testRow);
        const rowContainer = renderer.createNode({
          x: 0,
          y: pageCurY,
          w: pageContainer.contentWidth,
          h: 0,
          color: 0x00000000,
          parent: pageNode,
        });
        const rowHeaderNode = renderer.createTextNode({
          fontFamily: 'Ubuntu',
          fontSize: HEADER_FONT_SIZE,
          forceLoad: true,
          y: PADDING,
          parent: rowContainer,
        });
        const rowNode = renderer.createNode({
          y: HEADER_FONT_SIZE + PADDING * 2,
          w: pageContainer.contentWidth,
          h: 0,
          color: 0x00000000,
          parent: rowContainer,
        });
        const rowHeight = await testRow.content(rowNode);
        rowNode.h = rowHeight;
        rowHeaderNode.text = testRow.title;
        rowContainer.h = HEADER_FONT_SIZE + PADDING * 2 + rowNode.h;
        return rowContainer;
      });

    let itFits = false;
    let tmpRowContainer: INode | undefined;
    // debugger;
    if (newRowConstructor) {
      // Construct the row just to get its height
      tmpRowContainer = await newRowConstructor(renderer.root);
      // curPageRowConstructors.push(newRowConstructor);
      // If it fits, add it to the current page
      itFits = pageCurY + tmpRowContainer.h <= pageContainer.contentHeight;
      if (itFits) {
        curPageRowConstructors.push(newRowConstructor);
        pageCurY += tmpRowContainer.h;
        newRowConstructor = null;
      }
    }

    // If it doesn't fit OR it's the last row, add the current page to the page container and start a new page
    if (!itFits || isLastRow) {
      const pageConstructor = createPageConstructor(curPageRowConstructors);
      pageContainer.pushPage(pageConstructor);

      pageCurY = tmpRowContainer?.h || 0;
      curPageRowConstructors = [];
      if (newRowConstructor) {
        curPageRowConstructors.push(newRowConstructor);
      }

      if (isLastRow && !itFits && curPageRowConstructors.length > 0) {
        const pageConstructor = createPageConstructor(curPageRowConstructors);
        pageContainer.pushPage(pageConstructor);
      }
    }
    if (tmpRowContainer) {
      tmpRowContainer.parent = null;
      tmpRowContainer.destroy();
    }

    curRowIndex++;
  }
  pageContainer.finalizePages();
}
