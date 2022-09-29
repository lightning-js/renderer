// import { on } from "../../keyhandling.js";
// import { createMachine, WORKER_MESSAGES } from "../../threadx.js"
// import { mainView } from "./template.js";
// import { boltProperties as props } from "./utils.js";

// // create exchange main for main thread
// const thx = createMachine('main');

// export const init = (): void => {
//     const offscreen = setupOffscreenCanvas();
//     if (offscreen) {
//         thx.sendWorker('gl', WORKER_MESSAGES.OFFSCREEN_CANVAS, { 
//             offscreen 
//         });
//     }
// }

// export const setupOffscreenCanvas = (element?: ICanvas | undefined) => {
//     let canvas = element;
//     if (!element) {
//         canvas = document.createElement('canvas');
//         canvas.width = 1920;
//         canvas.height = 1080;
//         canvas.style.backgroundColor = '#000000';
//         document.body.appendChild(canvas);
//     }
//     if (typeof canvas.transferControlToOffscreen === "function") {
//         return canvas.transferControlToOffscreen();
//     }
//     return null;
// }

// on('left', () => {
//     mainView(thx);
// })

// on('right', () => {
//     thx.send('animation', {
//         memId: 1,
//         nodeId: 2,
//         boltId: 2,
//         property: props.indexOf("x"),
//         from: 50,
//         to: 350,
//         duration: 10,
//         delay: 0,
//     })
// })

// on('up', () => {
//     thx.send('animation', {
//         memId: 1,
//         nodeId: 2,
//         boltId: 2,
//         property: props.indexOf("rotation"),
//         from: 100,
//         to: 200,
//         duration: 10,
//         delay: 0,
//     })
// })

// on('down',()=>{
//     thx.send('mutations', [{
//         boltId: 2,
//         property: props.indexOf("y"),
//         compare: 50,
//         value: -100
//     },{
//         boltId: 2,
//         property: props.indexOf("w"),
//         compare: 50,
//         value: 500
//     },{
//         boltId: 2,
//         property: props.indexOf("h"),
//         compare: 50,
//         value: 1080
//     },{
//         boltId: 4,
//         property: props.indexOf("color"),
//         compare: 50,
//         value: 0xff000000
//     }])

    
// })

// export const thrxConfig = {
//     id: 'main',
//     provides: {
//         bolt: {
//             array: 'int32',
//             length: 2e6,
//             allowMissing:true,
//             useQueue: true,
//             mapping: [
//                 'memId', 'nodeId', 'boltId', 'parentId', 'w', 'h', 'x', 'y', 'z', 'color', 'alpha', 'parentAlpha', 'textureId'
//             ]
//         },
//         animation: {
//             array: 'int32',
//             length: 40,
//             mapping: [
//                 'memId', 'nodeId', 'boltId', 'property', 'from', 'to', 'duration', 'delay'
//             ]
//         },
//         mutations: {
//             array: 'int32',
//             length: 1e3,
//             allowMissing:true,
//             useQueue: true,
//             mapping: [
//                 'boltId','property','compare','value'
//             ]
//         },
//         textureSource: {
//             array: 'int32',
//             length: 1e4,
//             mode: 'dynamic',
//             mapping: [
//                 'length'
//             ]
//         }
//     }
// }
