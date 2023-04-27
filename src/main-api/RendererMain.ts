/* eslint-disable @typescript-eslint/no-unused-vars */
import type { INode, INodeWritableProps } from '../core/INode.js';
import type { IRenderDriver } from './IRenderDriver.js';

export interface RendererMainSettings {
  width?: number;
  height?: number;
}

export class RendererMain {
  readonly root: INode;
  readonly driver: IRenderDriver;
  private canvas: HTMLCanvasElement;
  private settings: Required<RendererMainSettings>;
  canvasDimensions: { width: number; height: number } = {
    width: 800,
    height: 600,
  };
  private nodes: Map<number, INode> = new Map();

  constructor(
    settings: RendererMainSettings,
    target: string | HTMLElement,
    driver: IRenderDriver,
  ) {
    const resolvedSettings: Required<RendererMainSettings> = {
      width: settings.width || 1920,
      height: settings.height || 1080,
    };
    this.settings = resolvedSettings;
    this.driver = driver;

    const canvas = document.createElement('canvas');
    this.canvas = canvas;
    canvas.width = resolvedSettings.width;
    canvas.height = resolvedSettings.height;

    let targetEl: HTMLElement | null;
    if (typeof target === 'string') {
      targetEl = document.getElementById(target);
    } else {
      targetEl = target;
    }

    if (!targetEl) {
      throw new Error('Could not find target element');
    }

    this.root = this.driver.getRootNode();
    this.nodes.set(this.root.id, this.root);

    // Hook up the driver's callbacks
    driver.onCreateNode = (node) => {
      this.nodes.set(node.id, node);
    };

    driver.onDestroyNode = (node) => {
      this.nodes.delete(node.id);
    };

    targetEl.appendChild(canvas);
  }

  async init(): Promise<void> {
    await this.driver.init(this.canvas);
  }

  createNode(props: Partial<INodeWritableProps>): INode {
    return this.driver.createNode(props);
  }

  destroyNode(node: INode) {
    return this.driver.destroyNode(node);
  }

  toggleFreeze() {
    throw new Error('Not implemented');
  }

  advanceFrame() {
    throw new Error('Not implemented');
  }

  /**
   * Re-render the current frame without advancing any running animations.
   *
   * @remarks
   * Any state changes will be reflected in the re-rendered frame. Useful for
   * debugging.
   *
   * May not do anything if the render loop is running on a separate thread.
   */
  rerender() {
    throw new Error('Not implemented');
  }
}
