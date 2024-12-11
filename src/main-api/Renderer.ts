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
import type { EffectMap, ShaderMap } from '../core/CoreShaderManager.js';
import type { ExtractProps, TextureMap } from '../core/CoreTextureManager.js';
import { EventEmitter } from '../common/EventEmitter.js';
import { assertTruthy, isProductionEnvironment } from '../utils.js';
import { Stage } from '../core/Stage.js';
import { CoreNode, type CoreNodeProps } from '../core/CoreNode.js';
import { type CoreTextNodeProps } from '../core/CoreTextNode.js';
import type {
  BaseShaderController,
  ShaderController,
} from './ShaderController.js';
import type { INode, INodeProps, ITextNode, ITextNodeProps } from './INode.js';
import type {
  DynamicEffects,
  DynamicShaderController,
} from './DynamicShaderController.js';
import type {
  EffectDesc,
  EffectDescUnion,
} from '../core/renderers/webgl/shaders/effects/ShaderEffect.js';
import type { TextureMemoryManagerSettings } from '../core/TextureMemoryManager.js';
import type { CanvasTextRenderer } from '../core/text-rendering/renderers/CanvasTextRenderer.js';
import type { SdfTextRenderer } from '../core/text-rendering/renderers/SdfTextRenderer/SdfTextRenderer.js';
import type { WebGlCoreRenderer } from '../core/renderers/webgl/WebGlCoreRenderer.js';
import type { CanvasCoreRenderer } from '../core/renderers/canvas/CanvasCoreRenderer.js';
import type { Inspector } from './Inspector.js';

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
   * Texture Memory Manager Settings
   */
  textureMemory?: Partial<TextureMemoryManagerSettings>;

  /**
   * Bounds margin to extend the boundary in which a Node is added as Quad.
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
   * DOM Inspector
   *
   * @remarks
   * The inspector will replicate the state of the Nodes created
   * in the renderer and allow inspection of the state of the nodes.
   *
   */
  inspector?: typeof Inspector | false;

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
  renderEngine: typeof CanvasCoreRenderer | typeof WebGlCoreRenderer;

  /**
   * Quad buffer size in bytes
   *
   * @defaultValue 4 * 1024 * 1024
   */
  quadBufferSize?: number;

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
  forceWebGL2?: boolean;

  /**
   * Enable strictBounds
   *
   * @remarks
   * Enable strict bounds for the renderer. This will ensure that the renderer
   * will not render outside the bounds of the canvas.
   *
   * @defaultValue `true`
   */
  strictBounds?: boolean;

  /**
   * Texture Processing Limit
   *
   * @remarks
   * The maximum number of textures to process in a single frame. This is used to
   * prevent the renderer from processing too many textures in a single frame.
   *
   * @defaultValue `0`
   */
  textureProcessingLimit?: number;
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
 *
 * ## Events
 * - `fpsUpdate`
 *   - Emitted every `fpsUpdateInterval` milliseconds with the current FPS
 * - `frameTick`
 *   - Emitted every frame tick
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
  readonly root: INode<ShaderController<'DefaultShader'>>;
  readonly canvas: HTMLCanvasElement;
  readonly settings: Readonly<Required<RendererMainSettings>>;
  readonly stage: Stage;
  private inspector: Inspector | null = null;

  /**
   * Constructs a new Renderer instance
   *
   * @param settings Renderer settings
   * @param target Element ID or HTMLElement to insert the canvas into
   * @param driver Core Driver to use
   */
  constructor(settings: RendererMainSettings, target: string | HTMLElement) {
    super();
    const resolvedTxSettings: TextureMemoryManagerSettings = {
      criticalThreshold: settings.textureMemory?.criticalThreshold || 124e6,
      targetThresholdLevel: settings.textureMemory?.targetThresholdLevel || 0.5,
      cleanupInterval: settings.textureMemory?.cleanupInterval || 30000,
      debugLogging: settings.textureMemory?.debugLogging || false,
    };
    const resolvedSettings: Required<RendererMainSettings> = {
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
      renderEngine: settings.renderEngine,
      quadBufferSize: settings.quadBufferSize ?? 4 * 1024 * 1024,
      fontEngines: settings.fontEngines,
      strictBounds: settings.strictBounds ?? true,
      textureProcessingLimit: settings.textureProcessingLimit || 0,
    };
    this.settings = resolvedSettings;

    const {
      appWidth,
      appHeight,
      deviceLogicalPixelRatio,
      devicePhysicalPixelRatio,
      inspector,
    } = resolvedSettings;

    const deviceLogicalWidth = appWidth * deviceLogicalPixelRatio;
    const deviceLogicalHeight = appHeight * deviceLogicalPixelRatio;

    const canvas = document.createElement('canvas');
    this.canvas = canvas;
    canvas.width = deviceLogicalWidth * devicePhysicalPixelRatio;
    canvas.height = deviceLogicalHeight * devicePhysicalPixelRatio;

    canvas.style.width = `${deviceLogicalWidth}px`;
    canvas.style.height = `${deviceLogicalHeight}px`;

    // Initialize the stage
    this.stage = new Stage({
      appWidth: this.settings.appWidth,
      appHeight: this.settings.appHeight,
      boundsMargin: this.settings.boundsMargin,
      clearColor: this.settings.clearColor,
      canvas: this.canvas,
      deviceLogicalPixelRatio: this.settings.deviceLogicalPixelRatio,
      devicePhysicalPixelRatio: this.settings.devicePhysicalPixelRatio,
      enableContextSpy: this.settings.enableContextSpy,
      forceWebGL2: this.settings.forceWebGL2,
      fpsUpdateInterval: this.settings.fpsUpdateInterval,
      numImageWorkers: this.settings.numImageWorkers,
      renderEngine: this.settings.renderEngine,
      textureMemory: resolvedTxSettings,
      eventBus: this,
      quadBufferSize: this.settings.quadBufferSize,
      fontEngines: this.settings.fontEngines,
      inspector: this.settings.inspector !== null,
      strictBounds: this.settings.strictBounds,
      textureProcessingLimit: this.settings.textureProcessingLimit,
    });

    // Extract the root node
    this.root = this.stage.root as unknown as INode<
      ShaderController<'DefaultShader'>
    >;

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
    if (inspector && !isProductionEnvironment()) {
      this.inspector = new inspector(canvas, resolvedSettings);
    }
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
  createNode<
    ShCtr extends BaseShaderController = ShaderController<'DefaultShader'>,
  >(props: Partial<INodeProps<ShCtr>>): INode<ShCtr> {
    const node = this.stage.createNode(props as Partial<CoreNodeProps>);

    if (this.inspector) {
      return this.inspector.createNode(node) as unknown as INode<ShCtr>;
    }

    // FIXME onDestroy event? node.once('beforeDestroy'
    // FIXME onCreate event?
    return node as unknown as INode<ShCtr>;
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
      return this.inspector.createTextNode(textNode);
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
    shaderType: ShType,
    props?: ExtractProps<ShaderMap[ShType]>,
  ): ShaderController<ShType> {
    return this.stage.shManager.loadShader(shaderType, props);
  }

  /**
   * Create a new Dynamic Shader controller
   *
   * @remarks
   * A Dynamic Shader is a shader that can be composed of an array of mulitple
   * effects. Each effect can be animated or changed after creation (provided
   * the effect is given a name).
   *
   * Example:
   * ```ts
   * renderer.createNode({
   *   shader: renderer.createDynamicShader([
   *     renderer.createEffect('radius', {
   *       radius: 0
   *     }, 'effect1'),
   *     renderer.createEffect('border', {
   *       color: 0xff00ffff,
   *       width: 10,
   *     }, 'effect2'),
   *   ]),
   * });
   * ```
   *
   * @param effects
   * @returns
   */
  createDynamicShader<
    T extends DynamicEffects<[...{ name?: string; type: keyof EffectMap }[]]>,
  >(effects: [...T]): DynamicShaderController<T> {
    return this.stage.shManager.loadDynamicShader({
      effects: effects as EffectDescUnion[],
    });
  }

  /**
   * Create an effect to be used in a Dynamic Shader
   *
   * @remark
   * The {name} parameter is optional but required if you want to animate the effect
   * or change the effect's properties after creation.
   *
   * See {@link createDynamicShader} for an example.
   *
   * @param type
   * @param props
   * @param name
   * @returns
   */
  createEffect<
    Type extends keyof EffectMap,
    Name extends string | undefined = undefined,
  >(
    type: Type,
    props: EffectDesc<{ name: Name; type: Type }>['props'],
    name?: Name,
  ): EffectDesc<{ name: Name; type: Type }> {
    return {
      name,
      type,
      props,
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
   * Sets the clear color for the stage.
   *
   * @param color - The color to set as the clear color.
   */
  setClearColor(color: number) {
    this.stage.setClearColor(color);
  }
}
