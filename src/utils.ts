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
    // TODO: Remove this assertion once this issue is fixed in TypeScript
    // https://github.com/microsoft/TypeScript/issues/53614
    (canvas.getContext('webgl', config) ||
      canvas.getContext(
        'experimental-webgl' as 'webgl',
        config,
      )) as unknown as WebGLRenderingContext | null
  );
}

export async function loadImage(src: string) {
  const response = await fetch(src);
  const blob = await response.blob();
  try {
    return await createImageBitmap(blob, {
      premultiplyAlpha: 'premultiply',
      colorSpaceConversion: 'none',
      // @ts-expect-error should be fixed in next ts release
      imageOrientation: 'none',
    });
  } catch (e) {
    console.log('ERROR:', src, e);
  }
}

/**
 * Asserts a condition is truthy, otherwise throws an error
 *
 * @remarks
 * Useful at the top of functions to ensure certain conditions, arguments and
 * properties are set/met before continuing. When using this function,
 * TypeScript will narrow away falsy types from the condition.
 *
 * @param condition
 * @param message
 * @returns
 */
export function assertTruthy(
  condition: unknown,
  message?: string,
): asserts condition {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}
