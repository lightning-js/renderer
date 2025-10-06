/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2024 Comcast Cable Communications Management, LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { ExampleSettings } from '../common/ExampleSettings.js';
const TESTPAGES = 11;

export async function automation(settings: ExampleSettings) {
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
  renderer.createTextNode({
    text: 'Left/Right Arrow keys to move, Up/Down Arrow keys to change page, enter to reset',
    fontSize: 30,
    x: 10,
    y: 960,
    fontFamily: 'Ubuntu-ssdf',
    parent: testRoot,
  });

  const boundaryRect1 = renderer.createNode({
    x: 1920 / 2 - (1920 * 0.75) / 2,
    y: 1080 / 2 - (1080 * 0.75) / 2,
    w: 1440,
    h: 810,
    color: 0x000000ff,
    parent: testRoot,
  });

  const boundaryRect2 = renderer.createNode({
    x: 50,
    y: 50,
    w: 1440 - 100,
    h: 810 - 100,
    color: 0x222222ff,
    parent: boundaryRect1,
  });

  const redText = renderer.createTextNode({
    x: 500,
    y: 305,
    alpha: 1,
    w: 200,
    h: 200,
    color: 0xff0000ff,
    pivot: 0,
    text: 'red',
    fontSize: 80,
    fontFamily: 'Ubuntu-ssdf',
    parent: boundaryRect2,
  });

  const statusText = renderer.createTextNode({
    text: 'Status: Inside viewport',
    fontSize: 30,
    x: 10,
    y: 10,
    fontFamily: 'Ubuntu-ssdf',
    parent: testRoot,
  });

  const testPage = renderer.createTextNode({
    text: `Test Page: 0`,
    fontSize: 30,
    x: 10,
    y: 50,
    fontFamily: 'Ubuntu-ssdf',
    parent: testRoot,
  });

  const boundsMarginText = renderer.createTextNode({
    text: 'Text BoundsMargin: ',
    fontSize: 30,
    x: 800,
    y: 10,
    fontFamily: 'Ubuntu-ssdf',
    parent: testRoot,
  });

  const redPosition = renderer.createTextNode({
    text: `Text X Position: ${redText.x}`,
    fontSize: 30,
    x: 800,
    y: 50,
    fontFamily: 'Ubuntu-ssdf',
    parent: testRoot,
  });

  redText.on('outOfBounds', () => {
    statusText.text = `Status: Out of bounds`;
    statusText.color = 0xff0000ff;
    boundsMarginText.text = `Text BoundsMargin: ${redText.boundsMargin}`;
  });

  redText.on('inViewport', () => {
    statusText.text = `Status: Inside viewport`;
    statusText.color = 0x00ff00ff;
    boundsMarginText.text = `Text BoundsMargin: ${redText.boundsMargin}`;
  });

  redText.on('inBounds', () => {
    statusText.text = 'Status: Inside renderbounds';
    statusText.color = 0xffff00ff;
    boundsMarginText.text = `Text BoundsMargin: ${redText.boundsMargin}`;
  });

  const page = (i = 1) => {
    console.log('Running test page', i);
    testPage.text = `Test Page ${i}`;
    switch (i) {
      // reset
      case 0:
        renderer.stage.setBoundsMargin(100);
        boundaryRect1.boundsMargin = null;
        redText.boundsMargin = null;
        redText.x = 500;
        testPageIdx = 0;
        boundaryRect1.clipping = false;
        break;

      // Text inside render bounds
      case 1:
        redText.x = -500;
        break;

      // Text out of bounds
      case 2:
        redText.x = -600;
        break;

      // stage bounds margin increased to 200 should be in bounds
      case 3:
        renderer.stage.setBoundsMargin(200);
        break;

      // Text out of bounds
      case 4:
        redText.x = -700;
        break;

      // first parent text in view
      case 5:
        renderer.stage.setBoundsMargin(100);
        boundaryRect1.clipping = true;
        redText.x = -100;
        boundaryRect1.boundsMargin = 100;
        break;

      // first parent text inside render bounds
      case 6:
        redText.x = -200;
        boundaryRect1.boundsMargin = 100;
        break;

      // first parent text out of bounds
      case 7:
        redText.x = -300;
        boundaryRect1.boundsMargin = 100;
        break;

      // first parent change boundsMargin should be in render bounds
      case 8:
        boundaryRect1.boundsMargin = 200;
        redText.x = -300;
        break;

      // boundsmargin on text should be in viewport
      case 9:
        redText.x = 0;
        redText.boundsMargin = 300;
        break;

      // boundsmargin on text should be inside render bounds
      case 10:
        redText.x = -200;
        redText.boundsMargin = 300;
        break;

      // boundsmargin on text should be out of bounds
      case 11:
        redText.x = -500;
        redText.boundsMargin = 300;
        break;
    }
    redPosition.text = `Text X Position: ${redText.x}`;
  };
  const moveModifier = 100;
  const numKeys: string[] = [];
  for (let i = 0; i < 10; i++) {
    numKeys.push(i.toString());
  }

  let testPageIdx = 0;
  window.onkeydown = (e) => {
    if (numKeys.indexOf(e.key) !== -1) {
      page(parseInt(e.key));
    }

    if (e.key === 'ArrowRight') {
      redText.x += moveModifier;
      redPosition.text = `Text X Position: ${redText.x}`;
    }

    if (e.key === 'ArrowLeft') {
      redText.x -= moveModifier;
      redPosition.text = `Text X Position: ${redText.x}`;
    }

    if (e.key === 'ArrowDown') {
      if (testPageIdx <= 0) {
        testPageIdx = TESTPAGES;
      } else {
        testPageIdx--;
      }
      page(testPageIdx);
    }

    if (e.key === 'ArrowUp') {
      if (testPageIdx >= TESTPAGES) {
        testPageIdx = 0;
      } else {
        testPageIdx++;
      }
      page(testPageIdx);
    }

    if (e.key === 'Enter') {
      page(0);
    }
  };

  return page;
}
