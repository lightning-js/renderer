import type { ExampleSettings } from '../common/ExampleSettings.js';
import robotImg from '../assets/robot/robot.png';

export async function automation(settings: ExampleSettings) {
  const next = await test(settings);
  // i = 0
  await settings.snapshot();
  next();
  // i = 1
  await settings.snapshot();
  next();
  // i = 2
  await settings.snapshot();
}

/**
 * Tests that the clipping rect is updated correctly when a parent node with
 * clipping set is moved.
 *
 * Use the 'right arrow' key to move the clipping parent around.
 *
 * @param settings
 * @returns
 */
export default async function test(settings: ExampleSettings) {
  const { renderer, testRoot } = settings;

  // Set a smaller snapshot area
  testRoot.w = 200;
  testRoot.h = 200;
  testRoot.color = 0xffffffff;

  const clippedContainer = renderer.createNode({
    x: 0,
    y: 0,
    w: testRoot.w / 2,
    h: testRoot.h / 2,
    parent: settings.testRoot,
    color: 0x00ffffff,
    clipping: true,
  });

  renderer.createNode({
    x: -testRoot.w / 4,
    y: -testRoot.h / 4,
    w: testRoot.w,
    h: testRoot.h,
    scale: 0.9,
    parent: clippedContainer,
    src: robotImg,
  });

  let i = 0;
  const MAX_I = 2;
  function next() {
    i++;
    if (i > MAX_I) {
      i = 0;
    }
    if (i === 0) {
      clippedContainer.x = 0;
      clippedContainer.y = 0;
    } else if (i === 1) {
      clippedContainer.x = testRoot.w / 4;
    } else if (i === 2) {
      clippedContainer.x = testRoot.w / 2;
      clippedContainer.y = testRoot.h / 2;
    }
  }

  window.addEventListener('keydown', (event) => {
    // When right arrow is pressed, call next
    if (event.key === 'ArrowRight') {
      next();
    }
  });

  return next;
}
