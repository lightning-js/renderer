import type {
  TextureOptions,
  UInt8ArrayTextureOptions,
} from './gpu/webgl/texture.js';
import stage from './stage.js';

interface SystemObject {
  parameters: Partial<Record<string, number>>;
  extensions: Partial<Record<string, any>>;
}

const system: SystemObject = {
  parameters: {},
  extensions: {},
};
const events: Map<string, Listener[]> = new Map();
/**
 * Test if device we run on supports WebGL
 * @return {boolean}
 */
const deviceSupportsWebGL = (): boolean => {
  try {
    if (!WebGLRenderingContext) {
      return false;
    }

    const c: HTMLCanvasElement = document.createElement('canvas');
    const gl = c.getContext('webgl');

    const hasSupport = !!gl;
    if (gl) {
      const etxLose = gl.getExtension('WEBGL_lose_context');
      if (etxLose) {
        etxLose.loseContext();
      }
    }
    return hasSupport;
  } catch (e) {
    return false;
  }
};

/**
 * Flag webgl support
 * @type {boolean}
 */
const webglSupport = deviceSupportsWebGL();

/**
 * Setup WebGLRenderingContext
 * @param options
 * @return {WebGLRenderingContext}
 */
export const createWebGLContext = (
  options = { w: 1920, h: 1080, canvas: null },
) => {
  if (!webglSupport) {
    console.error('Browser is not supporting WebGL');
  }

  const config = {
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

  const canvas = options.canvas || document.createElement('canvas');
  const gl =
    canvas.getContext('webgl', config) ||
    canvas.getContext('experimental-webgl', config);

  canvas.width = options.w;
  canvas.height = options.h;

  return gl;
};

/**
 * Get device specific webgl parameters
 * @param gl
 * @return {*}
 */
export const getWebGLParameters = (gl: WebGLRenderingContext) => {
  return [
    'MAX_RENDERBUFFER_SIZE',
    'MAX_TEXTURE_SIZE',
    'MAX_VIEWPORT_DIMS',
    'MAX_VERTEX_TEXTURE_IMAGE_UNITS',
    'MAX_TEXTURE_IMAGE_UNITS',
    'MAX_COMBINED_TEXTURE_IMAGE_UNITS',
    'MAX_VERTEX_ATTRIBS',
    'MAX_VARYING_VECTORS',
    'MAX_VERTEX_UNIFORM_VECTORS',
    'MAX_FRAGMENT_UNIFORM_VECTORS',
  ].reduce<Partial<Record<string, number>>>((obj, param) => {
    obj[param] = gl.getParameter(
      gl[param as keyof WebGLRenderingContext] as GLenum,
    );
    return obj;
  }, {});
};

/**
 * Get device webgl extensions
 * @param gl
 * @return {*}-
 */
export const getWebGLExtensions = (gl: WebGLRenderingContext) => {
  return [
    'ANGLE_instanced_arrays',
    'WEBGL_compressed_texture_s3tc',
    'WEBGL_compressed_texture_astc',
    'WEBGL_compressed_texture_etc',
    'WEBGL_compressed_texture_etc1',
    'WEBGL_compressed_texture_pvrtc',
    'WEBKIT_WEBGL_compressed_texture_pvrtc',
    'WEBGL_compressed_texture_s3tc_srgb',
    'OES_vertex_array_object',
  ].reduce<Partial<Record<string, any>>>((obj, ext) => {
    obj[ext] = gl.getExtension(ext);
    return obj;
  }, {});
};

export const getSystem = () => {
  return system;
};

/**
 * Platform render loop initiator
 */
export const startLoop = () => {
  const loop = () => {
    emit('frameStart');
    stage.drawFrame();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
};

export const uploadImage = (src: string, hasAlphaChannel: boolean) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const isBase64 = src.substring(0, 5) === 'data:';

    if (!isBase64) {
      image.crossOrigin = 'Anonymous';
    }

    image.onload = () => {
      resolve({
        image,
        src,
        hasAlphaChannel,
      });
    };

    image.onerror = () => {
      reject();
    };

    image.src = src;
  });
};

/**
 * Move texture data to GPU
 * @param gl
 * @param source
 * @param options
 */
export const uploadTextureData = (
  gl: WebGLRenderingContext,
  source: ImageBitmap | Uint8Array,
  options: TextureOptions & Partial<UInt8ArrayTextureOptions>,
) => {
  if (source instanceof ImageBitmap) {
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      options.format,
      options.format,
      options.type,
      source,
    );
  } else {
    if (!options.w || !options.h) {
      throw new Error('Texture width and height must be specified');
    }
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      options.format,
      options.w,
      options.h,
      0,
      options.format,
      options.type,
      source,
    );
  }
};

/**
 * Return unix timestamp
 * @return {number}
 */
export const getTimeStamp = () => {
  return performance ? performance.now() : Date.now();
};

interface Listener {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (evt: unknown): void;
}

/**
 * Simple listener
 * @param event
 * @param listener
 */
export const on = (event: string, listener: Listener) => {
  if (!events.has(event)) {
    events.set(event, []);
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const listeners = events.get(event)!;
  listeners.push(listener);

  events.set(event, listeners);
};

export const emit = (event: string, data?: unknown) => {
  const listeners = events.get(event);
  if (!listeners) {
    return;
  }
  listeners.forEach((listener) => {
    listener(data);
  });
};

// document.addEventListener('keydown', (e) => {
//     if (keys[e.which]) {
//         emit(keys[e.which], e);
//         e.preventDefault();
//         return false;
//     }
// });

export const glParam = (param: string) => {
  return system.parameters[param];
};

const keys = {
  37: 'left',
  38: 'up',
  39: 'right',
  40: 'down',
};
