import {drawFrame} from "./stage.js"; 
const system = {
    parameters: {},
    extensions: {}
};
const events = new Map();
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
        let gl: WebGLRenderingContext = c.getContext('webgl');
         
        const hasSupport = !!gl;
        if (gl) {
            const etxLose = gl.getExtension('WEBGL_lose_context');
            if (etxLose) {
                etxLose.loseContext();
            }
        }
        gl = null;
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
export const createWebGLContext = (options = {w: 1920, h: 1080, canvas:null}) => {
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
        powerPreference: "high-performance",
        premultipliedAlpha: true,
        preserveDrawingBuffer: false
    };

    const canvas = options.canvas || document.createElement('canvas');
    const gl = canvas.getContext('webgl', config) || canvas.getContext('experimental-webgl', config);

    canvas.width = options.w;
    canvas.height = options.h;

    return gl;

};

/**
 * Get device specific webgl parameters
 * @param gl
 * @return {*}
 */
export const getWebGLParameters = (gl) => {
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
        'MAX_FRAGMENT_UNIFORM_VECTORS'
    ].reduce((obj, param) => {
        obj[param] = gl.getParameter(gl[param]);
        return obj;
    }, {});
};

/**
 * Get device webgl extensions
 * @param gl
 * @return {*}-
 */
export const getWebGLExtensions = (gl) => {
    return [
        'ANGLE_instanced_arrays',
        'WEBGL_compressed_texture_s3tc',
        'WEBGL_compressed_texture_astc',
        'WEBGL_compressed_texture_etc',
        'WEBGL_compressed_texture_etc1',
        'WEBGL_compressed_texture_pvrtc',
        'WEBKIT_WEBGL_compressed_texture_pvrtc',
        'WEBGL_compressed_texture_s3tc_srgb',
        'OES_vertex_array_object'
    ].reduce((obj, ext) => {
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
        drawFrame();
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
};

export const uploadImage = (src, hasAlphaChannel) => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const isBase64 = src.substring(0, 5) === 'data:';

        if (!isBase64) {
            image.crossOrigin = 'Anonymous';
        }

        image.onload = () => {
            resolve({
                image, src, hasAlphaChannel
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
export const uploadTextureData = (gl, source, options) => {
    if (source instanceof ImageBitmap) {
        gl.texImage2D(
            gl.TEXTURE_2D, 0, options.format, options.format, options.type, source
        );
    } else {
        gl.texImage2D(
            gl.TEXTURE_2D, 0, options.format, options.w, options.h, 0, options.format, options.type, source
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

/**
 * Simple listener
 * @param event
 * @param listener
 */
export const on = (event, listener) => {
    if (!events.has(event)) {
        events.set(event, []);
    }

    const listeners = events.get(event);
    listeners.push(listener);

    events.set(event, listeners);
};

export const emit = (event, data?) => {
    if (events.has(event)) {
        const listeners = events.get(event);
        listeners.forEach((listener) => {
            listener(data);
        });
    }
};

// document.addEventListener('keydown', (e) => {
//     if (keys[e.which]) {
//         emit(keys[e.which], e);
//         e.preventDefault();
//         return false;
//     }
// });

export const glParam = (param)=>{
    return system.parameters[param];
}

const keys = {
    37: 'left', 38:'up', 39: 'right', 40: 'down'
};


