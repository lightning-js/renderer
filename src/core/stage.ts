import type { IRenderableNode } from './IRenderableNode.js';
import type { Node } from './node.js';
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
let renderer = null;
// TODO: Remove? We aren't using any of these
// const usedMemory = 0;
// const renderPrecision = 1;
// const memoryPressure = 24e6;
const bufferMemory = 2e6;
let rootNode: IRenderableNode | null = null;

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
  init({ clearColor, context }: Required<StageOptions>) {
    if (context) {
      gl = context;
      const system = getSystem();
      system.parameters = getWebGLParameters(context);
      system.extensions = getWebGLExtensions(context);
    }

    renderer = createRenderer(context, clearColor, bufferMemory);

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
    if (!gl || !rootNode) {
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
  setRootNode(node: IRenderableNode) {
    rootNode = node;
    console.log('Root Node', rootNode);
  },
  getRootNode() {
    return rootNode;
  },
  getDeltaTime() {
    return deltaTime;
  },
};

export type Stage = typeof stage;
export default stage;
