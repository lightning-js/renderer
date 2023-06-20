import {
  MainRenderDriver,
  RendererMain,
  ThreadXRenderDriver,
} from '@lightningjs/renderer';
import RendererWorker from '@lightningjs/renderer/workers/renderer?worker';
import environmentImg from './images/environment.png';
import doorLeftGroundImg from './images/elevator-door-left-ground-floor.png';
import doorRightGroundImg from './images/elevator-door-right-ground-floor.png';
import doorTopTopImg from './images/elevator-door-top-top-floor.png';
import doorBottomTopImg from './images/elevator-door-bottom-top-floor.png';
import elevatorBgImg from './images/elevator-background.png';
import robotImg from './images/robot.png';
import shadowImg from './images/robot-shadow.png';

// import elevator from './elevator.png';

import type { IAnimationController } from '../../src/core/IAnimationController.js';

(async () => {
  const threadXDriver = new ThreadXRenderDriver({
    RendererWorker,
  });

  const mainDriver = new MainRenderDriver();

  const appDimensions = {
    width: 1920,
    height: 1080,
  };

  const renderer = new RendererMain(
    {
      ...appDimensions,
      deviceLogicalPixelRatio: 1,
    },
    'app',
    // mainDriver,
    threadXDriver,
  );

  await renderer.init();

  const elevatorBg = renderer.createNode({
    x: 368,
    y: 228,
    w: 226,
    h: 214,
    src: elevatorBgImg,
    parent: renderer.root,
  });

  const elevatorBg2 = renderer.createNode({
    x: 368,
    y: 827,
    w: 226,
    h: 214,
    src: elevatorBgImg,
    parent: renderer.root,
  });

  const doorLeftGround = renderer.createNode({
    x: 480 - 68,
    y: 827,
    w: 68,
    h: 194,
    src: doorLeftGroundImg,
    parent: renderer.root,
  });

  const doorRightGround = renderer.createNode({
    x: 480,
    y: 827,
    w: 68,
    h: 194,
    src: doorRightGroundImg,
    parent: renderer.root,
  });

  const environment = renderer.createNode({
    x: 0,
    y: 0,
    w: appDimensions.width,
    h: appDimensions.height,
    src: environmentImg,
    parent: renderer.root,
  });

  const robot = renderer.createNode({
    x: -140,
    y: 850,
    w: 140,
    h: 140,
    color: 0x00000000,
    parent: renderer.root,
  });

  const shadow = renderer.createNode({
    x: -40,
    y: 180,
    w: 228,
    h: 65,
    src: shadowImg,
    parent: robot,
  });

  const robotCore = renderer.createNode({
    x: 0,
    y: 0,
    w: 140,
    h: 140,
    src: robotImg,
    parent: robot,
  });

  setTimeout(async () => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await robotCore.animate({ y: 10 }, 500).start().waitUntilStopped();
      await robotCore.animate({ y: 0 }, 500).start().waitUntilStopped();
    }
  }, 1000);

  const doorTopTop = renderer.createNode({
    x: 375,
    y: 207,
    w: 211,
    h: 129,
    src: doorTopTopImg,
    parent: renderer.root,
  });

  const doorBottomTop = renderer.createNode({
    x: 375,
    y: 207 + 129,
    w: 211,
    h: 129,
    src: doorBottomTopImg,
    parent: renderer.root,
  });

  setTimeout(async () => {
    await openGroundDoors(1000);
    await robot.animate({ x: 410 }, 1000).start().waitUntilStopped();
    shadow.animate({ alpha: 0 }, 500).start();
    await closeGroundDoors(1000);
    await robot.animate({ y: 200 }, 1000).start().waitUntilStopped();
    shadow.y = 100;
    await openTopDoors(1000);
    shadow.animate({ alpha: 1 }, 500).start();
    await shadow.animate({}, 2000).start().waitUntilStopped();
    await robot
      .animate({ x: appDimensions.width }, 5000)
      .start()
      .waitUntilStopped();
    await closeTopDoors(1000);
  }, 1000);

  function openTopDoors(duration: number) {
    const a1 = doorTopTop.animate({ y: 207 - 129 }, duration).start();
    const a2 = doorBottomTop.animate({ y: 207 + 129 + 20 }, duration).start();
    const a3 = elevatorBg.animate({ y: 228 - 20 }, duration).start();
    return Promise.all([
      a1.waitUntilStopped(),
      a2.waitUntilStopped(),
      a3.waitUntilStopped(),
    ]);
  }

  function closeTopDoors(duration: number) {
    const a1 = doorTopTop.animate({ y: 207 }, duration).start();
    const a2 = doorBottomTop.animate({ y: 207 + 129 }, duration).start();
    const a3 = elevatorBg.animate({ y: 228 }, duration).start();
    return Promise.all([
      a1.waitUntilStopped(),
      a2.waitUntilStopped(),
      a3.waitUntilStopped(),
    ]);
  }

  function openGroundDoors(duration: number) {
    const a1 = doorLeftGround.animate({ x: 480 - 68 - 68 }, duration).start();
    const a2 = doorRightGround.animate({ x: 480 + 68 }, duration).start();
    return Promise.all([a1.waitUntilStopped(), a2.waitUntilStopped()]);
  }

  function closeGroundDoors(duration: number) {
    const a1 = doorLeftGround.animate({ x: 480 - 68 }, duration).start();
    const a2 = doorRightGround.animate({ x: 480 }, duration).start();
    return Promise.all([a1.waitUntilStopped(), a2.waitUntilStopped()]);
  }
})().catch(console.error);
