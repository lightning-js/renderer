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

  const screen = {
    width: 1920,
    height: 1080,
  };

  const renderer = new RendererMain(
    screen,
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

  const shaft = renderer.createNode({
    x: 395,
    y: 0,
    w: 210,
    h: screen.height,
    color: 0xffffffff,
    texture: renderer.makeTexture('NoiseTexture', {
      w: 210,
      h: screen.height,
    }),
    parent: renderer.root,
  });

  renderer.createNode({
    x: 395 + 210,
    y: 230,
    w: screen.width - 400,
    h: 50,
    texture: renderer.makeTexture('NoiseTexture', {
      w: screen.width - 400,
      h: 50,
    }),
    color: 0xffaabb66,
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

  const rockoRect = renderer.createNode({
    x: -181,
    y: screen.height - 218,
    w: 181,
    h: 218,
    src: rocko,
    color: 0xffffffff,
    parent: renderer.root,
  });

  setInterval(() => {
    shaft.texture = renderer.makeTexture(
      'NoiseTexture',
      {
        w: 210,
        h: screen.height,
        cacheId: Math.floor(Math.random() * 100000),
      },
      {
        preload: true,
      },
    );
  }, 10);

  // setTimeout required for ThreadX right now because the emit() that sends
  // the animation to the renderer worker doesn't work until the Node is fully
  // shared to the worker.
  let rockoAnimation: IAnimationController | null = null;
  setTimeout(async () => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      rockoAnimation = rockoRect.animate({}, 1000).start();
      await rockoAnimation.waitUntilStopped();

      rockoAnimation = rockoRect
        .animate(
          {
            x: 400,
          },
          1000,
        )
        .start();
      await rockoAnimation.waitUntilStopped();

      rockoAnimation = rockoRect
        .animate(
          {
            y: elevatorRect.h - rockoRect.h,
          },
          1000,
        )
        .start();
      await rockoAnimation.waitUntilStopped();

      rockoAnimation = rockoRect
        .animate(
          {
            x: screen.width,
            // y: 100,
          },
          2616,
        )
        .start();
      await rockoAnimation.waitUntilStopped();

      console.log('resetting rocko');
      rockoRect.x = -rockoRect.w;
      rockoRect.y = screen.height - 218;
      rockoRect.flush();
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

      elevatorAnimation = elevatorRect
        .animate(
          {
            // y: 1080 - elevatorRect.h,
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

      elevatorRect.color = 0xff00ff00;
      elevatorAnimation = elevatorRect
        .animate(
          {
            // y: 0,
          },
          2616,
        )
        .start();
      await elevatorAnimation.waitUntilStopped();
    }
  }, 1000);

  // If user presses the spacebar, pause the animation
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyQ') {
      if (elevatorAnimation && rockoAnimation) {
        if (elevatorAnimation.state === 'running') elevatorAnimation.pause();
        else elevatorAnimation.start();
        if (rockoAnimation.state === 'running') rockoAnimation.pause();
        else rockoAnimation.start();
      }
    } else if (e.code === 'KeyW') {
      if (elevatorAnimation && rockoAnimation) {
        elevatorAnimation.stop();
        rockoAnimation.stop();
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
