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
import { type ManualCountTextureUsageTrackerOptions } from './texture-usage-trackers/ManualCountTextureUsageTracker.js';
import { EventEmitter } from '../common/EventEmitter.js';
import { Inspector } from './Inspector.js';
import { loadCoreExtension, santizeCustomDataMap } from './utils.js';
import { assertTruthy, isProductionEnvironment } from '../utils.js';
import {
  Stage,
  type StageFpsUpdateHandler,
  type StageFrameTickHandler,
} from '../core/Stage.js';
import { getNewId } from '../utils.js';
import { CoreNode } from '../core/CoreNode.js';
import { CoreTextNode } from '../core/CoreTextNode.js';
import {
  TextureTrackerMain,
  type SpecificTextureRef,
} from './texture-usage-trackers/TextureTrackerMain.js';

/**
 * An immutable reference to a specific Shader type
 *
 * @remarks
 * See {@link ShaderRef} for more details.
 */
export interface SpecificShaderRef<ShType extends keyof ShaderMap> {
  readonly descType: 'shader';
  readonly shType: ShType;
  readonly props: ExtractProps<ShaderMap[ShType]>;
}

type MapShaderRefs<ShType extends keyof ShaderMap> =
  ShType extends keyof ShaderMap ? SpecificShaderRef<ShType> : never;

/**
 * An immutable reference to a Shader
 *
 * @remarks
 * This structure should only be created by the RendererMain's `createShader`
 * method. The structure is immutable and should not be modified once created.
 *
 * A `ShaderRef` exists in the Main API Space and is used to point to an actual
 * `Shader` instance in the Core API Space. The `ShaderRef` is used to
 * communicate with the Core API Space to create, load, and destroy the
 * `Shader` instance.
 *
 * This type is technically a discriminated union of all possible shader types.
 * If you'd like to represent a specific shader type, you can use the
 * `SpecificShaderRef` generic type.
 */
export type ShaderRef = MapShaderRefs<keyof ShaderMap>;

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
   * Texture Memory Byte Threshold
   *
   * @remarks
   * When the amount of GPU VRAM used by textures exceeds this threshold,
   * the Renderer will free up all the textures that are current not visible
   * within the configured `boundsMargin`.
   *
   * When set to `0`, the threshold-based texture memory manager is disabled.
   */
  txMemByteThreshold?: number;

  /**
   * Bounds margin to extend the boundary in which a CoreNode is added as Quad.
   */
  boundsMargin?: number | [number, number, number, number];

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
   *
   * @defaultValue `null`
   */
  coreExtensionModule?: string | null;

  /**
   * Enable experimental FinalizationRegistry-based texture usage tracking
   * for texture garbage collection
   *
   * @remarks
   * By default, the Renderer uses a manual reference counting system to track
   * texture usage. Textures are eventually released from the Core Texture
   * Manager's Usage Cache when they are no longer referenced by any Nodes (or
   * SubTextures that are referenced by nodes). This works well enough, but has
   * the consequence of textures being removed from Usage Cache even if their
   * references are still alive in memory. This can require a texture to be
   * reloaded from the source when it is used again after being removed from
   * cache.
   *
   * This is an experimental feature that uses a FinalizationRegistry to track
   * texture usage. This causes textures to be removed from the Usage Cache only
   * when their references are no longer alive in memory. Meaning a loaded texture
   * will remain in the Usage Cache until it's reference is garbage collected.
   *
   * This feature is not enabled by default because browser support for the
   * FinalizationRegistry is limited. It should NOT be enabled in production apps
   * as this behavior is not guaranteed to be supported in the future. Developer
   * feedback on this feature, however, is welcome.
   *
   * @defaultValue `false`
   */
  experimental_FinalizationRegistryTextureUsageTracker?: boolean;

  textureCleanupOptions?: ManualCountTextureUsageTrackerOptions;

  /**
   * Interval in milliseconds to receive FPS updates
   *
   * @remarks
   * If set to `0`, FPS updates will be disabled.
   *
   * @defaultValue `0` (disabled)
   */
  fpsUpdateInterval?: number;

  /**
   * Include context call (i.e. WebGL) information in FPS updates
   *
   * @remarks
   * When enabled the number of calls to each context method over the
   * `fpsUpdateInterval` will be included in the FPS update payload's
   * `contextSpyData` property.
   *
   * Enabling the context spy has a serious impact on performance so only use it
   * when you need to extract context call information.
   *
   * @defaultValue `false` (disabled)
   */
  enableContextSpy?: boolean;

  /**
   * Number or Image Workers to use
   *
   * @remarks
   * On devices with multiple cores, this can be used to improve image loading
   * as well as reduce the impact of image loading on the main thread.
   * Set to 0 to disable image workers.
   *
   * @defaultValue `2`
   */
  numImageWorkers?: number;

  /**
   * Enable inspector
   *
   * @remarks
   * When enabled the renderer will spawn a inspector. The inspector will
   * replicate the state of the Nodes created in the renderer and allow
   * inspection of the state of the nodes.
   *
   * @defaultValue `false` (disabled)
   */
  enableInspector?: boolean;

  /**
   * Renderer mode
   */
  renderMode?: 'webgl' | 'canvas';
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
 * import { RendererMain, MainCoreDriver } from '@lightningjs/renderer';
 *
 * // Initialize the Renderer
 * const renderer = new RendererMain(
 *   {
 *     appWidth: 1920,
 *     appHeight: 1080
 *   },
 *   'app',
 *   new MainCoreDriver(),
 * );
 * ```
 */
export class RendererMain extends EventEmitter {
  public root: CoreNode | null = null;
  readonly canvas: HTMLCanvasElement;
  private stage: Stage | null = null;
  readonly settings: Readonly<Required<RendererMainSettings>>;
  private inspector: Inspector | null = null;
  private textureTracker: TextureTrackerMain | null = null;

  /**
   * Constructs a new Renderer instance
   *
   * @param settings Renderer settings
   * @param target Element ID or HTMLElement to insert the canvas into
   * @param driver Core Driver to use
   */
  constructor(settings: RendererMainSettings, target: string | HTMLElement) {
    super();
    const resolvedSettings: Required<RendererMainSettings> = {
      appWidth: settings.appWidth || 1920,
      appHeight: settings.appHeight || 1080,
      txMemByteThreshold: settings.txMemByteThreshold || 124e6,
      boundsMargin: settings.boundsMargin || 0,
      deviceLogicalPixelRatio: settings.deviceLogicalPixelRatio || 1,
      devicePhysicalPixelRatio:
        settings.devicePhysicalPixelRatio || window.devicePixelRatio,
      clearColor: settings.clearColor ?? 0x00000000,
      coreExtensionModule: settings.coreExtensionModule || null,
      experimental_FinalizationRegistryTextureUsageTracker:
        settings.experimental_FinalizationRegistryTextureUsageTracker ?? false,
      textureCleanupOptions: settings.textureCleanupOptions || {},
      fpsUpdateInterval: settings.fpsUpdateInterval || 0,
      numImageWorkers:
        settings.numImageWorkers !== undefined ? settings.numImageWorkers : 2,
      enableContextSpy: settings.enableContextSpy ?? false,
      enableInspector: settings.enableInspector ?? false,
      renderMode: settings.renderMode ?? 'webgl',
    };
    this.settings = resolvedSettings;

    const {
      appWidth,
      appHeight,
      deviceLogicalPixelRatio,
      devicePhysicalPixelRatio,
      enableInspector,
    } = resolvedSettings;

    // const useFinalizationRegistryTracker =
    //   resolvedSettings.experimental_FinalizationRegistryTextureUsageTracker &&
    //   typeof FinalizationRegistry === 'function';
    // });
    // this.textureTracker = useFinalizationRegistryTracker
    //   ? new FinalizationRegistryTextureUsageTracker(releaseCallback)
    //   : new ManualCountTextureUsageTracker(
    //       releaseCallback,
    //       this.settings.textureCleanupOptions,
    //     );

    const deviceLogicalWidth = appWidth * deviceLogicalPixelRatio;
    const deviceLogicalHeight = appHeight * deviceLogicalPixelRatio;

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

    targetEl.appendChild(canvas);

    if (enableInspector && !isProductionEnvironment()) {
      this.inspector = new Inspector(canvas, resolvedSettings);
    }
  }

  /**
   * Initialize the renderer
   *
   * @remarks
   * This method must be called and resolved asyncronously before any other
   * methods are called.
   */
  async init(): Promise<void> {
    this.stage = new Stage({
      rootId: getNewId(),
      appWidth: this.settings.appWidth,
      appHeight: this.settings.appHeight,
      boundsMargin: this.settings.boundsMargin,
      clearColor: this.settings.clearColor,
      canvas: this.canvas,
      debug: {
        monitorTextureCache: false,
      },
      deviceLogicalPixelRatio: this.settings.deviceLogicalPixelRatio,
      devicePhysicalPixelRatio: this.settings.devicePhysicalPixelRatio,
      enableContextSpy: this.settings.enableContextSpy,
      fpsUpdateInterval: this.settings.fpsUpdateInterval,
      numImageWorkers: this.settings.numImageWorkers,
      renderMode: this.settings.renderMode,
      txMemByteThreshold: this.settings.txMemByteThreshold,
    });

    assertTruthy(this.stage);

    this.root = this.stage.root;

    // Load the Core Extension Module if one was specified.
    if (this.settings.coreExtensionModule) {
      await loadCoreExtension(this.settings.coreExtensionModule, this.stage);
    }

    this.textureTracker = new TextureTrackerMain(this.stage, {
      useFinalizationRegistryTracker:
        this.settings.experimental_FinalizationRegistryTextureUsageTracker,
      textureCleanupOptions: this.settings.textureCleanupOptions,
    });

    //FIXME add these back
    // Forward fpsUpdate events from the stage to RendererMain
    this.stage.on('fpsUpdate', ((stage, fpsData) => {
      // this.onFpsUpdate(fpsData);
      this.emit('fpsUpdate', fpsData);
    }) satisfies StageFpsUpdateHandler);

    this.stage.on('frameTick', ((stage, frameTickData) => {
      this.emit('frameTick', frameTickData);
    }) satisfies StageFrameTickHandler);

    this.stage.on('idle', () => {
      this.emit('idle');
    });
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
  createNode(props: Partial<INodeWritableProps>): CoreNode {
    // FIXME
    // if (this.inspector) {
    //   return this.inspector.createNode(
    //     this.resolveNodeDefaults(props),
    //   );
    // }

    assertTruthy(this.stage, 'Stage is not initialized');
    assertTruthy(this.textureTracker, 'TextureTracker is not initialized');

    const resolvedProps = this.resolveNodeDefaults(props);
    return new CoreNode(this.stage, this.textureTracker, {
      ...resolvedProps,
      id: getNewId(),
      shaderProps: null,
      textureOptions: null,
    });

    // FIXME onDestroy event? node.once('beforeDestroy'
    // FIXME onCreate event?
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
  createTextNode(props: Partial<ITextNodeWritableProps>): CoreTextNode {
    const fontSize = props.fontSize ?? 16;
    const data = {
      ...this.resolveNodeDefaults(props),
      id: getNewId(),
      text: props.text ?? '',
      textRendererOverride: props.textRendererOverride ?? null,
      fontSize,
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
      lineHeight: props.lineHeight, // `undefined` is a valid value
      maxLines: props.maxLines ?? 0,
      textBaseline: props.textBaseline ?? 'alphabetic',
      verticalAlign: props.verticalAlign ?? 'middle',
      overflowSuffix: props.overflowSuffix ?? '...',
      debug: props.debug ?? {},
      shaderProps: null,
      textureOptions: null,
    };

    // FIXME
    // if (this.inspector) {
    //   return this.inspector.createTextNode(data);
    // }

    assertTruthy(this.stage);
    assertTruthy(this.textureTracker);
    return new CoreTextNode(this.stage, this.textureTracker, data);
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
    const data = santizeCustomDataMap(props.data ?? {});

    return {
      x: props.x ?? 0,
      y: props.y ?? 0,
      width: props.width ?? 0,
      height: props.height ?? 0,
      alpha: props.alpha ?? 1,
      autosize: props.autosize ?? false,
      clipping: props.clipping ?? false,
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
      scale: props.scale ?? null,
      scaleX: props.scaleX ?? props.scale ?? 1,
      scaleY: props.scaleY ?? props.scale ?? 1,
      mount: props.mount ?? 0,
      mountX: props.mountX ?? props.mount ?? 0,
      mountY: props.mountY ?? props.mount ?? 0,
      pivot: props.pivot ?? 0.5,
      pivotX: props.pivotX ?? props.pivot ?? 0.5,
      pivotY: props.pivotY ?? props.pivot ?? 0.5,
      rotation: props.rotation ?? 0,
      rtt: props.rtt ?? false,
      data: data,
    };
  }

  /**
   * Destroy a node
   *
   * @remarks
   * This method destroys a node
   *
   * @param node
   * @returns
   */
  destroyNode(node: CoreNode) {
    if (this.inspector) {
      this.inspector.destroyNode(node);
    }

    return node.destroy();
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
  createTexture<TxType extends keyof TextureMap>(
    textureType: TxType,
    props: SpecificTextureRef<TxType>['props'],
    options?: TextureOptions,
  ): SpecificTextureRef<TxType> {
    assertTruthy(this.textureTracker);
    return this.textureTracker.createTexture(textureType, props, options);
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
  createShader<ShType extends keyof ShaderMap>(
    shaderType: ShType,
    props?: SpecificShaderRef<ShType>['props'],
  ): SpecificShaderRef<ShType> {
    return {
      descType: 'shader',
      shType: shaderType,
      props: props as SpecificShaderRef<ShType>['props'],
    };
  }

  /**
   * Get a Node by its ID
   *
   * @param id
   * @returns
   */
  getNodeById(id: number): CoreNode | null {
    const root = this.stage?.root;
    if (!root) {
      return null;
    }

    const findNode = (node: CoreNode): CoreNode | null => {
      if (node.id === id) {
        return node;
      }

      for (const child of node.children) {
        const found = findNode(child);
        if (found) {
          return found;
        }
      }

      return null;
    };

    return findNode(root);
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
