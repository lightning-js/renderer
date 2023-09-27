import type {
  INode,
  INodeWritableProps,
  ITextNode,
  RendererMain,
} from '@lightningjs/renderer';
import { Component } from './Component.js';

const TITLE_FONT_SIZE = 40;
const PADDING = 20;

interface PageContainerProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  parent?: INode | null;
  color?: number;

  //
  title?: string;
}

export class PageContainer extends Component {
  private titleNode: ITextNode;
  private pageNumberNode: ITextNode;
  private curPageNode: INode | null = null;
  private curPageIndex = -1;
  private pageConstructors: ((page: INode) => Promise<void>)[] = [];

  constructor(renderer: RendererMain, props: PageContainerProps) {
    super(renderer, {
      x: props.x,
      y: props.y,
      color: props.color ?? 0x00000000,
      width: props.width,
      height: props.height,
      parent: props.parent,
    });

    this.titleNode = renderer.createTextNode({
      fontFamily: 'Ubuntu',
      fontSize: TITLE_FONT_SIZE,
      x: PADDING,
      y: PADDING,
      parent: renderer.root,
      text: props.title ?? '',
    });

    this.pageNumberNode = renderer.createTextNode({
      fontFamily: 'Ubuntu',
      fontSize: 30,
      x: PADDING,
      y: this.node.height - 30 - PADDING,
      parent: renderer.root,
    });
  }

  pushPage(pageConstructor: (page: INode) => Promise<void>) {
    this.pageConstructors.push(pageConstructor);
  }

  finalizePages() {
    if (this.curPageIndex === -1 && this.pageConstructors.length > 0) {
      this.setPage(0).catch(console.error);
    }
  }

  async setPage(pageIndex: number) {
    this.pageNumberNode.text = `Page ${pageIndex + 1}/${
      this.pageConstructors.length
    }`;
    this.curPageIndex = pageIndex;

    if (this.curPageNode) {
      this.curPageNode.destroy();
      this.curPageNode = null;
    }

    this.curPageNode = this.renderer.createNode({
      x: PADDING,
      y: TITLE_FONT_SIZE + PADDING,
      color: 0x00000000,
      width: this.contentWidth,
      height: this.contentHeight,
      parent: this.node,
    });

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await this.pageConstructors[pageIndex]!(this.curPageNode);
  }

  bindWindowKeys() {
    window.addEventListener('keydown', (e) => {
      const numPages = this.pageConstructors.length;
      if (e.key === 'ArrowLeft') {
        const newPageIndex = (this.curPageIndex + numPages - 1) % numPages;
        this.setPage(newPageIndex).catch(console.error);
      } else if (e.key === 'ArrowRight') {
        const newPageIndex = (this.curPageIndex + 1) % numPages;
        this.setPage(newPageIndex).catch(console.error);
      }
    });
    // Once we've bound keys for the first time, turn this method into a noop
    this.bindWindowKeys = () => {
      /* noop */
    };
  }

  get contentHeight() {
    return this.node.height - TITLE_FONT_SIZE - PADDING * 2;
  }

  get contentWidth() {
    return this.node.width - PADDING * 2;
  }

  get padding() {
    return PADDING;
  }
}
