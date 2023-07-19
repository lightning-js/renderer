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
  /**
   * Authored logical pixel width of the application
   *
   * @defaultValue `1920`
   */
  appWidth?: number;

  /**
   * Authored logical pixel height of the application
   *
   * @defaultValue `1080`
   */
  appHeight?: number;

  /**
   * Factor to convert app-authored logical coorindates to device logical coordinates
   *
   * @remarks
   * This value allows auto-scaling to support larger/small resolutions than the
   * app was authored for.
   *
   * If the app was authored for 1920x1080 and this value is 2, the app's canvas
   * will be rendered at 3840x2160 logical pixels.
   *
   * Likewise, if the app was authored for 1920x1080 and this value is 0.66667,
   * the app's canvas will be rendered at 1280x720 logical pixels.
   *
   * @defaultValue `1`
   */
  deviceLogicalPixelRatio?: number;

  /**
   * Factor to convert device logical coordinates to device physical coordinates
   *
   * @remarks
   * This value allows auto-scaling to support devices with different pixel densities.
   *
   * This controls the number of physical pixels that are used to render each logical
   * pixel. For example, if the device has a pixel density of 2, each logical pixel
   * will be rendered using 2x2 physical pixels.
   *
   * By default, it will be set to `window.devicePixelRatio` which is the pixel
   * density of the device the app is running on reported by the browser.
   *
   * @defaultValue `window.devicePixelRatio`
   */
  devicePhysicalPixelRatio?: number;
}

export class RendererMain {
  readonly root: INode | null = null;
  readonly driver: IRenderDriver;
  private canvas: HTMLCanvasElement;
  private settings: Required<RendererMainSettings>;
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
      appWidth: settings.appWidth || 1920,
      appHeight: settings.appHeight || 1080,
      deviceLogicalPixelRatio: settings.deviceLogicalPixelRatio || 1,
      devicePhysicalPixelRatio:
        settings.devicePhysicalPixelRatio || window.devicePixelRatio,
    };
    this.settings = resolvedSettings;

    const {
      appWidth,
      appHeight,
      deviceLogicalPixelRatio,
      devicePhysicalPixelRatio,
    } = resolvedSettings;

    const deviceLogicalWidth = appWidth * deviceLogicalPixelRatio;
    const deviceLogicalHeight = appHeight * deviceLogicalPixelRatio;

    this.driver = driver;

    const canvas = document.createElement('canvas');
    this.canvas = canvas;
    canvas.width = deviceLogicalWidth * devicePhysicalPixelRatio;
    canvas.height = deviceLogicalHeight * devicePhysicalPixelRatio;

    canvas.style.width = `${deviceLogicalWidth}px`;
    canvas.style.height = `${deviceLogicalHeight}px`;

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
    await this.driver.init(this, this.settings, this.canvas);
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
