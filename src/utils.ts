export const boltProperties = [
  'x',
  'y',
  'z',
  'w',
  'h',
  'color',
  'alpha',
  'parentId',
  'textureId',
  'rtt',
  'scale',
  'rotation',
];

export const pipelineEvents = {
  created: 1,
  updated: 2,
  deleted: 4,
  attached: 8,
  detached: 16,
  onscreen: 32,
  offscreen: 64,
  progress: 128,
  finished: 256,
};

export function createWebGLContext(
  canvas: HTMLCanvasElement | OffscreenCanvas,
): WebGLRenderingContext | null {
  const config: WebGLContextAttributes = {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: true,
    desynchronized: false,
    failIfMajorPerformanceCaveat: true,
    powerPreference: 'high-performance',
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
  };
  return (
    canvas.getContext('webgl', config) ||
    canvas.getContext('experimental-webgl' as 'webgl', config)
  );
}
