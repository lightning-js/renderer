/* eslint-disable @typescript-eslint/no-unused-vars */
import type {
  ExtractProps,
  TextureMap,
  TextureOptions,
} from '../core/CoreTextureManager.js';
import type { INode, INodeWritableProps } from './INode.js';
import type { IRenderDriver } from './IRenderDriver.js';

/**
 * A description of a Texture
 *
 * @remarks
 * This structure should only be created by the RendererMain's `makeTexture`
 * method. The structure is immutable and should not be modified once created.
 */
export interface TextureDesc {
  readonly descType: 'texture';
  readonly txType: keyof TextureMap;
  readonly props: unknown;
  readonly options?: Readonly<TextureOptions>;
}

export interface RendererMainSettings {
  width?: number;
  height?: number;
}

export class RendererMain {
  readonly root: INode | null = null;
  readonly driver: IRenderDriver;
  private canvas: HTMLCanvasElement;
  private settings: Required<RendererMainSettings>;
  canvasDimensions: { width: number; height: number } = {
    width: 800,
    height: 600,
  };
  private nodes: Map<number, INode> = new Map();
  private nextTextureId = 1;

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

    // Hook up the driver's callbacks
    driver.onCreateNode = (node) => {
      this.nodes.set(node.id, node);
    };

    driver.onBeforeDestroyNode = (node) => {
      this.nodes.delete(node.id);
    };

    targetEl.appendChild(canvas);
  }

  async init(): Promise<void> {
    await this.driver.init(this.canvas);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    (this.root as INode) = this.driver.getRootNode();
  }

  createNode(props: Partial<INodeWritableProps>): INode {
    return this.driver.createNode(props);
  }

  destroyNode(node: INode) {
    return this.driver.destroyNode(node);
  }

  makeTexture<Type extends keyof TextureMap>(
    textureType: Type,
    props: ExtractProps<TextureMap[Type]>,
    options?: TextureOptions,
  ): TextureDesc {
    return {
      descType: 'texture',
      txType: textureType,
      props,
      options: {
        ...options,
        // This ID is used to identify the texture in the CoreTextureManager's
        // ID cache.
        id: this.nextTextureId++,
      },
    };
  }

  getNodeById(id: number): INode | null {
    return this.nodes.get(id) || null;
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
   * May not do anything if the render loop is running on a separate worker.
   */
  rerender() {
    throw new Error('Not implemented');
  }
}
