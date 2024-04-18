import type { IAnimationController } from '../../dist/exports/main-api.js';
import type { ExampleSettings } from '../common/ExampleSettings.js';
import test from './alpha-blending.js';

export default async function ({ renderer, testRoot }: ExampleSettings) {
  const degToRad = (deg: number) => {
    return (Math.PI / 180) * deg;
  };

  const instructionText = renderer.createTextNode({
    text: 'Press space to start animation, arrow keys to move, enter to reset',
    fontSize: 30,
    x: 10,
    y: 960,
    parent: testRoot,
  });

  const redStatus = renderer.createTextNode({
    text: 'Red Status: ',
    fontSize: 30,
    x: 10,
    y: 50,
    parent: testRoot,
  });

  const blueStatus = renderer.createTextNode({
    text: 'Blue Status: ',
    fontSize: 30,
    x: 10,
    y: 10,
    parent: testRoot,
  });

  const boundaryRect = renderer.createNode({
    x: 1920 / 2 - (1920 * 0.75) / 2,
    y: 1080 / 2 - (1080 * 0.75) / 2,
    width: 1440,
    height: 810,
    color: 0x000000ff,
    clipping: true,
    parent: testRoot,
  });

  const redRect = renderer.createNode({
    // skipRender: true,
    x: 520,
    y: 305,
    alpha: 1,
    width: 200,
    height: 200,
    color: 0xff0000ff,
    pivot: 0,
    parent: boundaryRect,
  });

  redRect.on('outOfBounds', () => {
    console.log('red rect out of bounds');
    redStatus.text = 'Red Status: rect out of bounds';
    redStatus.color = 0xff0000ff;
  });

  redRect.on('inViewport', () => {
    console.log('red rect in view port');
    redStatus.text = 'Red Status: rect in view port';
    redStatus.color = 0x00ff00ff;
  });

  redRect.on('inBounds', () => {
    console.log('red rect inside render bounds');
    redStatus.text = 'Red Status: rect in bounds';
    redStatus.color = 0xffff00ff;
  });

  const blueRect = renderer.createNode({
    x: 1920 / 2 - 200,
    y: 100,
    alpha: 1,
    width: 200,
    height: 200,
    color: 0x0000ffff,
    pivot: 0,
    parent: testRoot,
  });

  blueRect.on('outOfBounds', () => {
    console.log('blue rect ouf ot bounds');
    blueStatus.text = 'Blue Status: blue rect out of bounds';
    blueStatus.color = 0xff0000ff;
  });

  blueRect.on('inViewport', () => {
    console.log('blue rect in view port');
    blueStatus.text = 'Blue Status: blue rect in view port';
    blueStatus.color = 0x00ff00ff;
  });

  blueRect.on('inBounds', () => {
    console.log('blue rect inside render bounds');
    blueStatus.text = 'Blue Status: blue rect in bounds';
    blueStatus.color = 0xffff00ff;
  });

  let runAnimation = false;
  const animate = async () => {
    redRect
      .animate(
        {
          x: -500,
        },
        {
          duration: 4000,
        },
      )
      .start();

    await blueRect
      .animate(
        {
          x: -1200,
        },
        {
          duration: 4000,
        },
      )
      .start()
      .waitUntilStopped();

    redRect.x = 1920 + 400;
    blueRect.x = 1920 + 400;

    redRect
      .animate(
        {
          x: 520,
        },
        {
          duration: 4000,
        },
      )
      .start();

    await blueRect
      .animate(
        {
          x: 1920 / 2 - 200,
        },
        {
          duration: 4000,
        },
      )
      .start()
      .waitUntilStopped();

    if (runAnimation) {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      setTimeout(animate, 2000);
    }
  };

  const moveModifier = 10;
  window.onkeydown = (e) => {
    if (e.key === ' ') {
      runAnimation = !runAnimation;

      if (runAnimation) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        animate();
      }
    }

    if (e.key === 'ArrowRight') {
      redRect.x += moveModifier;
      blueRect.x += moveModifier;
    }

    if (e.key === 'ArrowLeft') {
      redRect.x -= moveModifier;
      blueRect.x -= moveModifier;
    }

    if (e.key === 'Enter') {
      runAnimation = false;
      redRect.x = 520;
      blueRect.x = 1920 / 2 - 200;
    }
  };
}
