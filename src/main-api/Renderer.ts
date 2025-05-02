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

import type { ExtractProps, TextureMap } from '../core/CoreTextureManager.js';
import { EventEmitter } from '../common/EventEmitter.js';
import { isProductionEnvironment } from '../utils.js';
import { Stage, type StageOptions } from '../core/Stage.js';
import { CoreNode, type CoreNodeProps } from '../core/CoreNode.js';
import { type CoreTextNodeProps } from '../core/CoreTextNode.js';
import type { INode, INodeProps, ITextNode, ITextNodeProps } from './INode.js';
import type { TextureMemoryManagerSettings } from '../core/TextureMemoryManager.js';
import type { CanvasTextRenderer } from '../core/text-rendering/renderers/CanvasTextRenderer.js';
import type { SdfTextRenderer } from '../core/text-rendering/renderers/SdfTextRenderer/SdfTextRenderer.js';
import { WebGlRenderer } from '../core/renderers/webgl/WebGlRenderer.js';
import type { CanvasRenderer } from '../core/renderers/canvas/CanvasRenderer.js';
import type { Inspector } from './Inspector.js';
import type { CoreShaderNode } from '../core/renderers/CoreShaderNode.js';
import type {
  ExtractShaderProps,
  OptionalShaderProps,
  ShaderMap,
} from '../core/CoreShaderManager.js';
import { WebPlatform } from '../core/platforms/web/WebPlatform.js';
import { Platform } from '../core/platforms/Platform.js';

/**
 * Settings for the Renderer that can be updated during runtime.
 */
export interface RendererRuntimeSettings {
  /**
   * Authored logical pixel width of the application
   *
   * @defaultValue `1920`
   */
  appWidth: number;

  /**
   * Authored logical pixel height of the application
   *
   * @defaultValue `1080`
   */
  appHeight: number;

  /**
   * Texture Memory Manager Settings
   */
  textureMemory: Partial<TextureMemoryManagerSettings>;

  /**
   * Bounds margin to extend the boundary in which a Node is added as Quad.
   */
  boundsMargin: number | [number, number, number, number];

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
  deviceLogicalPixelRatio: number;

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
  devicePhysicalPixelRatio: number;

  /**
   * RGBA encoded number of the background to use
   *
   * @defaultValue `0x00000000`
   */
  clearColor: number;

  /**
   * Interval in milliseconds to receive FPS updates
   *
   * @remarks
   * If set to `0`, FPS updates will be disabled.
   *
   * @defaultValue `0` (disabled)
   */
  fpsUpdateInterval: number;

  /**
   * DOM Inspector
   *
   * @remarks
   * The inspector will replicate the state of the Nodes created
   * in the renderer and allow inspection of the state of the nodes.
   *
   */
  inspector: typeof Inspector | false;

  /**
   * Texture Processing Limit (in milliseconds)
   *
   * @remarks
   * The maximum amount of time the renderer is allowed to process textures in a
   * single frame. If the processing time exceeds this limit, the renderer will
   * skip processing the remaining textures and continue rendering the frame.
   *
   * @defaultValue `10`
   */
  textureProcessingTimeLimit: number;
}

/**
 * Configuration settings for {@link RendererMain}
 */
export type RendererMainSettings = RendererRuntimeSettings & {
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
  enableContextSpy: boolean;

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
  numImageWorkers: number;

  /**
   * Renderer Engine
   *
   * @remarks
   * The renderer engine to use. Spawns a WebGL or Canvas renderer.
   * WebGL is more performant and supports more features. Canvas is
   * supported on most platforms.
   *
   * Note: When using CanvasCoreRenderer you can only use
   * CanvasTextRenderer. The WebGLCoreRenderer supports
   * both CanvasTextRenderer and SdfTextRenderer for Text Rendering.
   *
   */
  renderEngine: typeof CanvasRenderer | typeof WebGlRenderer;

  /**
   * Quad buffer size in bytes
   *
   * @defaultValue 4 * 1024 * 1024
   */
  quadBufferSize: number;

  /**
   * Font Engines
   *
   * @remarks
   * The font engines to use for text rendering. CanvasTextRenderer is supported
   * on all platforms. SdfTextRenderer is a more performant renderer.
   * When using `renderEngine=CanvasCoreRenderer` you can only use `CanvasTextRenderer`.
   * The `renderEngine=WebGLCoreRenderer` supports both `CanvasTextRenderer` and `SdfTextRenderer`.
   *
   * This setting is used to enable tree shaking of unused font engines. Please
   * import your font engine(s) as follows:
   * ```
   * import { CanvasTextRenderer } from '@lightning/renderer/canvas';
   * import { SdfTextRenderer } from '@lightning/renderer/webgl';
   * ```
   *
   * If both CanvasTextRenderer and SdfTextRenderer are provided, the first renderer
   * provided will be asked first if it can render the font. If it cannot render the
   * font, the next renderer will be asked. If no renderer can render the font, the
   * text will not be rendered.
   *
   * **Note** that if you have fonts available in both engines the second font engine
   * will not be used. This is because the first font engine will always be asked first.
   *
   * @defaultValue '[]'
   *
   *
   */
  fontEngines: (typeof SdfTextRenderer | typeof CanvasTextRenderer)[];

  /**
   * Force WebGL2
   *
   * @remarks
   * Force the renderer to use WebGL2. This can be used to force the renderer to
   * use WebGL2 even if the browser supports WebGL1.
   *
   * @defaultValue `false`
   */
  forceWebGL2: boolean;

  /**
   * Enable strictBounds
   *
   * @remarks
   * Enable strict bounds for the renderer. This will ensure that the renderer
   * will not render outside the bounds of the canvas.
   *
   * @defaultValue `true`
   */
  strictBounds: boolean;

  /**
   * Canvas object to use for rendering
   *
   * @remarks
   * This is used to render the scene graph. If not provided, a new canvas
   * element will be created and appended to the target element.
   */
  canvas: HTMLCanvasElement;

  /**
   * createImageBitmap support for the runtime
   *
   * @remarks
   * This is used to determine if and which version of the createImageBitmap API
   * is supported by the runtime. This is used to determine if the renderer can
   * use createImageBitmap to load images.
   *
   * Options supported
   * - Auto - Automatically determine the supported version
   * - Basic - Supports createImageBitmap(image)
   * - Options - Supports createImageBitmap(image, options)
   * - Full - Supports createImageBitmap(image, sx, sy, sw, sh, options)
   *
   * Note with auto detection, the renderer will attempt to use the most advanced
   * version of the API available. If the API is not available, the renderer will
   * fall back to the next available version.
   *
   * This will affect startup performance as the renderer will need to determine
   * the supported version of the API.
   *
   * @defaultValue `full`
   */
  createImageBitmapSupport: 'auto' | 'basic' | 'options' | 'full';

  /**
   * Provide an alternative platform abstraction layer
   *
   * @remarks
   * By default the Lightning 3 renderer will load a webplatform, assuming it runs
   * inside a web browsr. However for special cases there might be a need to provide
   * an abstracted platform layer to run on non-web or non-standard JS engines
   *
   * @defaultValue `null`
   */
  platform: typeof Platform | null;
};

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
 *
 * ## Events
 * - `fpsUpdate`
 *   - Emitted every `fpsUpdateInterval` milliseconds with the current FPS
 * - `frameTick`
 *   - Emitted every frame tick
 * - `quadsUpdate`
 *  - Emitted when number of quads rendered is updated
 * - `idle`
 *   - Emitted when the renderer is idle (no changes to the scene
 *     graph/animations running)
 * - `criticalCleanup`
 *  - Emitted when the Texture Memory Manager Cleanup process is triggered
 *  - Payload: { memUsed: number, criticalThreshold: number }
 *    - `memUsed` - The amount of memory (in bytes) used by textures before the
 *       cleanup process
 *    - `criticalThreshold` - The critical threshold (in bytes)
 * - `criticalCleanupFailed`
 *   - Emitted when the Texture Memory Manager Cleanup process is unable to free
 *     up enough texture memory to reach below the critical threshold.
 *     This can happen when there is not enough non-renderable textures to
 *     free up.
 *   - Payload (object with keys):
 *     - `memUsed` - The amount of memory (in bytes) used by textures after
 *       the cleanup process
 *     - `criticalThreshold` - The critical threshold (in bytes)
 */
export class RendererMain extends EventEmitter {
  readonly root: INode;
  readonly canvas: HTMLCanvasElement;
  readonly stage: Stage;
  private inspector: Inspector | null = null;

  /**
   * Constructs a new Renderer instance
   *
   * @param settings Renderer settings
   * @param target Element ID or HTMLElement to insert the canvas into
   * @param driver Core Driver to use
   */
  constructor(
    settings: Partial<RendererMainSettings>,
    target: string | HTMLElement,
  ) {
    super();

    const resolvedTxSettings = this.resolveTxSettings(
      settings.textureMemory || {},
    );

    settings = {
      appWidth: settings.appWidth || 1920,
      appHeight: settings.appHeight || 1080,
      textureMemory: resolvedTxSettings,
      boundsMargin: settings.boundsMargin || 0,
      deviceLogicalPixelRatio: settings.deviceLogicalPixelRatio || 1,
      devicePhysicalPixelRatio:
        settings.devicePhysicalPixelRatio || window.devicePixelRatio,
      clearColor: settings.clearColor ?? 0x00000000,
      fpsUpdateInterval: settings.fpsUpdateInterval || 0,
      numImageWorkers:
        settings.numImageWorkers !== undefined ? settings.numImageWorkers : 2,
      enableContextSpy: settings.enableContextSpy ?? false,
      forceWebGL2: settings.forceWebGL2 ?? false,
      inspector: settings.inspector ?? false,
      renderEngine: settings.renderEngine ?? WebGlRenderer,
      quadBufferSize: settings.quadBufferSize ?? 4 * 1024 * 1024,
      fontEngines: settings.fontEngines ?? [],
      strictBounds: settings.strictBounds ?? true,
      textureProcessingTimeLimit: settings.textureProcessingTimeLimit || 10,
      canvas: settings.canvas || document.createElement('canvas'),
      createImageBitmapSupport: settings.createImageBitmapSupport || 'full',
      platform: settings.platform || null,
    };

    const {
      appWidth,
      appHeight,
      deviceLogicalPixelRatio,
      devicePhysicalPixelRatio,
      inspector,
      canvas,
    } = settings as RendererMainSettings;

    let platform;
    if (
      settings.platform !== undefined &&
      settings.platform !== null &&
      settings.platform.prototype instanceof Platform === true
    ) {
      // @ts-ignore - if Platform is a valid class, it will be used
      platform = new settings.platform();
    } else {
      platform = new WebPlatform();
    }

    const deviceLogicalWidth = appWidth * deviceLogicalPixelRatio;
    const deviceLogicalHeight = appHeight * deviceLogicalPixelRatio;

    this.canvas = canvas;
    canvas.width = deviceLogicalWidth * devicePhysicalPixelRatio;
    canvas.height = deviceLogicalHeight * devicePhysicalPixelRatio;

    canvas.style.width = `${deviceLogicalWidth}px`;
    canvas.style.height = `${deviceLogicalHeight}px`;

    // Initialize the stage
    this.stage = new Stage({
      appWidth,
      appHeight,
      boundsMargin: settings.boundsMargin!,
      clearColor: settings.clearColor!,
      canvas: this.canvas,
      deviceLogicalPixelRatio,
      devicePhysicalPixelRatio,
      enableContextSpy: settings.enableContextSpy!,
      forceWebGL2: settings.forceWebGL2!,
      fpsUpdateInterval: settings.fpsUpdateInterval!,
      numImageWorkers: settings.numImageWorkers!,
      renderEngine: settings.renderEngine!,
      textureMemory: resolvedTxSettings,
      eventBus: this,
      quadBufferSize: settings.quadBufferSize!,
      fontEngines: settings.fontEngines!,
      inspector: settings.inspector !== null,
      strictBounds: settings.strictBounds!,
      textureProcessingTimeLimit: settings.textureProcessingTimeLimit!,
      createImageBitmapSupport: settings.createImageBitmapSupport!,
      platform,
    });

    // Extract the root node
    this.root = this.stage.root as unknown as INode;

    // Get the target element and attach the canvas to it
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

    // Initialize inspector (if enabled)
    if (inspector && isProductionEnvironment === false) {
      this.inspector = new inspector(canvas, settings as RendererMainSettings);
    }
  }

  /**
   * Resolves the Texture Memory Manager values
   *
   * @param props
   * @returns
   */
  private resolveTxSettings(
    textureMemory: Partial<TextureMemoryManagerSettings>,
  ): TextureMemoryManagerSettings {
    const currentTxSettings =
      (this.stage && this.stage.options.textureMemory) || {};

    return {
      criticalThreshold:
        textureMemory?.criticalThreshold ??
        currentTxSettings?.criticalThreshold ??
        124e6,
      targetThresholdLevel:
        textureMemory?.targetThresholdLevel ??
        currentTxSettings?.targetThresholdLevel ??
        0.5,
      cleanupInterval:
        textureMemory?.cleanupInterval ??
        currentTxSettings?.cleanupInterval ??
        5000,
      debugLogging:
        textureMemory?.debugLogging ?? currentTxSettings?.debugLogging ?? false,
      baselineMemoryAllocation:
        textureMemory?.baselineMemoryAllocation ??
        currentTxSettings?.baselineMemoryAllocation ??
        26e6,
      doNotExceedCriticalThreshold:
        textureMemory?.doNotExceedCriticalThreshold ??
        currentTxSettings?.doNotExceedCriticalThreshold ??
        false,
    };
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
   * See {@link CoreNode} for more details.
   *
   * @param props
   * @returns
   */
  createNode<ShNode extends CoreShaderNode<any>>(
    props: Partial<INodeProps<ShNode>>,
  ): INode<ShNode> {
    const node = this.stage.createNode(props as Partial<CoreNodeProps>);

    if (this.inspector) {
      return this.inspector.createNode(node) as unknown as INode<ShNode>;
    }

    return node as unknown as INode<ShNode>;
  }

  /**
   * Create a new scene graph text node
   *
   * @remarks
   * A text node is the second graphical building block of the Renderer scene
   * graph. It renders text using a specific text renderer that is automatically
   * chosen based on the font requested and what type of fonts are installed
   * into an app.
   *
   * See {@link ITextNode} for more details.
   *
   * @param props
   * @returns
   */
  createTextNode(props: Partial<ITextNodeProps>): ITextNode {
    const textNode = this.stage.createTextNode(props as CoreTextNodeProps);

    if (this.inspector) {
      return this.inspector.createTextNode(textNode) as unknown as ITextNode;
    }

    return textNode as unknown as ITextNode;
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
  destroyNode(node: INode) {
    if (this.inspector) {
      this.inspector.destroyNode(node.id);
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
    props: ExtractProps<TextureMap[TxType]>,
  ): InstanceType<TextureMap[TxType]> {
    return this.stage.txManager.createTexture(textureType, props);
  }

  /**
   * Create a new shader controller for a shader type
   *
   * @remarks
   * This method creates a new Shader Controller for a specific shader type.
   *
   * If the shader has not been loaded yet, it will be loaded. Otherwise, the
   * existing shader will be reused.
   *
   * It can be assigned to a Node's `shader` property.
   *
   * @param shaderType
   * @param props
   * @returns
   */
  createShader<ShType extends keyof ShaderMap>(
    shType: ShType,
    props?: OptionalShaderProps<ShType>,
  ) {
    return this.stage.shManager.createShader(shType, props) as CoreShaderNode<
      NonNullable<ExtractShaderProps<ShType>>
    >;
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

  getBufferInfo() {
    return this.stage.renderer.getBufferInfo();
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
    this.stage.requestRender();
  }

  /**
   * Cleanup textures that are not being used
   *
   * @param aggressive - If true, will cleanup all textures, regardless of render status
   *
   * @remarks
   * This can be used to free up GFX memory used by textures that are no longer
   * being displayed.
   *
   * This routine is also called automatically when the memory used by textures
   * exceeds the critical threshold on frame generation **OR** when the renderer
   * is idle and the memory used by textures exceeds the target threshold.
   *
   * **NOTE**: This is a heavy operation and should be used sparingly.
   * **NOTE2**: This will not cleanup textures that are currently being displayed.
   * **NOTE3**: This will not cleanup textures that are marked as `preventCleanup`.
   * **NOTE4**: This has nothing to do with the garbage collection of JavaScript.
   */
  cleanup(aggressive: boolean = false) {
    this.stage.cleanup(aggressive);
  }

  /**
   * Sets the clear color for the stage.
   *
   * @param color - The color to set as the clear color.
   */
  setClearColor(color: number) {
    this.stage.setClearColor(color);
  }

  /**
   * Set options for the renderer
   *
   * @param options
   */
  setOptions(options: Partial<RendererRuntimeSettings>) {
    const stage = this.stage;
    if (options.textureMemory !== undefined) {
      const textureMemory = (options.textureMemory = this.resolveTxSettings(
        options.textureMemory,
      ));
      stage.txMemManager.updateSettings(textureMemory);
      stage.txMemManager.cleanup();
    }

    if (options.boundsMargin !== undefined) {
      let bm = options.boundsMargin!;
      options.boundsMargin = Array.isArray(bm) ? bm : [bm, bm, bm, bm];
    }

    const stageOptions = stage.options;
    for (let key in options) {
      stageOptions[key] = options[key]!;
    }

    if (options.inspector !== undefined && !isProductionEnvironment) {
      if (options.inspector === false) {
        this.inspector?.destroy();
        this.inspector = null;
      } else if (
        this.inspector === null ||
        this.inspector.constructor !== options.inspector
      ) {
        this.inspector = new options.inspector(
          this.canvas,
          stage.options as unknown as RendererMainSettings,
        );
        this.inspector?.createNodes(this.root as unknown as CoreNode);
      }
    }

    let needDimensionsUpdate = false;

    if (
      options.deviceLogicalPixelRatio ||
      options.devicePhysicalPixelRatio !== undefined
    ) {
      this.stage.pixelRatio =
        stageOptions.devicePhysicalPixelRatio *
        stageOptions.deviceLogicalPixelRatio;
      this.inspector?.updateViewport(
        stageOptions.appWidth,
        stageOptions.appHeight,
        stageOptions.deviceLogicalPixelRatio,
      );
      needDimensionsUpdate = true;
    }

    if (options.appWidth !== undefined || options.appHeight !== undefined) {
      this.inspector?.updateViewport(
        stageOptions.appWidth,
        stageOptions.appHeight,
        stageOptions.deviceLogicalPixelRatio,
      );
      needDimensionsUpdate = true;
    }

    if (options.boundsMargin !== undefined) {
      this.stage.setBoundsMargin(options.boundsMargin);
    }

    if (options.clearColor !== undefined) {
      this.stage.setClearColor(options.clearColor);
    }

    if (needDimensionsUpdate) {
      this.updateAppDimensions();
    }
  }

  private updateAppDimensions() {
    const {
      appWidth,
      appHeight,
      deviceLogicalPixelRatio,
      devicePhysicalPixelRatio,
    } = this.stage.options;

    const deviceLogicalWidth = appWidth * deviceLogicalPixelRatio;
    const deviceLogicalHeight = appHeight * deviceLogicalPixelRatio;

    this.canvas.width = deviceLogicalWidth * devicePhysicalPixelRatio;
    this.canvas.height = deviceLogicalHeight * devicePhysicalPixelRatio;

    this.canvas.style.width = `${deviceLogicalWidth}px`;
    this.canvas.style.height = `${deviceLogicalHeight}px`;

    this.stage.renderer.updateViewport();

    this.root.width = appWidth;
    this.root.height = appHeight;
    this.stage.updateViewportBounds();
  }

  get settings(): Readonly<StageOptions> {
    return this.stage.options;
  }
}
