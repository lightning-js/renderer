import type { IRenderableNode } from './IRenderableNode.js';
import { Scene } from './scene/Scene.js';

import {
  getSystem,
  getWebGLParameters,
  getWebGLExtensions,
  startLoop,
  getTimeStamp,
} from './platform.js';

import {
  createRenderer,
  render,
  setUpdate,
  type InitData,
} from './renderer.js';

let gl: WebGLRenderingContext | null = null;

let scene: Scene | null = null;
const bufferMemory = 2e6;

const autoStart = true;
let deltaTime = 0;
let lastFrameTime = 0;
let currentFrameTime = 0;

export interface StageOptions {
  rootNode: IRenderableNode;
  w?: number;
  h?: number;
  context: WebGLRenderingContext;
  clearColor?: number;
}

let resolveReady: () => void;
const readyPromise = new Promise<void>((resolve) => {
  resolveReady = resolve;
});

const stage = {
  /**
   * Stage constructor
   */
  init({ context, clearColor, rootNode }: Required<StageOptions>) {
    if (context) {
      gl = context;
      scene = new Scene(rootNode);
      const system = getSystem();
      system.parameters = getWebGLParameters(context);
      system.extensions = getWebGLExtensions(context);
    }

    createRenderer(context, clearColor, bufferMemory);

    // execute platform start loop
    if (autoStart) {
      startLoop();
    }
    resolveReady();
  },
  async ready(): Promise<void> {
    return readyPromise;
  },
  /**
   * Start a new frame draw
   */
  drawFrame() {
    if (!gl || !scene?.root) {
      return;
    }
    lastFrameTime = currentFrameTime;
    currentFrameTime = getTimeStamp();

    deltaTime = !lastFrameTime
      ? 1 / 60
      : (currentFrameTime - lastFrameTime) * 0.001;

    // TODO: This doesn't do anything yet so commenting it out
    // if (hasUpdates()) {
    //   update(rootNode);
    // }

    gl.clear(gl.COLOR_BUFFER_BIT);
    render(scene.root);
  },
  handleDirty(buffer: Int32Array, data: InitData) {
    console.log('dirty');
    setUpdate(buffer, data);
  },
  getGlContext() {
    return gl;
  },
  getCanvas() {
    if (gl) {
      return gl.canvas;
    }
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
};

export type Stage = typeof stage;
export default stage;
