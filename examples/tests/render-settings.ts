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

const TESTPAGES = 6;

export async function automation(settings: ExampleSettings) {
  const page = await test(settings);
  await settings.snapshot();
  let testIdx = 1;
  const testPage = async () => {
    await page(testIdx);
    await settings.snapshot();
    if (testIdx >= TESTPAGES - 1) {
      //Reset to default settings to prevent other tests from failing
      await page(0);
      return true;
    }
    testIdx++;
    await testPage();
  };
  // test first page
  await testPage();
}

export default async function test({ renderer, testRoot }: ExampleSettings) {
  const ppr = renderer.stage.options.devicePhysicalPixelRatio;
  const lpr = renderer.stage.options.deviceLogicalPixelRatio;

  const info = renderer.createTextNode({
    text: 'Initial default settings',
    fontSize: 30,
    fontFamily: 'Ubuntu-ssdf',
    x: 10,
    y: 810,
    contain: 'width',
    width: renderer.root.width - 20,
    parent: testRoot,
  });

  renderer.createTextNode({
    text: 'Up/Down Arrow keys to change page, enter to reset',
    fontSize: 30,
    x: 10,
    y: 960,
    fontFamily: 'Ubuntu-ssdf',
    parent: testRoot,
  });

  const boundaryRect1 = renderer.createNode({
    x: 1920 / 2 - (1920 * 0.75) / 2,
    y: 1080 / 2 - (1080 * 0.45) / 2,
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
    text: `App Size: ${renderer.root.width}x${renderer.root.height}`,
    fontSize: 30,
    x: 10,
    y: yPos,
    fontFamily: 'Ubuntu-ssdf',
    parent: testRoot,
  });
  yPos += 40;

  const pixelSize = renderer.createTextNode({
    text: `Pixels: ${renderer.canvas.width}x${renderer.canvas.height}`,
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

  const fpsCheckBox = renderer.createNode({
    width: 30,
    height: 30,
    x: 10,
    y: yPos,
    color: 0xff0000ff,
    parent: testRoot,
  });

  renderer.createTextNode({
    text: 'fpsUpdate enabled?',
    fontSize: 30,
    x: 50,
    y: yPos,
    fontFamily: 'Ubuntu-ssdf',
    parent: testRoot,
  });
  yPos += 40;

  const inspectorCheckBox = renderer.createNode({
    width: 30,
    height: 30,
    x: 10,
    y: yPos,
    color: 0xff0000ff,
    parent: testRoot,
  });

  renderer.createTextNode({
    x: 50,
    y: yPos,
    height: 100,
    text: 'Inspector enabled?',
    fontFamily: 'Ubuntu-ssdf',
    fontSize: 30,
    parent: testRoot,
    data: {
      id: 'inspectorNode',
    },
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

  renderer.on('fpsUpdate', (_renderer, data) => {
    if (fpsCheckBox.color === 0xff0000ff) {
      fpsCheckBox.color = 0x00ff00ff;
    }
  });

  let intervalID = 0 as unknown as ReturnType<typeof setInterval>;

  const page = async (i = 1) => {
    console.log('Running test page', i);
    testPage.text = `Test Page ${i}`;
    switch (i) {
      case 0:
        testPageIdx = 0;
        // Reset to default settings
        renderer.setOptions({
          appWidth: 1920,
          appHeight: 1080,
          boundsMargin: 100,
          clearColor: 0x00000000,
          deviceLogicalPixelRatio: lpr,
          devicePhysicalPixelRatio: ppr,
          inspector: false,
          fpsUpdateInterval: 0,
          textureMemory: {
            criticalThreshold: 124e6,
            targetThresholdLevel: 0.5,
            debugLogging: false,
          },
          textureProcessingTimeLimit: 10,
        });
        clearInterval(intervalID);
        screen.color = 0x222222ff;
        screen.texture = null;
        info.text = 'Initial default settings';
        break;

      case 1:
        renderer.setOptions({
          deviceLogicalPixelRatio: 1,
          inspector: Inspector,
        });
        info.text =
          'LogicalPixelRatio: 1. Pixels should be 1920x1080. Inspector enabled.';
        break;

      case 2:
        renderer.setOptions({
          devicePhysicalPixelRatio: 0.5,
          clearColor: 0xff6f00ff,
          inspector: false,
        });
        info.width = renderer.root.width - 20;
        info.text =
          'PhysicalPixelRatio: 0.5. Pixels should be 960x540. Inspector disabled. ClearColor changed to orange.';
        break;

      case 3:
        renderer.setOptions({
          appWidth: 550,
          appHeight: 1000,
          deviceLogicalPixelRatio: lpr,
          devicePhysicalPixelRatio: ppr,
          clearColor: 0x00000000,
        });
        info.width = renderer.root.width - 20;
        info.text =
          'Pixels should be 366x666. redText should be out of bounds. Default clearColor, LogicalPixelRatio and PhysicalPixelRatio';
        break;

      case 4:
        renderer.setOptions({
          boundsMargin: 150,
          fpsUpdateInterval: 100,
        });

        info.text =
          'Changed boundsMargin should make redText be inside renderbounds. FPSupdate event should trigger';
        await delay(110);
        break;

      case 5:
        renderer.setOptions({
          fpsUpdateInterval: 0,
        });
        redText.x = 230;
        fpsCheckBox.color = 0xff0000ff;
        info.text =
          'redText should be inside viewport. FPSupdate event should not trigger anymore.';
        await delay(110);
        break;

      // Serving as example not running in visual regression
      case 6:
        renderer.setOptions({
          appWidth: 1920,
          appHeight: 1080,
          textureMemory: {
            criticalThreshold: 200 * 1024 ** 2,
            targetThresholdLevel: 0.25,
            debugLogging: true,
          },
          textureProcessingTimeLimit: 4,
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
    }

    if (document.querySelector('[data-id="inspectorNode"]')) {
      inspectorCheckBox.color = 0x00ff00ff;
    } else {
      inspectorCheckBox.color = 0xff0000ff;
    }

    redPosition.text = `Text X Position: ${redText.x}`;
    appSize.text = `App Size: ${renderer.root.width}x${renderer.root.height}`;
    pixelSize.text = `Pixels: ${renderer.canvas.width * ppr}x${
      renderer.canvas.height * ppr
    }`;
  };

  const numKeys: string[] = [];
  for (let i = 0; i < 10; i++) {
    numKeys.push(i.toString());
  }

  let testPageIdx = 0;
  window.onkeydown = (e: KeyboardEvent) => {
    if (numKeys.indexOf(e.key) !== -1) {
      page(parseInt(e.key));
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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
