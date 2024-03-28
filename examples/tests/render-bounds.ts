import type { IAnimationController } from '../../dist/exports/main-api.js';
import type { ExampleSettings } from '../common/ExampleSettings.js';
import test from './alpha-blending.js';

export default async function ({ renderer, testRoot }: ExampleSettings) {
  const degToRad = (deg: number) => {
    return (Math.PI / 180) * deg;
  };

  const greenRect = renderer.createNode({
    x: 0,
    y: 540,
    width: 960,
    height: 540,
    color: 0x00ff00ff,
    clipping: true,
    parent: testRoot,
  });

  const redRect = renderer.createNode({
    // skipRender: true,
    x: 0,
    y: 0,
    alpha: 1,
    width: 200,
    height: 200,
    color: 0xff0000ff,
    pivot: 0,
    parent: testRoot,
  });

  redRect.on('outOfViewport', () => {
    console.log('red rect outside view port');
  });

  redRect.on('inViewport', () => {
    console.log('red rect in view port');
  });

  let redRectAnimation: IAnimationController | null = null;
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  setTimeout(async () => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      redRectAnimation = redRect
        .animate(
          {
            x: 0,
          },
          {
            delay: 2000,
            duration: 2000,
          },
        )
        .start();
      await redRectAnimation.waitUntilStopped();

      redRectAnimation = redRect
        .animate(
          {
            x: -205,
          },
          {
            duration: 2000,
          },
        )
        .start();
      await redRectAnimation.waitUntilStopped();
    }
  }, 1000);

  const blueRect = renderer.createNode({
    x: 1921,
    y: 540,
    width: 540,
    height: 540,
    color: 0x0000ffff,
    mountX: 0.5,
    mountY: 0.5,
    rotation: degToRad(45 + 180),
    parent: greenRect,
  });

  blueRect.on('outOfBounds', () => {
    console.log('blue rect outside render bounds');
  });

  blueRect.on('inBounds', () => {
    console.log('blue rect in render bounds');
  });

  let blueRectAnimation: IAnimationController | null = null;
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  setTimeout(async () => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      blueRectAnimation = blueRect
        .animate(
          {
            rotation: degToRad(360),
            x: 1000,
          },
          {
            delay: 1000,
            duration: 2000,
          },
        )
        .start();
      await blueRectAnimation.waitUntilStopped();

      blueRectAnimation = blueRect
        .animate(
          {
            rotation: degToRad(45),
            x: 2400,
          },
          {
            duration: 2000,
          },
        )
        .start();
      await blueRectAnimation.waitUntilStopped();
    }
  }, 1000);
}
