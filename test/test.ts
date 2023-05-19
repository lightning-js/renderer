import {
  MainRenderDriver,
  type INode,
  RendererMain,
  ThreadXRenderDriver,
} from '@lightningjs/renderer';
import RendererWorker from '@lightningjs/renderer/workers/renderer?worker';
import rocko from './rocko.png';
import elevator from './elevator.png';

import type { IAnimationController } from '../src/core/IAnimationController.js';

(async () => {
  const threadXDriver = new ThreadXRenderDriver({
    RendererWorker,
  });

  const mainDriver = new MainRenderDriver();

  const renderer = new RendererMain(
    {
      width: 1920,
      height: 1080,
    },
    'app',
    // mainDriver,
    threadXDriver,
  );

  await renderer.init();

  /*
   * redRect will persist and change color every frame
   * greenRect will persist and be detached and reattached to the root every second
   * blueRect will be created and destroyed every 500 ms
   */
  const redRect = renderer.createNode({
    x: 0,
    y: 0,
    w: 100,
    h: 100,
    color: 0x00ff0000,
    parent: renderer.root,
  });

  const greenRect = renderer.createNode({
    x: 100,
    y: 0,
    w: 100,
    h: 100,
    color: 0x0000ff00,
    parent: renderer.root,
  });

  const rockoRect = renderer.createNode({
    x: 0,
    y: 100,
    w: 181,
    h: 218,
    src: rocko,
    color: 0xffffffff,
    parent: renderer.root,
  });

  const elevatorRect = renderer.createNode({
    x: 400,
    y: 0,
    w: 200,
    h: 268,
    src: elevator,
    color: 0xff0000ff,
    parent: renderer.root,
  });

  // setTimeout required for ThreadX right now because the emit() that sends
  // the animation to the renderer worker doesn't work until the Node is fully
  // shared to the worker.
  setTimeout(async () => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      let animation = rockoRect
        .animate(
          {
            x: 200,
            y: 200,
          },
          1000,
        )
        .start();

      await animation.waitUntilStopped();
      animation = rockoRect
        .animate(
          {
            x: 0,
            y: 100,
          },
          1000,
        )
        .start();
      await animation.waitUntilStopped();
    }
  }, 1000);

  setTimeout(async () => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      let animation = rockoRect
        .animate(
          {
            x: 200,
            y: 200,
          },
          1000,
        )
        .start();

      await animation.waitUntilStopped();
      animation = rockoRect
        .animate(
          {
            x: 0,
            y: 100,
          },
          1000,
        )
        .start();
      await animation.waitUntilStopped();
    }
  }, 1000);

  let elevatorAnimation: IAnimationController | null = null;
  setTimeout(async () => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      elevatorRect.color = 0xff0000ff;
      elevatorAnimation = elevatorRect
        .animate(
          {
            y: 1080 - elevatorRect.h,
          },
          1000,
        )
        .start();

      await elevatorAnimation.waitUntilStopped();
      elevatorRect.color = 0xff00ff00;
      elevatorAnimation = elevatorRect
        .animate(
          {
            y: 0,
          },
          1000,
        )
        .start();
      await elevatorAnimation.waitUntilStopped();
    }
  }, 1000);

  // If user presses the spacebar, pause the animation
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyQ') {
      if (elevatorAnimation) {
        if (elevatorAnimation.state === 'running') elevatorAnimation.pause();
        else elevatorAnimation.start();
      }
    } else if (e.code === 'KeyW') {
      if (elevatorAnimation) {
        elevatorAnimation.stop();
      }
    }
  });

  let blueRect: INode | null = null;

  const interval = setInterval(() => {
    redRect.color++;
  }, 0);

  setInterval(() => {
    if (blueRect) {
      blueRect.destroy();
      blueRect = null;
    } else {
      blueRect = renderer.createNode({
        x: 200,
        y: 0,
        w: 100,
        h: 100,
        color: 0x000000ff,
        parent: renderer.root,
      });
    }
  }, 500);

  setInterval(() => {
    if (greenRect.parent) {
      greenRect.parent = null;
    } else {
      greenRect.parent = renderer.root;
    }
  }, 1000);

  console.log('ready!');
})().catch((err) => {
  console.error(err);
});
