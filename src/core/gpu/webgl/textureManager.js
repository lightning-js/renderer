import {uploadImage} from "../../platform.js";
import {createImageTexture, createWhitePixelTexture} from "./texture.js";
import {getGlContext} from "../../stage.js";

/**
 * Amount of used memory defined in pixels
 * @type {number}
 */
let usedMemory = 0;

/**
 * All uploaded textures
 * @type {Array}
 */
let textureSources = [];

/**
 * Lookup id to tx source
 * @type {Map<String, any>}
 */
const textureSourceHashMap = new Map();

/**
 * Return cached texture or create new
 * @param options
 * @return {Promise<any>}
 */
export const getTexture = (options) => {
    const {type, src: source, id} = options;
    const gl = getGlContext();

    return new Promise((resolve, reject) => {
        if (!hasTexture(id)) {
            // store empty placeholder while loading
            setTexture(source, null);

            if (type === "image") {
                // let platform upload image
                uploadImage(source, true).then(({image}) => {
                    resolve(textureLoaded(
                        createImageTexture(gl, image), id
                    ));
                });
            } else if (type === "rectangle") {
                resolve(textureLoaded(
                    createWhitePixelTexture(gl), id
                ));
            }else if (type === "imageBitmap"){
                resolve(textureLoaded(
                    createImageTexture(gl, source), id
                ));
            }
        } else {
            resolve(textureSourceHashMap.get(id));
        }
    });
};

export const hasTexture = (source) => {
    return textureSourceHashMap.has(source);
};


const setTexture = (id, texture) => {
    textureSourceHashMap.set(id, texture);
};

const removeTexture = (id) => {
    if (hasTexture(id)) {
        textureSourceHashMap.delete(id);
    }
};

const textureLoaded = (texture, id) => {
    if (texture) {
        setTexture(id, texture);
    } else {
        // remove placeholder
        removeTexture(id);
    }
    return texture;
};