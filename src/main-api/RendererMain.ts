/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2023 Comcast
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

/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ShaderMap } from '../core/CoreShaderManager.js';
import type {
  ExtractProps,
  TextureMap,
  TextureOptions,
} from '../core/CoreTextureManager.js';
import type {
  INode,
  INodeWritableProps,
  ITextNode,
  ITextNodeWritableProps,
} from './INode.js';
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

/**
 * Configuration settings for {@link RendererMain}
 */
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

  /**
   * RGBA encoded number of the background to use
   *
   * @defaultValue `0x00000000`
   */
  clearColor?: number;

  /**
   * Path to a custom core module to use
   */
  coreExtensionModule?: string | null;
}

/**
 * The Renderer Main API
 *
 * @remarks
 * This is the primary class used to configure and operate the Renderer.
 *
 * It is used to create and destroy Nodes, as well as Texture and Shader
 * references.
 *
 * Example:
 * ```ts
 * import { RendererMain, MainRenderDriver } from '@lightningjs/renderer';
 *
 * // Initialize the Renderer
 * const renderer = new RendererMain(
 *   {
 *     appWidth: 1920,
 *     appHeight: 1080
 *   },
 *   'app',
 *   new MainRenderDriver(),
 * );
 * ```
 */
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

  /**
   * Constructs a new Renderer instance
   *
   * @param settings Renderer settings
   * @param target Element ID or HTMLElement to insert the canvas into
   * @param driver Core Driver to use
   */
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
      clearColor: settings.clearColor ?? 0x00000000,
      coreExtensionModule: settings.coreExtensionModule || null,
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

  /**
   * Initialize the renderer
   *
   * @remarks
   * This method must be called and resolved asyncronously before any other
   * methods are called.
   */
  async init(): Promise<void> {
    await this.driver.init(this, this.settings, this.canvas);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    (this.root as INode) = this.driver.getRootNode();
  }

  /**
   * Create a new scene graph node
   *
   * @remarks
   * A node is the main graphical building block of the Renderer scene graph. It
   * can be a container for other nodes, or it can be a leaf node that renders a
   * solid color, gradient, image, or specific texture, using a specific shader.
   *
   * To create a text node, see {@link createTextNode}.
   *
   * See {@link INode} for more details.
   *
   * @param props
   * @returns
   */
  createNode(props: Partial<INodeWritableProps>): INode {
    return this.driver.createNode(this.resolveNodeDefaults(props));
  }

  /**
   * Create a new scene graph text node
   *
   * @remarks
   * A text node is the second graphical building block of the Renderer scene
   * graph. It renders text using a specific text renderer that is automatically
   * chosen based on the font requested and what type of fonts are installed
   * into an app via a CoreExtension.
   *
   * See {@link ITextNode} for more details.
   *
   * @param props
   * @returns
   */
  createTextNode(props: Partial<ITextNodeWritableProps>): ITextNode {
    return this.driver.createTextNode({
      ...this.resolveNodeDefaults(props),
      text: props.text ?? '',
      textRendererOverride: props.textRendererOverride ?? null,
      fontSize: props.fontSize ?? 16,
      fontFamily: props.fontFamily ?? 'sans-serif',
      fontStyle: props.fontStyle ?? 'normal',
      fontWeight: props.fontWeight ?? 'normal',
      fontStretch: props.fontStretch ?? 'normal',
      textAlign: props.textAlign ?? 'left',
      contain: props.contain ?? 'none',
      scrollable: props.scrollable ?? false,
      scrollY: props.scrollY ?? 0,
      offsetY: props.offsetY ?? 0,
      letterSpacing: props.letterSpacing ?? 0,
      debug: props.debug ?? {},
    });
  }

  /**
   * Resolves the default property values for a Node
   *
   * @remarks
   * This method is used internally by the RendererMain to resolve the default
   * property values for a Node. It is exposed publicly so that it can be used
   * by Core Driver implementations.
   *
   * @param props
   * @returns
   */
  resolveNodeDefaults(props: Partial<INodeWritableProps>): INodeWritableProps {
    const color = props.color ?? 0xffffffff;
    const colorTl = props.colorTl ?? props.colorTop ?? props.colorLeft ?? color;
    const colorTr =
      props.colorTr ?? props.colorTop ?? props.colorRight ?? color;
    const colorBl =
      props.colorBl ?? props.colorBottom ?? props.colorLeft ?? color;
    const colorBr =
      props.colorBr ?? props.colorBottom ?? props.colorRight ?? color;

    return {
      x: props.x ?? 0,
      y: props.y ?? 0,
      width: props.width ?? 0,
      height: props.height ?? 0,
      alpha: props.alpha ?? 1,
      color,
      colorTop: props.colorTop ?? color,
      colorBottom: props.colorBottom ?? color,
      colorLeft: props.colorLeft ?? color,
      colorRight: props.colorRight ?? color,
      colorBl,
      colorBr,
      colorTl,
      colorTr,
      zIndex: props.zIndex ?? 0,
      zIndexLocked: props.zIndexLocked ?? 0,
      parent: props.parent ?? null,
      texture: props.texture ?? null,
      shader: props.shader ?? null,
      // Since setting the `src` will trigger a texture load, we need to set it after
      // we set the texture. Otherwise, problems happen.
      src: props.src ?? '',
      scale: props.scale ?? 1,
      mount: props.mount ?? 0,
      mountX: props.mountX ?? props.mount ?? 0,
      mountY: props.mountY ?? props.mount ?? 0,
      pivot: props.pivot ?? 0.5,
      pivotX: props.pivotX ?? props.pivot ?? 0.5,
      pivotY: props.pivotY ?? props.pivot ?? 0.5,
      rotation: props.rotation ?? 0,
    };
  }

  /**
   * Destroy a node
   *
   * @remarks
   * This method destroys a node but does not destroy its children.
   *
   * @param node
   * @returns
   */
  destroyNode(node: INode) {
    return this.driver.destroyNode(node);
  }

  /**
   * Create a new texture reference
   *
   * @remarks
   * This method creates a new reference to a texture. The texture is not
   * loaded until it is used on a node.
   *
   * It can be assigned to a node's `texture` property, or it can be used
   * when creating a SubTexture.
   *
   * @param textureType
   * @param props
   * @param options
   * @returns
   */
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

  /**
   * Create a new shader reference
   *
   * @remarks
   * This method creates a new reference to a shader. The shader is not
   * loaded until it is used on a Node.
   *
   * It can be assigned to a Node's `shader` property.
   *
   * @param shaderType
   * @param props
   * @returns
   */
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

  /**
   * Get a Node by its ID
   *
   * @param id
   * @returns
   */
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
