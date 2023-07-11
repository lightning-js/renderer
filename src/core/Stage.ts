import { Scene } from './scene/Scene.js';

import { startLoop, getTimeStamp } from './platform.js';

import { WebGlCoreRenderer } from './renderers/webgl/WebGlCoreRenderer.js';
import { assertTruthy } from '../utils.js';
import { AnimationManager } from './animations/AnimationManager.js';
import { CoreNode } from './CoreNode.js';
import { CoreTextureManager } from './CoreTextureManager.js';
import { CoreShaderManager } from './CoreShaderManager.js';

export interface StageOptions {
  rootId: number;
  deviceLogicalPixelRatio: number;
  devicePhysicalPixelRatio: number;
  canvas: HTMLCanvasElement | OffscreenCanvas;
  clearColor?: number;
  debug?: {
    monitorTextureCache?: boolean;
  };
}

const bufferMemory = 2e6;
const autoStart = true;

export class Stage {
  /// Module Instances
  public readonly animationManager: AnimationManager;
  public readonly txManager: CoreTextureManager;
  public readonly shManager: CoreShaderManager;
  public readonly renderer: WebGlCoreRenderer;
  private scene: Scene;

  /// State
  deltaTime = 0;
  lastFrameTime = 0;
  currentFrameTime = 0;

  /**
   * Stage constructor
   */
  constructor(stageOptions: StageOptions) {
    const { canvas, clearColor, rootId, debug } = stageOptions;
    this.txManager = new CoreTextureManager();
    this.shManager = new CoreShaderManager();
    this.animationManager = new AnimationManager();

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
        stageOptions.devicePhysicalPixelRatio *
        stageOptions.deviceLogicalPixelRatio,
      clearColor: clearColor ?? 0xff3677e0,
      bufferMemory,
      txManager: this.txManager,
      shManager: this.shManager,
    });

    // Must do this after renderer is created
    this.txManager.renderer = this.renderer;

    // create root node
    const rootNode = new CoreNode(this, {
      id: rootId,
    });

    this.scene = new Scene(rootNode);

    // execute platform start loop
    if (autoStart) {
      startLoop(this);
    }
  }
  /**
   * Start a new frame draw
   */
  drawFrame() {
    const { renderer, scene, animationManager } = this;
    if (!scene?.root) {
      return;
    }
    this.lastFrameTime = this.currentFrameTime;
    this.currentFrameTime = getTimeStamp();

    this.deltaTime = !this.lastFrameTime
      ? 100 / 6
      : this.currentFrameTime - this.lastFrameTime;

    animationManager.update(this.deltaTime);

    renderer?.reset();

    this.addQuads(scene.root);

    // Temp: Test
    renderer?.render();

    // render(scene.root);
  }
  addQuads(node: CoreNode) {
    assertTruthy(this.renderer);

    node.renderQuads(this.renderer);

    node.children.forEach((child) => {
      this.addQuads(child);
    });
  }

  //#region Properties

  get root() {
    return this.scene?.root || null;
  }

  //#endregion Properties
}
