import threadx from "@lightningjs/threadx"
import application from "./core/application.js"
import { boltProperties as props } from "./utils.js";
import createNode from "./core/node.js"

let canvas = null; 
let gl = null;
let app = null;
const nodes = new Map();

self.addEventListener('message', ({ data:{event, payload} }) => {
    if (event === "canvas") {
        canvas = payload.offscreenCanvas
        gl = createWebGLContext(canvas);
        app = application({
            w: 1920, h: 1080, context: gl
        }); 
    }
})

threadx.listen('main.bolt',(data)=>{
    data.forEach((el)=>{
        const { w, h, x, y, color, elementId, parentId } = el;
        const root = app.root;
        const node = createNode({
            w, h, x, y, color: 0xFFFFFFFF + color + 1, elementId
        })
        if(nodes.has(parentId)){
            node.parent = nodes.get(parentId);
        }else{
            node.parent = root;
        }  
        // look up
        nodes.set(elementId, node);
    })        
    
})

threadx.listen('main.text',(data)=>{
    console.log("text buffer:", data)
})

threadx.listen('animation.progress', (data)=>{
    console.log("animation data received:", data)
})

const createWebGLContext = (canvas) => {
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
    }
    return canvas.getContext('webgl', config) || canvas.getContext('experimental-webgl', config)
}

// /** 
//  * Initialize worker thread. Will run after 
//  * SharedArray have been shared by main thread
//  */
// self.addEventListener('message', ({ data }: SharedWorkerPayload) => {
//     const { event, payload } = data;
//     if (event === WORKER_MESSAGES.OFFSCREEN_CANVAS) {
//         canvas = payload.offscreen;
//         gl = createWebGLContext(canvas);
//         app = application({
//             w: 1920, h: 1080, context: gl
//         });
//     }
// });

// const initWorker = (): void => {
//     // listen to new objects
//     thx.on('main.bolt', (data) => {  
//         data.forEach((el)=>{
//             const { w, h, x, y, color, boltId, parentId } = el;
//             const root = app.root;
//             const node = createNode({
//                 w, h, x, y, color: 0xFFFFFFFF + color + 1, boltId
//             })
//             if(nodes.has(parentId)){
//                 node.parent = nodes.get(parentId);
//             }else{
//                 node.parent = root;
//             }  
//             // look up
//             nodes.set(boltId, node);
//         })        
//     });

//     // listen to animation progress
//     thx.on('animation.progress', (list) => {
//         const { property, value, boltId } = list[0];
//         const el = nodes.get(boltId);        
//         if(el){
//             el[props[property]] = value;
//         }        
//     })

//     thx.on('main.textureSource', (data) => {
//         const { count, dataView, offset, memoryLocation } = data;
//         const decoder = new TextDecoder();
//         const uint8 = new Uint8Array(dataView.slice(offset, count + offset));
//         const source = decoder.decode(uint8);

//         loadImage(source).then((data) => {
//             const node = nodes.get(memoryLocation);
//             if (node) {
//                 node.imageBitmap = data;
//             }
//         })
//     });

//     thx.on('main.mutations',(data)=>{
//         data.forEach((el)=>{
//             const { boltId, property, compare, value } = el;
//             const node = nodes.get(boltId);   
//             if(node){
//                 node[props[property]] = value;
//             } 
//         })
//     })
// };

const loadImage = async (src) => {
    const response = await fetch(src);
    const blob = await response.blob();

    return await createImageBitmap(
        blob, {
            premultiplyAlpha: 'premultiply',
            colorSpaceConversion: 'none',
            // @ts-expect-error
            // Bug in TypeScript 5.0.0-beta seemingly not allowing this property to be set to 'none'
            // https://github.com/microsoft/TypeScript/issues/53053
            imageOrientation: 'none'
        }
    )

}
