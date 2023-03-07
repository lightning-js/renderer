import {
  createWebGLContext,
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
} from './renderer.js';

let gl = null;
let renderer = null;
let usedMemory = 0;
let renderPrecision = 1;
let memoryPressure = 24e6;
let bufferMemory = 2e6;
let rootNode = null;

let autoStart = true;
let deltaTime = 0;
let lastFrameTime = 0;
let currentFrameTime = 0;

/**
 * Stage constructor
 */
export const init = ({ w, h, clearColor, context }) => {
  if (context) {
    gl = context;
    const system = getSystem();
    system.parameters = getWebGLParameters(gl);
    system.extensions = getWebGLExtensions(gl);
  }

  renderer = createRenderer(gl, clearColor, bufferMemory);

  // execute platform start loop
  if (autoStart) {
    startLoop();
  }
};

/**
 * Start a new frame draw
 */
export const drawFrame = () => {
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
};

export const handleDirty = (buffer, data) => {
  console.log('dirty');
  setUpdate(buffer, data);
};

export const getGlContext = () => {
  return gl;
};

export const getCanvas = () => {
  if (gl) {
    return gl.canvas;
  }
};

export const setRootNode = (node) => {
  rootNode = node;
};

export const getRootNode = () => {
  return rootNode;
};

export const getDeltaTime = () => {
  return deltaTime;
};
