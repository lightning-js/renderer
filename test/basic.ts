import {
  MainRenderDriver,
  type INode,
  RendererMain,
  ThreadXRenderDriver,
  type TextureDesc,
} from '@lightningjs/renderer';
import RendererWorker from '@lightningjs/renderer/workers/renderer?worker';
import rocko from './rocko.png';
import elevator from './elevator.png';
import spritemap from './spritemap.png';

import type { IAnimationController } from '../src/core/IAnimationController.js';

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
      deviceLogicalPixelRatio: 0.6666667,
      devicePhysicalPixelRatio: 1,
    },
    'app',
    mainDriver,
    // threadXDriver,
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
    shader: renderer.makeShader('RoundedRectangle', {
      radius: 40,
    }),
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

  /*
   * Begin: Relative Positioning Platform
   */

  const relativePositioningPlatform = renderer.createNode({
    x: 605,
    y: 230,
    w: 1315,
    h: 50,
    color: 0xffaabb66,
    parent: renderer.root,
  });

  const relativePositioningChild = renderer.createNode({
    x: 10,
    y: 10,
    w: 1315 - 20,
    h: 30,
    color: 0xff0000ff,
    parent: relativePositioningPlatform,
  });

  const relativePositioningGrandchild = renderer.createNode({
    x: 10,
    y: 10,
    w: 1315 - 20 - 20,
    h: 10,
    color: 0x00ff00ff,
    parent: relativePositioningChild,
  });

  /*
   * End: Relative Positioning Platform
   */

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
    x: 200,
    y: 500,
    w: 181,
    h: 218,
    src: rocko,
    color: 0xffffffff,
    parent: renderer.root,
  });

  /*
   * Begin: Sprite Map Demo
   */

  const spriteMapTexture = renderer.makeTexture('ImageTexture', {
    src: spritemap,
  });

  /*
   * End: Sprite Map Demo
   */
  console.log('ready!');
})().catch((err) => {
  console.error(err);
});
