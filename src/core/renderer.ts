import {createProgram, defaultVert, defaultFrag, batchedVert, batchedFrag} from "./gpu/webgl/index.js";
import {normalizeARGB} from "./utils.js";
import {glParam} from "./platform.js";

let gl = null;
let vertexBuffer = null;

const programs = new Map();
let activeProgram = null;
export const createRenderer = (glContext, clearColor = 0xff000000, bufferMemory) => {
    // normalized rgb components
    const color = normalizeARGB(clearColor);

    gl = glContext;
    gl.viewport(0, 0, 1920, 1080);
    gl.clearColor(color[0], color[1], color[2], color[3]);

    initPrograms();

    // setup positions buffer
    vertexBuffer = gl.createBuffer(); 

    // allocate memory chunk
    createIndices(bufferMemory);

    // bind new positionBuffer
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
};

export const update = (root) => {

};

export const render = (root) => {
    // fill vbo
    const {buffer, textures} = createBuffer(root, [], []);

    // use default shader
    if (!activeProgram) {
        activeProgram = programs.get('batched');
        gl.useProgram(
            activeProgram.program
        );

        activeProgram.enableAttributes();
        activeProgram.enableUniforms();
    } 

    // bind multiple samplers if needed
    if (textures.length) {
        bindTextureArray(textures);
    }

    // buffer vertex positions and color
    gl.bufferData(
        gl.ARRAY_BUFFER, new Float32Array(buffer), gl.STATIC_DRAW
    );

    // execute draw 9 attribs x bytes per element
    gl.drawElements(gl.TRIANGLES, 6 * (buffer.length / 36), gl.UNSIGNED_SHORT, 0);
};

/**
 * Simple VBO buffer
 * @param node
 * @param buffer
 * @param textures
 * @return {*} 
 */

const createBuffer = (node, buffer, textures) => {
    const {w, h, color, texture, id, alpha} = node;
    const [x, y, z] = node.getTranslate();
    let textureUnit = 0;
  
    color[3] = parseFloat(alpha);

    if (!textures.length) {
        textures.push(texture);
    } else {
        textureUnit = textures.indexOf(texture);
        if (textureUnit === -1) {
            textures.push(texture);
            textureUnit = textures.length - 1;
        }
    }
    const x1 = x;
    const x2 = x + w; 
    const y1 = y;
    const y2 = y + h;
    
    buffer.push(
        x1, y1, ...color, 0, 0, textureUnit,
        x2, y1, ...color,  1, 0, textureUnit,
        x1, y2, ...color,  0, 1, textureUnit,
        x2, y2, ...color,  1, 1, textureUnit
    );


    if (node.children.length) {
        for (let i = 0; i < node.children.length; i++) {
            createBuffer(node.children[i], buffer, textures);
        }
    }
    return {buffer, textures};
};

/**
 * Allocate big memory chunk that we
 * can re-use to draw quads
 * @param size
 */
const createIndices = (size) => {
    const maxQuads = ~~(size / 80);
    const indices = new Uint16Array(maxQuads * 6);

    for (let i = 0, j = 0; i < maxQuads; i += 6, j += 4) {
        indices[i] = j;
        indices[i + 1] = j + 1;
        indices[i + 2] = j + 2;
        indices[i + 3] = j + 2;
        indices[i + 4] = j + 1;
        indices[i + 5] = j + 3;
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
};

const bindTextureArray = (textures) => {
    const len = textures.length; 
    for (let i = 0; i < len; i++) {
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, textures[i]);
    }

    const samplers = Array.from(
        Array(len).keys()
    );

    const texturesLocation = gl.getUniformLocation(activeProgram.program, 'u_textures[0]');
    gl.uniform1iv(texturesLocation, samplers);
};


const initPrograms = () => {
    programs.set('default',
        createProgram({vs: defaultVert, fs: defaultFrag})
    );
    programs.set('batched',
        createProgram({
            vs: batchedVert, fs: batchedFrag( 
               glParam('MAX_VERTEX_TEXTURE_IMAGE_UNITS')  
            )
        })  
    );
}; 


export const hasUpdates = () => {
    return true;
};