import type { IRenderableNode } from './IRenderableNode.js';
import { Scene } from './scene/Scene.js';

import { startLoop, getTimeStamp } from './platform.js';

import { WebGlCoreRenderer } from './renderers/webgl/WebGlCoreRenderer.js';
import { assertTruthy } from '../utils.js';
import type { CoreRenderer } from './renderers/CoreRenderer.js';
import { AnimationManager } from './animations/AnimationManager.js';

let renderer: WebGlCoreRenderer | null = null;
const animationManager: AnimationManager = new AnimationManager();

let scene: Scene | null = null;
const bufferMemory = 2e6;

const autoStart = true;
let deltaTime = 0;
let lastFrameTime = 0;
let currentFrameTime = 0;

export interface StageOptions {
  /**
   * Factory method that the stage uses to create the Root Node
   *
   * @remarks
   * This method is provided by the IRenderDriver implementation
   *
   * @privateRemarks
   * This (or something like this) is required because the stage is responsible
   * for creating the Root node, while all other nodes are created by the
   * User App code.
   *
   * @param stage
   * @returns
   */
  createRootNode: (stage: Stage) => IRenderableNode;
  w?: number;
  h?: number;
  canvas: HTMLCanvasElement | OffscreenCanvas;
  clearColor?: number;
}

const stage = {
  /**
   * Stage constructor
   */
  init({ canvas, clearColor, createRootNode }: Required<StageOptions>) {
    renderer = new WebGlCoreRenderer({
      canvas,
      clearColor,
      bufferMemory,
    });

    // create root node
    const rootNode = createRootNode(stage);
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
  addQuads(node: IRenderableNode) {
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
};

export type Stage = typeof stage;
export default stage;
