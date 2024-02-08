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
import { Component } from './Component.js';
import { loadStorage, saveStorage } from '../common/LocalStorage.js';
import type { ExampleSettings } from './ExampleSettings.js';

interface PageContainerLocalStorageData {
  curPage: number;
}

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
  private settings: ExampleSettings;

  constructor(settings: ExampleSettings, props: PageContainerProps) {
    const { renderer } = settings;
    super(renderer, {
      x: props.x,
      y: props.y,
      color: props.color ?? 0x00000000,
      width: props.width,
      height: props.height,
      parent: props.parent ? props.parent : settings.testRoot,
    });

    this.titleNode = renderer.createTextNode({
      fontFamily: 'Ubuntu',
      fontSize: TITLE_FONT_SIZE,
      x: PADDING,
      y: PADDING,
      parent: this.node,
      text: props.title ?? '',
    });

    this.settings = settings;

    this.pageNumberNode = renderer.createTextNode({
      fontFamily: 'Ubuntu',
      fontSize: 30,
      x: PADDING,
      y: this.node.height - 30 - PADDING,
      parent: this.node,
    });
  }

  pushPage(pageConstructor: (page: INode) => Promise<void>) {
    this.pageConstructors.push(pageConstructor);
  }

  finalizePages() {
    if (this.curPageIndex === -1 && this.pageConstructors.length > 0) {
      const { automation, testName } = this.settings;
      let pageNum = 0;
      if (!automation) {
        const savedState = loadStorage<PageContainerLocalStorageData>(
          `${testName}-PageContainer`,
        );
        if (
          savedState &&
          savedState.curPage &&
          savedState.curPage < this.pageConstructors.length
        ) {
          pageNum = savedState.curPage;
        }
        this.bindWindowKeys();
      }
      this.setPage(pageNum).catch(console.error);
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

    const { automation, testName } = this.settings;
    if (!automation) {
      saveStorage<PageContainerLocalStorageData>(`${testName}-PageContainer`, {
        curPage: pageIndex,
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await this.pageConstructors[pageIndex]!(this.curPageNode);
  }

  /**
   * Performs an automation run of all the pages in this container.
   */
  async snapshotPages() {
    if (!this.settings.automation) {
      throw new Error('Cannot snapshot pages when not in automation mode');
    }
    for (let i = 0; i < this.pageConstructors.length; i++) {
      await this.setPage(i);
      await this.settings.snapshot();
    }
  }

  private bindWindowKeys() {
    window.addEventListener('keydown', (e) => {
      const numPages = this.pageConstructors.length;
      if (e.key === 'ArrowLeft') {
        const newPageIndex = (this.curPageIndex + numPages - 1) % numPages;
        this.setPage(newPageIndex).catch(console.error);
      } else if (e.key === 'ArrowRight') {
        const newPageIndex = (this.curPageIndex + 1) % numPages;
        this.setPage(newPageIndex).catch(console.error);
      }
      // If a number key is pressed, jump to that page
      const numPressed = parseInt(e.key, 10);
      if (numPressed >= 1 && numPressed <= numPages) {
        this.setPage(numPressed - 1).catch(console.error);
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
