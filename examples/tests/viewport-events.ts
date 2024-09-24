import type { ExampleSettings } from '../common/ExampleSettings.js';

export async function automation(settings: ExampleSettings) {
  const TESTPAGES = 14;
  const testPageArray: number[] = [];
  for (let i = 1; i < TESTPAGES; i++) {
    testPageArray.push(i);
  }

  const page = await test(settings);
  // i = 0
  await settings.snapshot();

  let testIdx = 1;
  const testPage = async () => {
    console.log('Testing ', testIdx);
    page(testIdx);
    await settings.snapshot();

    if (testIdx >= TESTPAGES) {
      return true;
    }

    testIdx++;
    await testPage();
  };

  // test first page
  await testPage();
}

export default async function test({ renderer, testRoot }: ExampleSettings) {
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

  const yellowStatus = renderer.createTextNode({
    text: 'Yellow Status: ',
    fontSize: 30,
    x: 800,
    y: 10,
    parent: testRoot,
  });

  const clippingStatus = renderer.createTextNode({
    text: 'Clipping: ON',
    fontSize: 30,
    x: 800,
    y: 50,
    parent: testRoot,
    color: 0x00ff00ff,
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
    x: 100,
    y: 305,
    alpha: 1,
    width: 200,
    height: 200,
    color: 0xff0000ff,
    pivot: 0,
    parent: boundaryRect,
  });

  const yellow1Rect = renderer.createNode({
    x: 20,
    y: 20,
    alpha: 1,
    width: 20,
    height: 20,
    color: 0xffff00ff,
    pivot: 0,
    parent: redRect,
  });

  const yellow2Rect = renderer.createNode({
    x: 50,
    y: 50,
    alpha: 1,
    width: 20,
    height: 20,
    color: 0xffff00ff,
    pivot: 0,
    parent: redRect,
  });

  const yellow3Rect = renderer.createNode({
    x: 80,
    y: 80,
    alpha: 1,
    width: 20,
    height: 20,
    color: 0xffff00ff,
    pivot: 0,
    parent: redRect,
  });

  const yellow4Rect = renderer.createNode({
    x: 110,
    y: 110,
    alpha: 1,
    width: 20,
    height: 20,
    color: 0xffff00ff,
    pivot: 0,
    parent: redRect,
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

  // yellowstate
  // 0 : out of bounds
  // 1 : in bounds
  // 2 : in viewport
  const yellowRectState = [0, 0, 0, 0];
  const updateYellowState = (state: number, yellowIdx: number) => {
    let stateString = '';
    yellowRectState[yellowIdx] = state;

    Array(4)
      .fill(0)
      .forEach((_, i) => {
        stateString += `${yellowRectState[i]} `;
      });

    yellowStatus.text = `Yellow Status: ${stateString}`;
  };

  yellow1Rect.on('inBounds', () => {
    console.log('yellow 1 rect inside render bounds');
    updateYellowState(1, 0);
  });

  yellow1Rect.on('inViewport', () => {
    console.log('yellow 1 rect in view port');
    updateYellowState(2, 0);
  });

  yellow1Rect.on('outOfBounds', () => {
    console.log('yellow 1 rect out of bounds');
    updateYellowState(0, 0);
  });

  yellow2Rect.on('inBounds', () => {
    console.log('yellow 2 rect inside render bounds');
    updateYellowState(1, 1);
  });

  yellow2Rect.on('inViewport', () => {
    console.log('yellow 2 rect in view port');
    updateYellowState(2, 1);
  });

  yellow2Rect.on('outOfBounds', () => {
    console.log('yellow 2 rect out of bounds');
    updateYellowState(0, 1);
  });

  yellow3Rect.on('inBounds', () => {
    console.log('yellow 3 rect inside render bounds');
    updateYellowState(1, 2);
  });

  yellow3Rect.on('inViewport', () => {
    console.log('yellow 3 rect in view port');
    updateYellowState(2, 2);
  });

  yellow3Rect.on('outOfBounds', () => {
    console.log('yellow 3 rect out of bounds');
    updateYellowState(0, 2);
  });

  yellow4Rect.on('inBounds', () => {
    console.log('yellow 4 rect inside render bounds');
    updateYellowState(1, 3);
  });

  yellow4Rect.on('inViewport', () => {
    console.log('yellow 4 rect in view port');
    updateYellowState(2, 3);
  });

  yellow4Rect.on('outOfBounds', () => {
    console.log('yellow 4 rect out of bounds');
    updateYellowState(0, 3);
  });

  const blueRect = renderer.createNode({
    x: 340,
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

  const page = (i = 1) => {
    console.log('Running test page', i);

    switch (i) {
      // reset
      case 0:
        blueRect.x = 340;
        redRect.x = 100;
        break;

      // first yellow out of bounds
      case 1:
        redRect.x = -50;
        blueRect.x = 190;
        break;

      // second yellow out of bounds
      case 2:
        redRect.x = -80;
        blueRect.x = 160;
        break;

      // third yellow out of bounds
      case 3:
        redRect.x = -110;
        blueRect.x = 130;
        break;

      // fourth yellow out of bounds
      case 4:
        redRect.x = -140;
        blueRect.x = 100;
        break;

      // first yellow out of view
      case 5:
        redRect.x = -170;
        blueRect.x = 70;
        break;

      // second yellow out of view
      case 6:
        redRect.x = -180;
        blueRect.x = 60;
        break;

      // third yellow out of view
      case 7:
        redRect.x = -210;
        blueRect.x = 30;
        break;

      // fourth yellow out of view
      // red rect ouf ot bounds
      case 8:
        redRect.x = -240;
        blueRect.x = 0;
        break;

      // red out of bounds
      case 9:
        redRect.x = -310;
        blueRect.x = -70;
        break;

      // blue out of bounds
      case 10:
        redRect.x = -460;
        blueRect.x = -220;
        break;

      // blue out of view
      case 11:
        redRect.x = -560;
        blueRect.x = -320;
        break;

      // CLIPPING update tests
      // clipping off - all back in view
      case 12:
        redRect.x = -240;
        blueRect.x = 0;
        setClipping(false);
        break;

      // turn clipping back on
      case 13:
        setClipping(true);
        break;

      // clipping toggle x3
      // all blocks should be visible with clipping off
      case 14:
        redRect.x = -210;
        blueRect.x = 30;
        setClipping(false);
        setClipping(true);
        setClipping(false);
        break;
    }
  };

  const setClipping = (clipping: boolean) => {
    boundaryRect.clipping = clipping;
    clippingStatus.text = clipping ? 'Clipping: ON' : 'Clipping: OFF';
    clippingStatus.color = clipping ? 0x00ff00ff : 0xff0000ff;
  };

  const toggleClipping = (force = false) => {
    setClipping(!boundaryRect.clipping);
  };

  const moveModifier = 10;
  const numKeys: string[] = [];
  for (let i = 0; i < 10; i++) {
    numKeys.push(i.toString());
  }

  let testPageIdx = 0;
  window.onkeydown = (e) => {
    if (e.key === ' ') {
      runAnimation = !runAnimation;

      if (runAnimation) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        animate();
      }
    }

    if (numKeys.indexOf(e.key) !== -1) {
      page(parseInt(e.key));
    }

    if (e.key === 'ArrowRight') {
      redRect.x += moveModifier;
      blueRect.x += moveModifier;
    }

    if (e.key === 'ArrowLeft') {
      redRect.x -= moveModifier;
      blueRect.x -= moveModifier;
    }

    if (e.key === 'ArrowDown') {
      testPageIdx--;
      page(testPageIdx);
    }

    if (e.key === 'ArrowUp') {
      testPageIdx++;
      page(testPageIdx);
    }

    if (e.key === 'Enter') {
      runAnimation = false;
      redRect.x = 520;
      blueRect.x = 1920 / 2 - 200;
    }

    if (e.key === 't') {
      toggleClipping();
    }

    // wouter special
    if (e.key === 'w') {
      page(12);
    }

    console.log('positions redRect.x', redRect.x, ' bluerect.x', blueRect.x);
  };

  return page;
}
