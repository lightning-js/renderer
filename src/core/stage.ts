import type { Node } from './scene/Node.js';
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
  update,
  render,
  hasUpdates,
  setUpdate,
  type InitData,
} from './renderer.js';

let gl: WebGLRenderingContext | null = null;

let renderer: any;
let scene: Scene;
const bufferMemory = 2e6;
let rootNode: Node;

const autoStart = true;
let deltaTime = 0;
let lastFrameTime = 0;
let currentFrameTime = 0;

export interface StageOptions {
  elementId?: number;
  w?: number;
  h?: number;
  context: WebGLRenderingContext;
  clearColor?: number;
}

export default {
  /**
   * Stage constructor
   */
  init({ clearColor, context }: Required<StageOptions>) {
    if (context) {
      gl = context;
      scene = new Scene();
      rootNode = scene.root;
      const system = getSystem();
      system.parameters = getWebGLParameters(context);
      system.extensions = getWebGLExtensions(context);
    }

    renderer = createRenderer(context, clearColor, bufferMemory);

    // execute platform start loop
    if (autoStart) {
      startLoop();
    }
  },
  /**
   * Start a new frame draw
   */
  drawFrame() {
    if (!gl || !rootNode) {
      return;
    }
    lastFrameTime = currentFrameTime;
    currentFrameTime = getTimeStamp();

    deltaTime = !lastFrameTime
      ? 1 / 60
      : (currentFrameTime - lastFrameTime) * 0.001;

    if (hasUpdates()) {
      update(rootNode);
    }

    gl.clear(gl.COLOR_BUFFER_BIT);
    render(rootNode);
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
    return scene?.root;
  },
  getDeltaTime() {
    return deltaTime;
  },
  getScene() {
    return scene;
  },
};
