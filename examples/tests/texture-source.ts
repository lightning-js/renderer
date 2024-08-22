/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2023 Comcast Cable Communications Management, LLC.
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

import {
  type INode,
  type Dimensions,
  type NodeLoadedEventHandler,
} from '@lightningjs/renderer';
import rockoPng from '../assets/rocko.png';
import lightningPng from '../assets/lightning.png';
import elevatorPng from '../assets/elevator.png';
import type { ExampleSettings } from '../common/ExampleSettings.js';

export async function automation(settings: ExampleSettings) {
  await test(settings);
  await settings.snapshot();
}

export default async function test({ renderer, testRoot }: ExampleSettings) {
  const FONT_SIZE = 45;
  const BEGIN_Y = FONT_SIZE;

  const header = renderer.createTextNode({
    fontFamily: 'Ubuntu',
    text: `PNG Source Test`,
    fontSize: FONT_SIZE,
    parent: testRoot,
  });

  const curX = 0;
  let curY = BEGIN_Y;
  let curTest = 1;

  const rocko = renderer.createNode({
    x: curX,
    y: curY,
    src: rockoPng,
    parent: testRoot,
  });

  await execLoadingTest(rocko, 181, 218);

  const elevator = renderer.createNode({
    x: curX,
    y: curY,
    src: elevatorPng,
    parent: testRoot,
    srcX: 120,
    srcY: 0,
    srcHeight: 268,
    srcWidth: 100,
  });

  await execLoadingTest(elevator, 100, 268);

  const lightningNode = renderer.createNode({
    x: curX,
    y: curY,
    src: lightningPng,
    srcHeight: 100,
    srcWidth: 100,
    parent: testRoot,
  });

  await execLoadingTest(lightningNode, 100, 100);

  function waitForTxLoaded(imgNode: INode) {
    return new Promise<Dimensions>((resolve, reject) => {
      setTimeout(() => {
        reject(new Error('TIMEOUT'));
      }, 1000);
      imgNode.once('loaded', ((target, payload) => {
        resolve(payload.dimensions);
      }) satisfies NodeLoadedEventHandler);
    });
  }

  async function execLoadingTest(
    imgNode: INode,
    expectedWidth: number,
    expectedHeight: number,
  ) {
    const textNode = renderer.createTextNode({
      fontFamily: 'Ubuntu',
      x: curX,
      text: '',
      fontSize: FONT_SIZE,
      parent: testRoot,
    });

    let exception: string | false = false;
    let dimensions: Dimensions = { width: 0, height: 0 };
    try {
      dimensions = await waitForTxLoaded(imgNode);
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      exception = (e as any)?.message ?? 'Unknown';
    }

    imgNode.width = dimensions.width;
    imgNode.height = dimensions.height;

    textNode.y = imgNode.y + imgNode.height;
    let result = 'Fail';
    let expectedPostfix = '';
    if (
      !exception &&
      imgNode.width === expectedWidth &&
      imgNode.height === expectedHeight
    ) {
      textNode.color = 0x00ff00ff;
      result = 'Pass';
    } else {
      textNode.color = 0xff0000ff;
      if (exception) {
        expectedPostfix = ` (exception: ${exception})`;
      } else {
        expectedPostfix = ` (expected ${expectedWidth}x${expectedHeight})`;
      }
    }
    textNode.text = `${curTest}. Loaded Event Test: ${result} (${imgNode.width}x${imgNode.height})${expectedPostfix}`;
    curY = textNode.y + FONT_SIZE;
    curTest++;
  }
}
