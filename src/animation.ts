// import { createWorker } from "../../threadx.js";
// const PROCESS_NAME = 'animation';
// let thx;
// let rafStarted = false;
// let deltaTime = 0;
// let lastFrameTime = 0;
// let currentFrameTime = 0;

// // sharedArray config
// const thrxConfig = {
//     id: PROCESS_NAME,
//     provides: {
//         progress: {
//             array: 'int32',
//             length: 2e4,
//             mapping: [
//                 'boltId', 'property', 'value', 'event'
//             ]
//         }
//     }
// }
// // create worker
// createWorker(PROCESS_NAME, thrxConfig).then(({ machine }) => {
//     thx = machine;
//     initWorker();
// });

// /** 
//  * Initialize worker thread. Will run after 
//  * SharedArray have been shared by main thread
//  */
// const initWorker = (): void => {
//     thx.on('main.animation', (data) => {
//         if (!rafStarted) {
//             rafStarted = true;
//             requestAnimationFrame(loop);
//         }
//         startAnimation(data);
//     })
// }

// const loop = () => {
//     progress();
//     requestAnimationFrame(loop);
// };

// const progress = () => {
//     lastFrameTime = currentFrameTime;
//     currentFrameTime = getTimeStamp();
//     deltaTime = !lastFrameTime ? 1 / 60 : (currentFrameTime - lastFrameTime) * 0.001;
// }

// /**
//  * Return unix timestamp
//  * @return {number}
//  */
//  export const getTimeStamp = () => {
//     return performance ? performance.now() : Date.now();
// };


// const startAnimation = (data) => {

//     const {boltId, property, from, to, duration, delay } = data[0];
//     const diff = to - from;
//     const iterations = 60 * duration;
//     const inc = iterations / diff;
//     let current = from;
//     let i = 0;



//     const iId = setInterval(() => {
//         current += inc;
//         if (current < to) {
//             thx.send('progress', {
//                 boltId, property, value: current, event: 128
//             })
//         } else {
//             thx.send('progress', {
//                 boltId, property, value: current, event: 256
//             })
//             clearInterval(iId);
//         }
//     }, 1 / 60);
// }
