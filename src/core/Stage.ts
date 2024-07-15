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
import { startLoop, getTimeStamp } from './platform.js';
import { WebGlCoreRenderer } from './renderers/webgl/WebGlCoreRenderer.js';
import { assertTruthy, setPremultiplyMode } from '../utils.js';
import { AnimationManager } from './animations/AnimationManager.js';
import { CoreNode, type CoreNodeProps } from './CoreNode.js';
import { CoreTextureManager } from './CoreTextureManager.js';
import { TrFontManager } from './text-rendering/TrFontManager.js';
import { CoreShaderManager, type ShaderMap } from './CoreShaderManager.js';
import type {
  TextRenderer,
  TextRendererMap,
  TrProps,
} from './text-rendering/renderers/TextRenderer.js';
import { SdfTextRenderer } from './text-rendering/renderers/SdfTextRenderer/SdfTextRenderer.js';
import { CanvasTextRenderer } from './text-rendering/renderers/CanvasTextRenderer.js';
import { EventEmitter } from '../common/EventEmitter.js';
import { ContextSpy } from './lib/ContextSpy.js';
import type {
  FpsUpdatePayload,
  FrameTickPayload,
} from '../common/CommonTypes.js';
import {
  TextureMemoryManager,
  type TextureMemoryManagerSettings,
} from './TextureMemoryManager.js';
import type {
  CoreRenderer,
  CoreRendererOptions,
} from './renderers/CoreRenderer.js';
import { CanvasCoreRenderer } from './renderers/canvas/CanvasCoreRenderer.js';
import type { BaseShaderController } from '../main-api/ShaderController.js';
import { CoreTextNode, type CoreTextNodeProps } from './CoreTextNode.js';
import { santizeCustomDataMap } from '../main-api/utils.js';

export interface StageOptions {
  appWidth: number;
  appHeight: number;
  textureMemory: TextureMemoryManagerSettings;
  boundsMargin: number | [number, number, number, number];
  deviceLogicalPixelRatio: number;
  devicePhysicalPixelRatio: number;
  canvas: HTMLCanvasElement | OffscreenCanvas;
  clearColor: number;
  fpsUpdateInterval: number;
  enableContextSpy: boolean;
  numImageWorkers: number;
  renderMode: 'webgl' | 'canvas';
  eventBus: EventEmitter;
  quadBufferSize: number;
}

export type StageFpsUpdateHandler = (
  stage: Stage,
  fpsData: FpsUpdatePayload,
) => void;

export type StageFrameTickHandler = (
  stage: Stage,
  frameTickData: FrameTickPayload,
) => void;

const bufferMemory = 2e6;
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
  public readonly boundsMargin: [number, number, number, number];
  public readonly defShaderCtr: BaseShaderController;

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
  private fpsNumFrames = 0;
  private fpsElapsedTime = 0;
  private renderRequested = false;
  private frameEventQueue: [name: string, payload: unknown][] = [];

  /// Debug data
  contextSpy: ContextSpy | null = null;

  /**
   * Stage constructor
   */
  constructor(readonly options: StageOptions) {
    const {
      canvas,
      clearColor,
      appWidth,
      appHeight,
      boundsMargin,
      enableContextSpy,
      numImageWorkers,
      textureMemory,
      renderMode,
    } = options;

    this.eventBus = options.eventBus;
    this.txManager = new CoreTextureManager(numImageWorkers);
    this.txMemManager = new TextureMemoryManager(this, textureMemory);
    this.shManager = new CoreShaderManager();
    this.animationManager = new AnimationManager();
    this.contextSpy = enableContextSpy ? new ContextSpy() : null;

    let bm = [0, 0, 0, 0] as [number, number, number, number];
    if (boundsMargin) {
      bm = Array.isArray(boundsMargin)
        ? boundsMargin
        : [boundsMargin, boundsMargin, boundsMargin, boundsMargin];
    }
    this.boundsMargin = bm;

    const rendererOptions: CoreRendererOptions = {
      stage: this,
      canvas,
      pixelRatio:
        options.devicePhysicalPixelRatio * options.deviceLogicalPixelRatio,
      clearColor: clearColor ?? 0xff000000,
      bufferMemory,
      txManager: this.txManager,
      txMemManager: this.txMemManager,
      shManager: this.shManager,
      contextSpy: this.contextSpy,
    };

    if (renderMode === 'canvas') {
      this.renderer = new CanvasCoreRenderer(rendererOptions);
    } else {
      this.renderer = new WebGlCoreRenderer(rendererOptions);
    }
    this.defShaderCtr = this.renderer.getDefShaderCtr();
    setPremultiplyMode(renderMode);

    // Must do this after renderer is created
    this.txManager.renderer = this.renderer;

    this.textRenderers =
      renderMode === 'webgl'
        ? {
            canvas: new CanvasTextRenderer(this),
            sdf: new SdfTextRenderer(this),
          }
        : {
            canvas: new CanvasTextRenderer(this),
          };
    this.fontManager = new TrFontManager(this.textRenderers);

    // create root node
    const rootNode = new CoreNode(this, {
      x: 0,
      y: 0,
      width: appWidth,
      height: appHeight,
      alpha: 1,
      autosize: false,
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
      shader: this.defShaderCtr,
      rtt: false,
      src: null,
      scale: 1,
    });

    this.root = rootNode;

    // execute platform start loop
    if (autoStart) {
      startLoop(this);
    }
  }

  updateFrameTime() {
    const newFrameTime = getTimeStamp();
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
    return !!this.root.updateType || this.renderRequested;
  }

  /**
   * Start a new frame draw
   */
  drawFrame() {
    const { renderer, renderRequested } = this;
    assertTruthy(renderer);

    // Update tree if needed
    if (this.root.updateType !== 0) {
      this.root.update(this.deltaTime, this.root.clippingRect);
    }

    // Reset render operations and clear the canvas
    renderer.reset();

    // Check if we need to cleanup textures
    if (this.txMemManager.criticalCleanupRequested) {
      this.txMemManager.cleanup();
    }

    // If we have RTT nodes draw them first
    // So we can use them as textures in the main scene
    if (renderer.rttNodes.length > 0) {
      renderer.renderRTTNodes();
    }

    // Fill quads buffer
    this.addQuads(this.root);

    // Perform render pass
    renderer?.render();

    this.calculateFps();

    // Reset renderRequested flag if it was set
    if (renderRequested) {
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

  addQuads(node: CoreNode) {
    assertTruthy(this.renderer && node.globalTransform);

    if (node.isRenderable) {
      node.renderQuads(this.renderer);
    }

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];

      if (!child) {
        continue;
      }

      if (child?.worldAlpha === 0) {
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
   * Will always return at least a canvas renderer if no other suitable renderer can be resolved.
   *
   * @param fontFamily
   * @param textRendererOverride
   * @returns
   */
  resolveTextRenderer(
    trProps: TrProps,
    textRendererOverride: keyof TextRendererMap | null = null,
  ): TextRenderer {
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
        if (trId === 'canvas') {
          // Canvas is always a fallback
          continue;
        }
        if (tr.canRenderFont(trProps)) {
          rendererId = trId as keyof TextRendererMap;
          break;
        }
      }
      if (!rendererId) {
        // If no renderer can be found, use the canvas renderer
        rendererId = 'canvas';
      }
    }

    if (overrideFallback) {
      console.warn(`Falling back to text renderer ${String(rendererId)}`);
    }

    // By now we are guaranteed to have a valid rendererId (at least Canvas);
    const resolvedTextRenderer = this.textRenderers[rendererId];
    assertTruthy(resolvedTextRenderer, 'resolvedTextRenderer undefined');

    // Need to explicitly cast to TextRenderer because TS doesn't like
    // the covariant state argument in the setter method map
    return resolvedTextRenderer as unknown as TextRenderer;
  }

  /**
   * Create a shader controller instance
   *
   * @param type
   * @param props
   * @returns
   */
  createShaderCtr(
    type: keyof ShaderMap,
    props: Record<string, unknown>,
  ): BaseShaderController {
    return this.shManager.loadShader(type, props);
  }

  createNode(props: Partial<CoreNodeProps>) {
    const resolvedProps = this.resolveNodeDefaults(props);
    return new CoreNode(this, resolvedProps);
  }

  createTextNode(props: Partial<CoreTextNodeProps>) {
    const fontSize = props.fontSize ?? 16;
    const resolvedProps = {
      ...this.resolveNodeDefaults(props),
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
    };

    return new CoreTextNode(this, resolvedProps);
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
      textureOptions: props.textureOptions ?? {},
      shader: props.shader ?? this.defShaderCtr,
      // Since setting the `src` will trigger a texture load, we need to set it after
      // we set the texture. Otherwise, problems happen.
      src: props.src ?? null,
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
}
