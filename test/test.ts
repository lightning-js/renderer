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
import { Character } from './Character.js';

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
    mainDriver,
    // threadXDriver,
  );

  await renderer.init();

  /*
   * redRect will persist and change color every frame
   * greenRect will persist and be detached and reattached to the root every second
   * blueRect will be created and destroyed every 500 ms
   */
  renderer.createNode({
    x: 100,
    y: 100,
    w: 100,
    h: 100,
    color: 0x00ff00ff,
    shader: renderer.makeShader('RoundedRectangle', { radius: 40 }),
    parent: renderer.root,
  });

  renderer.createNode({
    x: 250,
    y: 100,
    w: 100,
    h: 100,
    shader: renderer.makeShader('RoundedRectangle', { radius: 40 }),
    color: 0x0000ff00,
    parent: renderer.root,
  });

  renderer.createNode({
    x: 100,
    y: 250,
    w: 100,
    h: 100,
    shader: renderer.makeShader('RoundedRectangle', { radius: 10 }),
    color: 0x0000ff00,
    parent: renderer.root,
  });

  renderer.createNode({
    x: 250,
    y: 250,
    w: 100,
    h: 100,
    shader: renderer.makeShader('RoundedRectangle', { radius: 10 }),
    color: 0x00ff00ff,
    parent: renderer.root,
  });

  renderer.createNode({
    x: 100,
    y: 400,
    w: 100,
    h: 100,
    shader: renderer.makeShader('RoundedRectangle', { radius: 10 }),
    color: 0x0000ff00,
    parent: renderer.root,
  });

  renderer.createNode({
    x: 250,
    y: 400,
    w: 100,
    h: 100,
    shader: renderer.makeShader('RoundedRectangle', { radius: 15 }),
    color: 0x0000ff00,
    parent: renderer.root,
  });

  console.log('ready!');
})().catch((err) => {
  console.error(err);
});
