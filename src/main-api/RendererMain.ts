/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ShaderMap } from '../core/CoreShaderManager.js';
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
export interface TextureDesc<
  TxType extends keyof TextureMap = keyof TextureMap,
> {
  readonly descType: 'texture';
  readonly txType: TxType;
  readonly props: ExtractProps<TextureMap[TxType]>;
  readonly options?: Readonly<TextureOptions>;
}

export interface ShaderDesc<ShType extends keyof ShaderMap = keyof ShaderMap> {
  readonly descType: 'shader';
  readonly shType: ShType;
  readonly props: ExtractProps<ShaderMap[ShType]>;
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

  private textureRegistry = new FinalizationRegistry(
    (textureDescId: number) => {
      this.driver.releaseTexture(textureDescId);
    },
  );

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
    await this.driver.init(this, this.canvas);
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
    props: TextureDesc<Type>['props'],
    options?: TextureOptions,
  ): TextureDesc<Type> {
    const id = this.nextTextureId++;
    const desc: TextureDesc<Type> = {
      descType: 'texture',
      txType: textureType,
      props,
      options: {
        ...options,
        // This ID is used to identify the texture in the CoreTextureManager's
        // ID Texture Map cache.
        id,
      },
    };
    this.textureRegistry.register(desc, id);
    return desc;
  }

  makeShader<ShType extends keyof ShaderMap>(
    shaderType: ShType,
    props?: ShaderDesc<ShType>['props'],
  ): ShaderDesc<ShType> {
    return {
      descType: 'shader',
      shType: shaderType,
      props: props as ShaderDesc<ShType>['props'],
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
