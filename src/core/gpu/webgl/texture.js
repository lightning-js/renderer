import {uploadTextureData} from "../../platform.js";

export const createImageTexture = (gl, image, options = {}) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // multiply alpha channel in other color channels
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

    // linear texture filtering
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    // texture wrapping method
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    options.format = gl.RGBA;
    options.type = gl.UNSIGNED_BYTE;
    
    uploadTextureData(gl, image, options);

    return texture;
};

/**
 * Create 1x1 white pixel texture where rectangle can sample from
 * and keep tinting capabilities
 * @param gl
 */
export const createWhitePixelTexture = (gl) => {
    const pixelData = new Uint8Array([255, 255, 255, 255]);
    return createImageTexture(gl, pixelData, {
        w: 1, h: 1
    }); 
};