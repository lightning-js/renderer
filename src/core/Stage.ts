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

import { assertTruthy, setPremultiplyMode } from '../utils.js';
import { AnimationManager } from './animations/AnimationManager.js';
import {
  UpdateType,
  CoreNode,
  CoreNodeRenderState,
  type CoreNodeProps,
} from './CoreNode.js';
import { CoreTextureManager } from './CoreTextureManager.js';
import { TrFontManager } from './text-rendering/TrFontManager.js';
import { CoreShaderManager } from './CoreShaderManager.js';
import {
  TextRenderer,
  type TextRendererMap,
  type TrProps,
} from './text-rendering/renderers/TextRenderer.js';

import { EventEmitter } from '../common/EventEmitter.js';
import { ContextSpy } from './lib/ContextSpy.js';
import type {
  FpsUpdatePayload,
  FrameTickPayload,
  QuadsUpdatePayload,
} from '../common/CommonTypes.js';
import {
  TextureMemoryManager,
  type TextureMemoryManagerSettings,
} from './TextureMemoryManager.js';
import { CoreRenderer } from './renderers/CoreRenderer.js';
import { CoreTextNode, type CoreTextNodeProps } from './CoreTextNode.js';
import { santizeCustomDataMap } from '../main-api/utils.js';
import type { SdfTextRenderer } from './text-rendering/renderers/SdfTextRenderer/SdfTextRenderer.js';
import type { CanvasTextRenderer } from './text-rendering/renderers/CanvasTextRenderer.js';
import { pointInBound } from './lib/utils.js';
import type { CoreShaderNode } from './renderers/CoreShaderNode.js';
import { createBound, createPreloadBounds, type Bound } from './lib/utils.js';
import type { Texture } from './textures/Texture.js';
import { ColorTexture } from './textures/ColorTexture.js';
import type { Platform } from './platforms/Platform.js';
import type { WebPlatform } from './platforms/web/WebPlatform.js';
import type { RendererMainSettings } from '../main-api/Renderer.js';

export type StageOptions = Omit<
  RendererMainSettings,
  'inspector' | 'platform'
> & {
  textureMemory: TextureMemoryManagerSettings;
  canvas: HTMLCanvasElement | OffscreenCanvas;
  fpsUpdateInterval: number;
  eventBus: EventEmitter;
  platform: Platform | WebPlatform;
  inspector: boolean;
};

export type StageFpsUpdateHandler = (
  stage: Stage,
  fpsData: FpsUpdatePayload,
) => void;

export type StageFrameTickHandler = (
  stage: Stage,
  frameTickData: FrameTickPayload,
) => void;

export interface Point {
  x: number;
  y: number;
}

const autoStart = true;

export class Stage {
  /// Module Instances
  public readonly animationManager: AnimationManager;
  public readonly txManager: CoreTextureManager;
  public readonly txMemManager: TextureMemoryManager;
  public readonly fontManager: TrFontManager;
  public readonly textRenderers: Partial<TextRendererMap>;
  public readonly shManager: CoreShaderManager;
  public readonly renderer: CoreRenderer;
  public readonly root: CoreNode;
  public readonly interactiveNodes: Set<CoreNode> = new Set();
  public boundsMargin: [number, number, number, number];
  public readonly defShaderNode: CoreShaderNode | null = null;
  public strictBound: Bound;
  public preloadBound: Bound;
  public readonly strictBounds: boolean;
  public readonly defaultTexture: Texture | null = null;
  public pixelRatio: number;
  public readonly bufferMemory: number = 2e6;
  public readonly platform: Platform | WebPlatform;
  public readonly calculateTextureCoord: boolean;

  /**
   * Target frame time in milliseconds (calculated from targetFPS)
   *
   * @remarks
   * This is pre-calculated to avoid recalculating on every frame.
   * - 0 means no throttling (use display refresh rate)
   * - >0 means throttle to this frame time (1000 / targetFPS)
   */
  public targetFrameTime: number = 0;

  /**
   * Renderer Event Bus for the Stage to emit events onto
   *
   * @remarks
   * In reality this is just the RendererMain instance, which is an EventEmitter.
   * this allows us to directly emit events from the Stage to RendererMain
   * without having to set up forwarding handlers.
   */
  public readonly eventBus: EventEmitter;

  /// State
  deltaTime = 0;
  lastFrameTime = 0;
  currentFrameTime = 0;
  private clrColor = 0x00000000;
  private fpsNumFrames = 0;
  private fpsElapsedTime = 0;
  private numQuadsRendered = 0;
  private renderRequested = false;
  private frameEventQueue: [name: string, payload: unknown][] = [];
  private fontResolveMap: Record<string, CanvasTextRenderer | SdfTextRenderer> =
    {};

  /// Debug data
  contextSpy: ContextSpy | null = null;

  /**
   * Stage constructor
   */
  constructor(public options: StageOptions) {
    const {
      canvas,
      clearColor,
      appWidth,
      appHeight,
      boundsMargin,
      enableContextSpy,
      forceWebGL2,
      numImageWorkers,
      textureMemory,
      renderEngine,
      fontEngines,
      createImageBitmapSupport,
      platform,
    } = options;

    assertTruthy(
      platform !== null,
      'A CorePlatform is not provided in the options',
    );

    this.platform = platform;

    this.eventBus = options.eventBus;

    // Calculate target frame time from targetFPS option
    this.targetFrameTime = options.targetFPS > 0 ? 1000 / options.targetFPS : 0;

    this.txManager = new CoreTextureManager(this, {
      numImageWorkers,
      createImageBitmapSupport,
    });

    // Wait for the Texture Manager to initialize
    // once it does, request a render
    this.txManager.on('initialized', () => {
      this.requestRender();
    });

    this.txMemManager = new TextureMemoryManager(this, textureMemory);

    this.animationManager = new AnimationManager();
    this.contextSpy = enableContextSpy ? new ContextSpy() : null;
    this.strictBounds = options.strictBounds;

    let bm = [0, 0, 0, 0] as [number, number, number, number];
    if (boundsMargin) {
      bm = Array.isArray(boundsMargin)
        ? boundsMargin
        : [boundsMargin, boundsMargin, boundsMargin, boundsMargin];
    }
    this.boundsMargin = bm;

    // precalculate our viewport bounds
    this.strictBound = createBound(0, 0, appWidth, appHeight);
    this.preloadBound = createPreloadBounds(this.strictBound, bm);

    this.clrColor = clearColor;

    this.pixelRatio =
      options.devicePhysicalPixelRatio * options.deviceLogicalPixelRatio;

    this.renderer = new renderEngine({
      stage: this,
      canvas,
      contextSpy: this.contextSpy,
      forceWebGL2,
    });

    this.shManager = new CoreShaderManager(this);

    this.defShaderNode = this.renderer.getDefaultShaderNode();
    this.calculateTextureCoord = this.renderer.getTextureCoords !== undefined;

    const renderMode = this.renderer.mode || 'webgl';

    this.createDefaultTexture();
    setPremultiplyMode(renderMode);

    // Must do this after renderer is created
    this.txManager.renderer = this.renderer;

    // Create text renderers
    this.textRenderers = {};
    fontEngines.forEach((fontEngineConstructor) => {
      const fontEngineInstance = new fontEngineConstructor(this);
      const className = fontEngineInstance.type;

      if (className === 'sdf' && renderMode === 'canvas') {
        console.warn(
          'SdfTextRenderer is not compatible with Canvas renderer. Skipping...',
        );
        return;
      }

      if (fontEngineInstance instanceof TextRenderer) {
        if (className === 'canvas') {
          this.textRenderers['canvas'] =
            fontEngineInstance as CanvasTextRenderer;
        } else if (className === 'sdf') {
          this.textRenderers['sdf'] = fontEngineInstance as SdfTextRenderer;
        }
      }
    });

    if (Object.keys(this.textRenderers).length === 0) {
      console.warn('No text renderers available. Your text will not render.');
    }

    this.fontManager = new TrFontManager(this.textRenderers);

    // create root node
    const rootNode = new CoreNode(this, {
      x: 0,
      y: 0,
      width: appWidth,
      height: appHeight,
      alpha: 1,
      autosize: false,
      boundsMargin: null,
      clipping: false,
      color: 0x00000000,
      colorTop: 0x00000000,
      colorBottom: 0x00000000,
      colorLeft: 0x00000000,
      colorRight: 0x00000000,
      colorTl: 0x00000000,
      colorTr: 0x00000000,
      colorBl: 0x00000000,
      colorBr: 0x00000000,
      zIndex: 0,
      zIndexLocked: 0,
      scaleX: 1,
      scaleY: 1,
      mountX: 0,
      mountY: 0,
      mount: 0,
      pivot: 0.5,
      pivotX: 0.5,
      pivotY: 0.5,
      rotation: 0,
      parent: null,
      texture: null,
      textureOptions: {},
      shader: this.defShaderNode,
      rtt: false,
      src: null,
      scale: 1,
      strictBounds: this.strictBounds,
    });

    this.root = rootNode;

    // execute platform start loop
    if (autoStart === true) {
      this.platform.startLoop(this);
    }
  }

  setClearColor(color: number) {
    this.clearColor = color;
    this.renderer.updateClearColor(color);
    this.renderRequested = true;
  }

  /**
   * Update the target frame time based on the current targetFPS setting
   *
   * @remarks
   * This should be called whenever the targetFPS option is changed
   * to ensure targetFrameTime stays in sync.
   * targetFPS of 0 means no throttling (targetFrameTime = 0)
   * targetFPS > 0 means throttle to 1000/targetFPS milliseconds
   */
  updateTargetFrameTime() {
    this.targetFrameTime =
      this.options.targetFPS > 0 ? 1000 / this.options.targetFPS : 0;
  }

  updateFrameTime() {
    const newFrameTime = this.platform!.getTimeStamp();
    this.lastFrameTime = this.currentFrameTime;
    this.currentFrameTime = newFrameTime;
    this.deltaTime = !this.lastFrameTime
      ? 100 / 6
      : newFrameTime - this.lastFrameTime;
    this.txManager.frameTime = newFrameTime;
    this.txMemManager.frameTime = newFrameTime;

    // This event is emitted at the beginning of the frame (before any updates
    // or rendering), so no need to to use `stage.queueFrameEvent` here.
    this.eventBus.emit('frameTick', {
      time: this.currentFrameTime,
      delta: this.deltaTime,
    });
  }

  /**
   * Create default PixelTexture
   */
  createDefaultTexture() {
    (this.defaultTexture as ColorTexture) = this.txManager.createTexture(
      'ColorTexture',
      {
        color: 0xffffffff,
      },
    );

    assertTruthy(this.defaultTexture instanceof ColorTexture);
    this.txManager.loadTexture(this.defaultTexture, true);

    // Mark the default texture as ALWAYS renderable
    // This prevents it from ever being cleaned up.
    // Fixes https://github.com/lightning-js/renderer/issues/262
    this.defaultTexture.setRenderableOwner(this, true);

    // When the default texture is loaded, request a render in case the
    // RAF is paused. Fixes: https://github.com/lightning-js/renderer/issues/123
    this.defaultTexture.once('loaded', () => {
      this.requestRender();
    });
  }

  /**
   * Update animations
   */
  updateAnimations() {
    const { animationManager } = this;
    if (!this.root) {
      return;
    }
    // step animation
    animationManager.update(this.deltaTime);
  }

  /**
   * Check if the scene has updates
   */
  hasSceneUpdates() {
    return (
      !!this.root.updateType ||
      this.renderRequested ||
      this.txManager.hasUpdates()
    );
  }

  /**
   * Start a new frame draw
   */
  drawFrame() {
    const { renderer, renderRequested, root } = this;
    const txMemManager = this.txMemManager;

    // Update tree if needed
    if (root.updateType !== 0) {
      root.update(this.deltaTime, root.clippingRect);
    }

    // Process some textures asynchronously but don't block the frame
    // Use a background task to prevent frame drops
    this.txManager
      .processSome(this.options.textureProcessingTimeLimit)
      .catch((err) => {
        console.error('Error processing textures:', err);
      });

    // Reset render operations and clear the canvas
    renderer.reset();

    // Check if we need to cleanup textures
    if (txMemManager.criticalCleanupRequested === true) {
      txMemManager.cleanup(false);

      if (txMemManager.criticalCleanupRequested === true) {
        // If we still need to cleanup, request another but aggressive cleanup
        txMemManager.cleanup(true);
      }
    }

    // If we have RTT nodes draw them first
    // So we can use them as textures in the main scene
    if (renderer.rttNodes.length > 0) {
      renderer.renderRTTNodes();
    }

    // Fill quads buffer
    this.addQuads(this.root);

    // Perform render pass
    renderer.render();

    this.calculateFps();
    this.calculateQuads();

    // Reset renderRequested flag if it was set
    if (renderRequested === true) {
      this.renderRequested = false;
    }
  }

  /**
   * Queue an event to be emitted after the current/next frame is rendered
   *
   * @remarks
   * When we are operating in the context of the render loop, we may want to
   * emit events that are related to the current frame. However, we generally do
   * NOT want to emit events directly in the middle of the render loop, since
   * this could enable event handlers to modify the scene graph and cause
   * unexpected behavior. Instead, we queue up events to be emitted and then
   * flush the queue after the frame has been rendered.
   *
   * @param name
   * @param data
   */
  queueFrameEvent(name: string, data: unknown) {
    this.frameEventQueue.push([name, data]);
  }

  /**
   * Emit all queued frame events
   *
   * @remarks
   * This method should be called after the frame has been rendered to emit
   * all events that were queued during the frame.
   *
   * See {@link queueFrameEvent} for more information.
   */
  flushFrameEvents() {
    for (const [name, data] of this.frameEventQueue) {
      this.eventBus.emit(name, data);
    }
    this.frameEventQueue = [];
  }

  calculateFps() {
    // If there's an FPS update interval, emit the FPS update event
    // when the specified interval has elapsed.
    const { fpsUpdateInterval } = this.options;
    if (fpsUpdateInterval) {
      this.fpsNumFrames++;
      this.fpsElapsedTime += this.deltaTime;
      if (this.fpsElapsedTime >= fpsUpdateInterval) {
        const fps = Math.round(
          (this.fpsNumFrames * 1000) / this.fpsElapsedTime,
        );
        this.fpsNumFrames = 0;
        this.fpsElapsedTime = 0;
        this.queueFrameEvent('fpsUpdate', {
          fps,
          contextSpyData: this.contextSpy?.getData() ?? null,
        } satisfies FpsUpdatePayload);
        this.contextSpy?.reset();
      }
    }
  }

  calculateQuads() {
    const quads = this.renderer.getQuadCount();
    if (quads && quads !== this.numQuadsRendered) {
      this.numQuadsRendered = quads;
      this.queueFrameEvent('quadsUpdate', {
        quads,
      } satisfies QuadsUpdatePayload);
    }
  }

  addQuads(node: CoreNode) {
    assertTruthy(this.renderer);

    // If the node is renderable and has a loaded texture, render it
    if (node.isRenderable === true) {
      node.renderQuads(this.renderer);
    }

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];

      if (child === undefined) {
        continue;
      }

      if (
        child.worldAlpha === 0 ||
        (child.strictBounds === true &&
          child.renderState === CoreNodeRenderState.OutOfBounds)
      ) {
        continue;
      }

      this.addQuads(child);
    }
  }

  /**
   * Request a render pass without forcing an update
   */
  requestRender() {
    this.renderRequested = true;
  }

  /**
   * Given a font name, and possible renderer override, return the best compatible text renderer.
   *
   * @remarks
   * Will try to return a canvas renderer if no other suitable renderer can be resolved.
   *
   * @param fontFamily
   * @param textRendererOverride
   * @returns
   */
  resolveTextRenderer(
    trProps: TrProps,
    textRendererOverride: keyof TextRendererMap | null = null,
  ): TextRenderer | null {
    const fontCacheString = `${trProps.fontFamily}${trProps.fontStyle}${
      trProps.fontWeight
    }${trProps.fontStretch}${textRendererOverride ? textRendererOverride : ''}`;

    // check our resolve cache first
    if (this.fontResolveMap[fontCacheString] !== undefined) {
      return this.fontResolveMap[fontCacheString] as unknown as TextRenderer;
    }

    // Resolve the text renderer
    let rendererId = textRendererOverride;
    let overrideFallback = false;

    // Check if the override is valid (if one is provided)
    if (rendererId) {
      const possibleRenderer = this.textRenderers[rendererId];
      if (!possibleRenderer) {
        console.warn(`Text renderer override '${rendererId}' not found.`);
        rendererId = null;
        overrideFallback = true;
      } else if (!possibleRenderer.canRenderFont(trProps)) {
        console.warn(
          `Cannot use override text renderer '${rendererId}' for font`,
          trProps,
        );
        rendererId = null;
        overrideFallback = true;
      }
    }

    if (!rendererId) {
      // Iterate through the text renderers and find the first one that can render the font
      for (const [trId, tr] of Object.entries(this.textRenderers)) {
        if (tr.canRenderFont(trProps)) {
          rendererId = trId as keyof TextRendererMap;
          break;
        }
      }
      if (!rendererId && this.textRenderers.canvas !== undefined) {
        // If no renderer can be found, use the canvas renderer
        rendererId = 'canvas';
      }
    }

    if (overrideFallback) {
      console.warn(`Falling back to text renderer ${String(rendererId)}`);
    }

    if (!rendererId) {
      // silently fail if no renderer can be found, the error is already created
      // at the constructor level
      return null;
    }

    // By now we are guaranteed to have a valid rendererId (at least Canvas);
    const resolvedTextRenderer = this.textRenderers[rendererId];
    assertTruthy(resolvedTextRenderer, 'resolvedTextRenderer undefined');

    // cache the resolved renderer for future use with these trProps
    this.fontResolveMap[fontCacheString] = resolvedTextRenderer;

    // Need to explicitly cast to TextRenderer because TS doesn't like
    // the covariant state argument in the setter method map
    return resolvedTextRenderer as unknown as TextRenderer;
  }

  createNode(props: Partial<CoreNodeProps>) {
    const resolvedProps = this.resolveNodeDefaults(props);
    return new CoreNode(this, resolvedProps);
  }

  createTextNode(props: Partial<CoreTextNodeProps>) {
    const fontSize = props.fontSize ?? 16;
    const resolvedProps = Object.assign(this.resolveNodeDefaults(props), {
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
      wordBreak: props.wordBreak ?? 'normal',
      debug: props.debug ?? {},
    });

    const resolvedTextRenderer = this.resolveTextRenderer(
      resolvedProps,
      props.textRendererOverride,
    );

    if (!resolvedTextRenderer) {
      throw new Error(
        `No compatible text renderer found for ${resolvedProps.fontFamily}`,
      );
    }

    return new CoreTextNode(this, resolvedProps, resolvedTextRenderer);
  }

  setBoundsMargin(value: number | [number, number, number, number]) {
    this.boundsMargin = Array.isArray(value)
      ? value
      : [value, value, value, value];

    this.root.setUpdateType(UpdateType.RenderBounds);
  }

  /**
   * Update the viewport bounds
   */
  updateViewportBounds() {
    const { appWidth, appHeight } = this.options;
    this.strictBound = createBound(0, 0, appWidth, appHeight);
    this.preloadBound = createPreloadBounds(
      this.strictBound,
      this.boundsMargin,
    );
    this.root.setUpdateType(UpdateType.RenderBounds | UpdateType.Children);
    this.root.childUpdateType |= UpdateType.RenderBounds;
  }

  /** Find all nodes at a given point
   * @param data
   */
  findNodesAtPoint(data: Point): CoreNode[] {
    const x = data.x / this.options.deviceLogicalPixelRatio;
    const y = data.y / this.options.deviceLogicalPixelRatio;
    const nodes: CoreNode[] = [];
    for (const node of this.interactiveNodes) {
      if (node.isRenderable === false) {
        continue;
      }
      if (pointInBound(x, y, node.renderBound!) === true) {
        nodes.push(node);
      }
    }
    return nodes;
  }

  /**
   * Find the top node at a given point
   * @param data
   * @returns
   */
  getNodeFromPosition(data: Point): CoreNode | null {
    const nodes: CoreNode[] = this.findNodesAtPoint(data);
    if (nodes.length === 0) {
      return null;
    }
    let topNode = nodes[0] as CoreNode;
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i]!.zIndex > topNode.zIndex) {
        topNode = nodes[i]!;
      }
    }
    return topNode || null;
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
  protected resolveNodeDefaults(props: Partial<CoreNodeProps>): CoreNodeProps {
    const color = props.color ?? 0xffffffff;
    const colorTop = props.colorTop ?? color;
    const colorBottom = props.colorBottom ?? color;
    const colorLeft = props.colorLeft ?? color;
    const colorRight = props.colorRight ?? color;

    const colorTl = props.colorTl ?? colorTop ?? colorLeft ?? color;
    const colorTr = props.colorTr ?? colorTop ?? colorRight ?? color;
    const colorBl = props.colorBl ?? colorBottom ?? colorLeft ?? color;
    const colorBr = props.colorBr ?? colorBottom ?? colorRight ?? color;

    const scale = props.scale ?? null;
    const mount = props.mount ?? 0;
    const pivot = props.pivot ?? 0.5;

    const data = this.options.inspector
      ? santizeCustomDataMap(props.data ?? {})
      : {};

    return {
      x: props.x ?? 0,
      y: props.y ?? 0,
      width: props.width ?? 0,
      height: props.height ?? 0,
      alpha: props.alpha ?? 1,
      autosize: props.autosize ?? false,
      boundsMargin: props.boundsMargin ?? null,
      clipping: props.clipping ?? false,
      color,
      colorTop,
      colorBottom,
      colorLeft,
      colorRight,
      colorTl,
      colorTr,
      colorBl,
      colorBr,
      zIndex: props.zIndex ?? 0,
      zIndexLocked: props.zIndexLocked ?? 0,
      parent: props.parent ?? null,
      texture: props.texture ?? null,
      textureOptions: props.textureOptions ?? {},
      shader: props.shader ?? this.defShaderNode,
      src: props.src ?? null,
      srcHeight: props.srcHeight,
      srcWidth: props.srcWidth,
      srcX: props.srcX,
      srcY: props.srcY,
      scale,
      scaleX: props.scaleX ?? scale ?? 1,
      scaleY: props.scaleY ?? scale ?? 1,
      mount,
      mountX: props.mountX ?? mount,
      mountY: props.mountY ?? mount,
      pivot,
      pivotX: props.pivotX ?? pivot,
      pivotY: props.pivotY ?? pivot,
      rotation: props.rotation ?? 0,
      rtt: props.rtt ?? false,
      data,
      imageType: props.imageType,
      interactive: props.interactive ?? false,
      strictBounds: props.strictBounds ?? this.strictBounds,
    };
  }

  /**
   * Cleanup Orphaned Textures
   *
   * @remarks
   * This method is used to cleanup orphaned textures that are no longer in use.
   */
  cleanup(aggressive: boolean) {
    this.txMemManager.cleanup(aggressive);
  }

  set clearColor(value: number) {
    this.renderer.updateClearColor(value);
    this.renderRequested = true;
    this.clrColor = value;
  }

  get clearColor() {
    return this.clrColor;
  }
}
