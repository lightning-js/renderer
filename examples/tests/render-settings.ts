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
import { Inspector } from '@lightningjs/renderer/inspector';
import robotImg from '../assets/robot/robot.png';

const TESTPAGES = 6;

export async function automation(settings: ExampleSettings) {
  // const testPageArray: number[] = [];
  // for (let i = 1; i < TESTPAGES; i++) {
  //   testPageArray.push(i);
  // }
  // const page = await test(settings);
  // // i = 0
  // await settings.snapshot();
  // let testIdx = 1;
  // const testPage = async () => {
  //   console.log('Testing ', testIdx);
  //   page(testIdx);
  //   await settings.snapshot();
  //   if (testIdx >= TESTPAGES) {
  //     return true;
  //   }
  //   testIdx++;
  //   await testPage();
  // };
  // // test first page
  // await testPage();
}

export default async function test({ renderer, testRoot }: ExampleSettings) {
  const ppr = renderer.settings.devicePhysicalPixelRatio;
  const lpr = renderer.settings.deviceLogicalPixelRatio;

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
    y: 1080 / 2 - (1080 * 0.5) / 2,
    width: 1000,
    height: 410,
    color: 0x000000ff,
    parent: testRoot,
  });
  const screen = renderer.createNode({
    x: 50,
    y: 50,
    width: boundaryRect1.width - 100,
    height: boundaryRect1.height - 100,
    parent: boundaryRect1,
    color: 0x222222ff,
  });
  const boundaryRect2 = renderer.createNode({
    x: 50,
    y: 50,
    width: 1000 - 100,
    height: 410 - 250,
    color: 0x222222ff,
    parent: boundaryRect1,
  });

  const redText = renderer.createTextNode({
    x: 380,
    y: 50,
    alpha: 1,
    width: 200,
    height: 200,
    color: 0xff0000ff,
    pivot: 0,
    text: 'red',
    fontSize: 80,
    fontFamily: 'Ubuntu-ssdf',
    parent: boundaryRect2,
  });

  let yPos = 10;
  const statusText = renderer.createTextNode({
    text: 'Status text: Inside viewport',
    fontSize: 30,
    x: 10,
    y: yPos,
    fontFamily: 'Ubuntu-ssdf',
    parent: testRoot,
  });
  yPos += 40;

  const redPosition = renderer.createTextNode({
    text: `Text X Position: ${redText.x}`,
    fontSize: 30,
    x: 10,
    y: yPos,
    fontFamily: 'Ubuntu-ssdf',
    parent: testRoot,
  });
  yPos += 40;

  const appSize = renderer.createTextNode({
    text: `Renderer Size: ${renderer.root.width}x${renderer.root.height}`,
    fontSize: 30,
    x: 10,
    y: yPos,
    fontFamily: 'Ubuntu-ssdf',
    parent: testRoot,
  });
  yPos += 40;

  const boundsMarginText = renderer.createTextNode({
    text: 'Text BoundsMargin: ',
    fontSize: 30,
    x: 10,
    y: yPos,
    fontFamily: 'Ubuntu-ssdf',
    parent: testRoot,
  });
  yPos += 40;

  const FPS = renderer.createTextNode({
    text: 'FPS Not running',
    fontSize: 30,
    x: 10,
    y: yPos,
    fontFamily: 'Ubuntu-ssdf',
    parent: testRoot,
  });
  yPos += 40;

  const testPage = renderer.createTextNode({
    text: `Test Page: 0`,
    fontSize: 30,
    x: 10,
    y: yPos + 100,
    fontFamily: 'Ubuntu-ssdf',
    parent: testRoot,
  });
  yPos += 40;

  redText.on('outOfBounds', () => {
    statusText.text = `Status text: Out of bounds`;
    statusText.color = 0xff0000ff;
    boundsMarginText.text = `Text BoundsMargin: ${redText.boundsMargin}`;
  });

  redText.on('inViewport', () => {
    statusText.text = `Status text: Inside viewport`;
    statusText.color = 0x00ff00ff;
    boundsMarginText.text = `Text BoundsMargin: ${redText.boundsMargin}`;
  });

  redText.on('inBounds', () => {
    statusText.text = 'Status text: Inside renderbounds';
    statusText.color = 0xffff00ff;
    boundsMarginText.text = `Text BoundsMargin: ${redText.boundsMargin}`;
  });

  // renderer.cleanup();

  renderer.on('fpsUpdate', (_renderer, data) => {
    // console.log('FPS Update', data.contextSpyData);
    if (FPS.text === 'FPS Not running') FPS.text = `FPS running`;
  });

  let intervalID = 0 as unknown as ReturnType<typeof setInterval>;

  const page = (i = 1) => {
    console.log('Running test page', i);
    testPage.text = `Test Page ${i}`;
    switch (i) {
      // Resize app to 550x1000 and set fpsUpdateInterval to 100
      // Red text should be out of bounds
      case 1:
        renderer.setOptions({
          // appWidth: 550,
          // appHeight: 1000,
          // fpsUpdateInterval: 100,
          enableContextSpy: true,
        });
        break;

      // Apply a device logical pixel ratio of 2 and move text 60px to the right
      // Red text should be in renderbounds
      case 2:
        renderer.setOptions({
          deviceLogicalPixelRatio: 2,
          fpsUpdateInterval: 0,
        });
        redText.x = 320;
        FPS.text = 'FPS Not running';
        break;

      // Apply a device physical pixel ratio of 0.1 and boundsMargin of 50
      // Red text should be out of bounds
      case 3:
        renderer.setOptions({
          devicePhysicalPixelRatio: 0.15,
          boundsMargin: 50,
          enableContextSpy: false,
        });
        break;

      // Restore app size, devicePhysicalPixelRatio and deviceLogicalPixelRatio to Defaults
      // Red text should be in renderbounds
      case 4:
        renderer.setOptions({
          devicePhysicalPixelRatio: ppr,
          appWidth: 1920,
          appHeight: 1080,
          clearColor: 0x00ff00ff,
        });
        break;

      // first parent text in view
      case 5:
        renderer.setOptions({
          deviceLogicalPixelRatio: lpr,
        });
        break;

      // Reset everything to defaults
      case 6:
        renderer.setOptions({
          appWidth: 1920,
          appHeight: 1080,
          boundsMargin: 100,
          clearColor: 0x00000000,
          deviceLogicalPixelRatio: lpr,
          devicePhysicalPixelRatio: ppr,
          enableContextSpy: false,
          fpsUpdateInterval: 0,
          textureProcessingTimeLimit: 10,
        });

        break;

      // Change TextureMemory settings and create a new texture every 100ms
      case 7:
        renderer.setOptions({
          textureMemory: {
            criticalThreshold: 200 * 1024 ** 2,
            targetThresholdLevel: 0.25,
            debugLogging: true,
          },
        });

        intervalID = setInterval(() => {
          screen.color = 0xffffffff;
          screen.texture = renderer.createTexture('NoiseTexture', {
            width: 500,
            height: 500,
            cacheId: Math.floor(Math.random() * 100000),
          });
          screen.textureOptions.preload = true;
        }, 100);

        break;

      // Restore textureMemory settings to defaults
      case 8:
        renderer.setOptions({
          textureMemory: {
            criticalThreshold: 124e6,
            targetThresholdLevel: 0.5,
          },
        });
        clearInterval(intervalID);
        screen.color = 0x222222ff;
        screen.texture = null;
        break;

      case 9:
        renderer.setOptions({
          inspector: false,
        });
        break;

      case 10:
        renderer.setOptions({
          enableContextSpy: true,
          fpsUpdateInterval: 1000,
        });

        // intervalID = setInterval(() => {
        //   screen.color = 0xffffffff;
        //   screen.texture = renderer.createTexture('NoiseTexture', {
        //     width: 500,
        //     height: 500,
        //     cacheId: Math.floor(Math.random() * 100000),
        //   });
        //   screen.textureOptions.preload = true;
        // }, 100);
        break;
    }
    redPosition.text = `Text X Position: ${redText.x}`;
    appSize.text = `Renderer Size: ${renderer.root.width}x${renderer.root.height}`;
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
      page(10);
    }
  };

  return page;
}
