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
import { assertTruthy } from '../utils.js';
import { AnimationManager } from './animations/AnimationManager.js';
import { CoreNode } from './CoreNode.js';
import { CoreTextureManager } from './CoreTextureManager.js';
import { TrFontManager } from './text-rendering/TrFontManager.js';
import { CoreShaderManager } from './CoreShaderManager.js';
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

export interface StageOptions {
  rootId: number;
  appWidth: number;
  appHeight: number;
  deviceLogicalPixelRatio: number;
  devicePhysicalPixelRatio: number;
  canvas: HTMLCanvasElement | OffscreenCanvas;
  clearColor: number;
  fpsUpdateInterval: number;
  enableContextSpy: boolean;
  numImageWorkers: number;

  debug?: {
    monitorTextureCache?: boolean;
  };
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

export class Stage extends EventEmitter {
  /// Module Instances
  public readonly animationManager: AnimationManager;
  public readonly txManager: CoreTextureManager;
  public readonly fontManager: TrFontManager;
  public readonly textRenderers: Partial<TextRendererMap>;
  public readonly shManager: CoreShaderManager;
  public readonly renderer: WebGlCoreRenderer;
  public readonly root: CoreNode;

  /// State
  deltaTime = 0;
  lastFrameTime = 0;
  currentFrameTime = 0;
  private fpsNumFrames = 0;
  private fpsElapsedTime = 0;
  private renderRequested = false;

  /// Debug data
  contextSpy: ContextSpy | null = null;

  /**
   * Stage constructor
   */
  constructor(readonly options: StageOptions) {
    super();
    const {
      canvas,
      clearColor,
      rootId,
      debug,
      appWidth,
      appHeight,
      enableContextSpy,
      numImageWorkers,
    } = options;

    this.txManager = new CoreTextureManager(numImageWorkers);
    this.shManager = new CoreShaderManager();
    this.animationManager = new AnimationManager();
    this.contextSpy = enableContextSpy ? new ContextSpy() : null;

    if (debug?.monitorTextureCache) {
      setInterval(() => {
        assertTruthy(this.txManager);
        const debugInfo = this.txManager.getDebugInfo();
        console.log('Texture ID Cache Size: ', debugInfo.idCacheSize);
        console.log('Texture Key Cache Size: ', debugInfo.keyCacheSize);
      }, 1000);
    }

    this.renderer = new WebGlCoreRenderer({
      stage: this,
      canvas,
      pixelRatio:
        options.devicePhysicalPixelRatio * options.deviceLogicalPixelRatio,
      clearColor: clearColor ?? 0xff000000,
      bufferMemory,
      txManager: this.txManager,
      shManager: this.shManager,
      contextSpy: this.contextSpy,
    });

    // Must do this after renderer is created
    this.txManager.renderer = this.renderer;

    this.textRenderers = {
      canvas: new CanvasTextRenderer(this),
      sdf: new SdfTextRenderer(this),
    };
    this.fontManager = new TrFontManager(this.textRenderers);

    // create root node
    const rootNode = new CoreNode(this, {
      id: rootId,
      x: 0,
      y: 0,
      width: appWidth,
      height: appHeight,
      alpha: 1,
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
      textureOptions: null,
      shader: null,
      shaderProps: null,
      rtt: false,
    });

    this.root = rootNode;

    // execute platform start loop
    if (autoStart) {
      startLoop(this);
    }
  }

  /**
   * Update animations
   */
  updateAnimations() {
    const { animationManager } = this;
    if (!this.root) {
      return;
    }
    this.lastFrameTime = this.currentFrameTime;
    this.currentFrameTime = getTimeStamp();

    this.deltaTime = !this.lastFrameTime
      ? 100 / 6
      : this.currentFrameTime - this.lastFrameTime;

    this.emit('frameTick', {
      time: this.currentFrameTime,
      delta: this.deltaTime,
    });
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

    // Update tree if needed
    if (this.root.updateType !== 0) {
      this.root.update(this.deltaTime, this.root.clippingRect);
    }

    // test if we need to update the scene
    renderer?.reset();

    // If we have RTT nodes draw them first
    // So we can use them as textures in the main scene
    if (renderer.rttNodes.length > 0) {
      renderer.renderRTTNodes();
    }

    // Fill quads buffer
    this.addQuads(this.root);

    // Perform render pass
    renderer?.render();

    // Reset renderRequested flag if it was set
    if (renderRequested) {
      this.renderRequested = false;
    }

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
        this.emit('fpsUpdate', {
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
}
