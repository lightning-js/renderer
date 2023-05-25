// import type {
//   TextureOptions,
//   UInt8ArrayTextureOptions,
// } from './gpu/webgl/texture.js';
// import stage from './stage.js';

import type { Stage } from './stage.js';

/**
 * Platform render loop initiator
 */
export const startLoop = (stage: Stage) => {
  const loop = () => {
    // emit('frameStart');
    stage.drawFrame();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
};

/**
 * Return unix timestamp
 * @return {number}
 */
export const getTimeStamp = () => {
  return performance ? performance.now() : Date.now();
};

// !!! See what to do with these
// interface Listener {
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   (evt: unknown): void;
// }

// /**
//  * Simple listener
//  * @param event
//  * @param listener
//  */
// export const on = (event: string, listener: Listener) => {
//   if (!events.has(event)) {
//     events.set(event, []);
//   }

//   // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
//   const listeners = events.get(event)!;
//   listeners.push(listener);

//   events.set(event, listeners);
// };

// export const emit = (event: string, data?: unknown) => {
//   const listeners = events.get(event);
//   if (!listeners) {
//     return;
//   }
//   listeners.forEach((listener) => {
//     listener(data);
//   });
// };

// // document.addEventListener('keydown', (e) => {
// //     if (keys[e.which]) {
// //         emit(keys[e.which], e);
// //         e.preventDefault();
// //         return false;
// //     }
// // });

// export const glParam = (param: string) => {
//   return system.parameters[param];
// };

// const keys = {
//   37: 'left',
//   38: 'up',
//   39: 'right',
//   40: 'down',
// };
