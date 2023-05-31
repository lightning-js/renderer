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
let textureManager: CoreTextureManager | null = null;

let scene: Scene | null = null;
const bufferMemory = 2e6;

const autoStart = true;
let deltaTime = 0;
let lastFrameTime = 0;
let currentFrameTime = 0;

export interface StageOptions {
  rootId: number;
  w?: number;
  h?: number;
  canvas: HTMLCanvasElement | OffscreenCanvas;
  clearColor?: number;
}

const stage = {
  /**
   * Stage constructor
   */
  init({ canvas, clearColor, rootId }: Required<StageOptions>) {
    renderer = new WebGlCoreRenderer({
      stage,
      canvas,
      clearColor,
      bufferMemory,
    });

    textureManager = new CoreTextureManager(renderer);

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
    return textureManager;
  },
};

export type Stage = typeof stage;
export default stage;
