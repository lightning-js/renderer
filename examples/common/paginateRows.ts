import type {
  INode,
  INodeWritableProps,
  RendererMain,
} from '@lightningjs/renderer';
import { Component } from './Component.js';
import { PageContainer } from './PageContainer.js';
import { assertTruthy } from '@lightningjs/renderer/utils';

const HEADER_FONT_SIZE = 30;
const PADDING = 20;

type RowContentConstructor = (rowNode: INode) => Promise<string>;
type RowConstructor = (pageNode: INode) => Promise<INode>;

function createPageConstructor(curPageRowConstructors: RowConstructor[]) {
  return async function (
    rowConstructors: RowConstructor[],
    pageNode: INode,
  ): Promise<void> {
    let curY = 0;
    for (const rowConstructor of rowConstructors) {
      const rowNode = await rowConstructor(pageNode);
      rowNode.y = curY;
      curY += rowNode.height;
    }
  }.bind(null, curPageRowConstructors);
}

export async function paginateRows(
  pageContainer: PageContainer,
  rowContentConstructors: RowContentConstructor[],
) {
  const renderer = pageContainer.renderer;
  assertTruthy(renderer.root);
  let pageCurY = 0;
  let curPageRowConstructors: RowConstructor[] = [];
  let curRowIndex = 0;
  for (const rowContentConstructor of rowContentConstructors) {
    const isLastRow = curRowIndex === rowContentConstructors.length - 1;
    let newRowConstructor: RowConstructor | null = async (pageNode: INode) => {
      const rowContainer = renderer.createNode({
        x: 0,
        y: pageCurY,
        width: pageContainer.contentWidth,
        height: 0,
        color: 0x00000000,
        parent: pageNode,
        clipping: true,
      });
      const rowHeaderNode = renderer.createTextNode({
        fontFamily: 'Ubuntu',
        fontSize: HEADER_FONT_SIZE,
        y: PADDING,
        parent: rowContainer,
      });
      const rowNode = renderer.createNode({
        y: HEADER_FONT_SIZE + PADDING * 2,
        width: pageContainer.contentWidth,
        height: 0,
        color: 0x00000000,
        parent: rowContainer,
      });
      const title = await rowContentConstructor(rowNode);
      rowHeaderNode.text = title;
      rowContainer.height = HEADER_FONT_SIZE + PADDING * 2 + rowNode.height;
      return rowContainer;
    };
    // Construct the row just to get its height
    const tmpRowContainer = await newRowConstructor(renderer.root);
    // curPageRowConstructors.push(newRowConstructor);
    // If it fits, add it to the current page
    const itFits =
      pageCurY + tmpRowContainer.height <= pageContainer.contentHeight;
    if (itFits) {
      curPageRowConstructors.push(newRowConstructor);
      pageCurY += tmpRowContainer.height;
      newRowConstructor = null;
    }
    // If it doesn't fit OR it's the last row, add the current page to the page container and start a new page
    if (!itFits || isLastRow) {
      const pageConstructor = createPageConstructor(curPageRowConstructors);
      pageContainer.pushPage(pageConstructor);

      pageCurY = tmpRowContainer.height;
      curPageRowConstructors = [];
      if (newRowConstructor) {
        curPageRowConstructors.push(newRowConstructor);
      }

      if (isLastRow && !itFits) {
        const pageConstructor = createPageConstructor(curPageRowConstructors);
        pageContainer.pushPage(pageConstructor);
      }
    }
    tmpRowContainer.parent = null;
    tmpRowContainer.destroy();
    curRowIndex++;
  }
  pageContainer.finalizePages();
}
