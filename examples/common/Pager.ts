import type { INode, RendererMain } from '@lightningjs/renderer';
import { Component } from './Component.js';

export default class Pager extends Component {
  currentIndex = 0;
  currentPage: INode | null = null;
  pages: INode[] = [];

  constructor(renderer: RendererMain, parent: INode, pages: INode[]) {
    super(renderer, {
      w: 1920,
      h: 1080,
      parent,
    });

    this.pages = pages;
    this.setPage(this.currentIndex);
    this.addKeyboardNavigation();
  }

  setPage(index: number) {
    if (this.currentPage) {
      this.currentPage.parent = null;
    }
    if (this.pages[index] !== undefined) {
      this.currentPage = this.pages[index];
      this.currentPage.parent = this.node;
    }
    return true;
  }

  async nextPage(fromKeyboard = false) {
    if (fromKeyboard === false && this.currentIndex === this.pages.length - 1) {
      return false;
    }
    if (fromKeyboard === true) {
      this.currentIndex = (this.currentIndex + 1) % this.pages.length;
    } else {
      this.currentIndex = Math.min(
        this.pages.length - 1,
        this.currentIndex + 1,
      );
    }
    this.setPage(this.currentIndex);
    return true;
  }

  async previousPage(fromKeyboard = false) {
    if (fromKeyboard === false && this.currentIndex === 0) {
      return false;
    }
    if (fromKeyboard === true) {
      this.currentIndex =
        (this.currentIndex - 1 + this.pages.length) % this.pages.length;
    } else {
      this.currentIndex = Math.max(0, this.currentIndex - 1);
    }
    this.setPage(this.currentIndex);
    return true;
  }

  addKeyboardNavigation() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') {
        this.nextPage(true);
      } else if (e.key === 'ArrowLeft') {
        this.previousPage(true);
      }
    });
  }
}
