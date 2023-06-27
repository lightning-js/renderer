import { Scene } from './scene/Scene.js';

import { startLoop, getTimeStamp } from './platform.js';

import { WebGlCoreRenderer } from './renderers/webgl/WebGlCoreRenderer.js';
import { assertTruthy } from '../utils.js';
import type { CoreRenderer } from './renderers/CoreRenderer.js';
import { AnimationManager } from './animations/AnimationManager.js';
import { CoreNode } from './CoreNode.js';
import { CoreTextureManager } from './CoreTextureManager.js';

let renderer: WebGlCoreRenderer | null = null;
const animationManager: AnimationManager = new AnimationManager();
let txManager: CoreTextureManager | null = null;

let scene: Scene | null = null;
const bufferMemory = 2e6;

const autoStart = true;
let deltaTime = 0;
let lastFrameTime = 0;
let currentFrameTime = 0;

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

const stage = {
  /**
   * Stage constructor
   */
  init(stageOptions: Required<StageOptions>) {
    const { canvas, clearColor, rootId, debug } = stageOptions;
    txManager = new CoreTextureManager();

    if (debug?.monitorTextureCache) {
      setInterval(() => {
        assertTruthy(txManager);
        const debugInfo = txManager.getDebugInfo();
        console.log('Texture ID Cache Size: ', debugInfo.idCacheSize);
        console.log('Texture Key Cache Size: ', debugInfo.keyCacheSize);
      }, 1000);
    }

    renderer = new WebGlCoreRenderer({
      stage,
      canvas,
      pixelRatio:
        stageOptions.devicePhysicalPixelRatio *
        stageOptions.deviceLogicalPixelRatio,
      clearColor,
      bufferMemory,
      txManager,
    });

    // Must do this after renderer is created
    txManager.renderer = renderer;

    // create root node
    const rootNode = new CoreNode(stage, {
      id: rootId,
    });

    scene = new Scene(rootNode);

    // execute platform start loop
    if (autoStart) {
      startLoop(stage);
    }
  },
  /**
   * Start a new frame draw
   */
  drawFrame() {
    if (!scene?.root) {
      return;
    }
    lastFrameTime = currentFrameTime;
    currentFrameTime = getTimeStamp();

    deltaTime = !lastFrameTime ? 100 / 6 : currentFrameTime - lastFrameTime;

    animationManager.update(deltaTime);

    renderer?.reset();

    this.addQuads(scene.root);

    // Temp: Test
    renderer?.render();

    // render(scene.root);
  },
  addQuads(node: CoreNode) {
    assertTruthy(renderer);

    node.renderQuads(renderer);

    node.children.forEach((child) => {
      this.addQuads(child);
    });
  },
  getRenderer(): CoreRenderer {
    return renderer as CoreRenderer;
  },
  getRootNode() {
    return scene?.root || null;
  },
  getDeltaTime() {
    return deltaTime;
  },
  getScene() {
    return scene;
  },
  getAnimationManager() {
    return animationManager;
  },
  getTextureManager() {
    return txManager;
  },
};

export type Stage = typeof stage;
export default stage;
