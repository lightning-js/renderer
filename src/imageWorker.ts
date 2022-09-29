// import { createWorker, WORKER_MESSAGES } from "../../threadx.js";
// import application from "./core/application.js"
// import { boltProperties as props } from "./utils.js";
// import { SharedWorkerPayload } from "../../types.d";
// import createNode from "./core/node.js"
// const PROCESS_NAME = 'imageWorker';

// let thx;
// let canvas;
// let gl;
// let app;
// let nodes = new Map();

// // sharedArray config 
// const thrxConfig = {
//     id: PROCESS_NAME,
//     provides: {
//         imageData: {
//             array: 'int32',
//             length: 2e4,
//             mode: 'dynamic',
//             mapping: [
//                 'boltId', '@event'
//             ]
//         }
//     }
// }

// // create worker
// createWorker(PROCESS_NAME, thrxConfig).then(({ machine }) => {
//     thx = machine;
//     initWorker();
// });


// const initWorker = (): void => {    
//     thx.on('main.textureSource',(data)=>{
//         const {count, dataView, offset, memoryLocation} = data;
//         const decoder = new TextDecoder();
//         const uint8 = new Uint8Array(dataView.slice(offset, count + offset));
//         const source = decoder.decode(uint8);
        
//         loadImage(source).then(()=>{

//         })
//     })
// }

// const loadImage = async (src)=>{
//     const response = await fetch(src);
//     const blob = await response.blob();
//     const imageData = await createImageBitmap(
//         blob, {
//             premultiplyAlpha: 'premultiply', colorSpaceConversion: 'none', imageOrientation: 'none'
//         }
//     )
// }