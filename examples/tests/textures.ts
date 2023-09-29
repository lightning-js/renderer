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

import { type INode, type Dimensions } from '@lightningjs/renderer';
import rockoImg from '../assets/rocko.png';
import elevatorImg from '../assets/elevator.png';
import spritemap from '../assets/spritemap.png';
import type { ExampleSettings } from '../common/ExampleSettings.js';

export default async function ({
  renderer,
  appDimensions,
  driverName,
}: ExampleSettings) {
  const FONT_SIZE = 45;
  const BEGIN_Y = FONT_SIZE;

  const header = renderer.createTextNode({
    text: `Texture Test (${driverName})`,
    fontSize: FONT_SIZE,
    offsetY: -5,
    parent: renderer.root,
  });

  let curX = 0;
  let curY = BEGIN_Y;
  let curTest = 1;

  const rocko = renderer.createNode({
    x: curX,
    y: curY,
    src: rockoImg,
    parent: renderer.root,
  });

  await execLoadingTest(rocko, 181, 218);

  // Test: Make sure events are still sent for textures that have been previously
  // loaded

  const rocko2 = renderer.createNode({
    x: curX,
    y: curY,
    src: rockoImg,
    parent: renderer.root,
  });

  await execLoadingTest(rocko2, 181, 218);

  const elevator = renderer.createNode({
    x: curX,
    y: curY,
    src: elevatorImg,
    parent: renderer.root,
  });

  await execLoadingTest(elevator, 200, 268);

  // Test: Check that we capture a texture load failure
  const failure = renderer.createNode({
    x: curX,
    y: curY,
    src: 'does-not-exist.png',
    parent: renderer.root,
  });

  await execFailureTest(failure);

  // Test: Check that we capture a texture load failure
  const failure2 = renderer.createNode({
    x: curX,
    y: curY,
    src: 'does-not-exist.png',
    parent: renderer.root,
  });

  await execFailureTest(failure2);

  // Test: NoiseTexture

  curX = appDimensions.width / 2;
  curY = BEGIN_Y;

  const noiseTexture = renderer.makeTexture('NoiseTexture', {
    width: 100,
    height: 100,
  });

  const noise = renderer.createNode({
    x: curX,
    y: curY,
    texture: noiseTexture,
    parent: renderer.root,
  });

  await execLoadingTest(noise, 100, 100);

  // Test: NoiseTexture 2
  const noise2 = renderer.createNode({
    x: curX,
    y: curY,
    texture: noiseTexture,
    parent: renderer.root,
  });

  await execLoadingTest(noise2, 100, 100);

  // Test: SubTexture Load
  const spriteMapTexture = renderer.makeTexture('ImageTexture', {
    src: spritemap,
  });

  const frames = Array.from(Array(32).keys()).map((i) => {
    const x = (i % 8) * 100;
    const y = Math.floor(i / 8) * 150;
    return renderer.makeTexture('SubTexture', {
      texture: spriteMapTexture,
      x,
      y,
      width: 100,
      height: 150,
    });
  });

  const subTextureNode = renderer.createNode({
    x: curX,
    y: curY,
    texture: frames[0],
    parent: renderer.root,
  });

  await execLoadingTest(subTextureNode, 100, 150);

  // Test: SubTexture Load 2
  const subTextureNode2 = renderer.createNode({
    x: curX,
    y: curY,
    texture: frames[0],
    parent: renderer.root,
  });

  await execLoadingTest(subTextureNode2, 100, 150);

  // Test: SubTetxure Failure
  const failureTexture = renderer.makeTexture('ImageTexture', {
    src: 'does-not-exist.png',
  });

  const failureFrames = Array.from(Array(32).keys()).map((i) => {
    const x = (i % 8) * 120;
    const y = Math.floor(i / 8) * 120;
    return renderer.makeTexture('SubTexture', {
      texture: failureTexture,
      x,
      y,
      width: 120,
      height: 120,
    });
  });

  const subTxFailure = renderer.createNode({
    x: curX,
    y: curY,
    texture: failureFrames[0],
    parent: renderer.root,
  });

  await execFailureTest(subTxFailure);

  // Test: SubTexture Failure 2

  const subTxFailure2 = renderer.createNode({
    x: curX,
    y: curY,
    texture: failureFrames[0],
    parent: renderer.root,
  });

  await execFailureTest(subTxFailure2);

  function waitForTxLoaded(imgNode: INode) {
    return new Promise<{ width: number; height: number }>((resolve, reject) => {
      setTimeout(() => {
        reject(new Error('TIMEOUT'));
      }, 1000);
      imgNode.once('txLoaded', (target, dimensions) => {
        resolve(dimensions);
      });
    });
  }

  function waitForTxFailed(imgNode: INode) {
    return new Promise<boolean>((resolve, reject) => {
      setTimeout(() => {
        reject(new Error('TIMEOUT'));
      }, 1000);
      imgNode.once('txFailed', () => {
        resolve(true);
      });
    });
  }

  async function execLoadingTest(
    imgNode: INode,
    expectedWidth: number,
    expectedHeight: number,
  ) {
    const textNode = renderer.createTextNode({
      x: curX,
      text: '',
      fontSize: FONT_SIZE,
      offsetY: -5,
      parent: renderer.root,
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

  async function execFailureTest(imgNode: INode) {
    const textNode = renderer.createTextNode({
      x: curX,
      text: '',
      fontSize: FONT_SIZE,
      offsetY: -5,
      parent: renderer.root,
    });

    let failureTestPass = false;
    let exception: string | false = false;
    try {
      failureTestPass = await waitForTxFailed(imgNode);
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      exception = (e as any)?.message ?? 'Unknown';
    }

    textNode.y = imgNode.y + imgNode.height;
    let result = '';
    if (!exception && failureTestPass) {
      textNode.color = 0x00ff00ff;
      result = 'Pass';
    } else {
      textNode.color = 0xff0000ff;
      result = 'Fail';
      if (exception) {
        result += ` (exception: ${exception})`;
      }
    }
    textNode.text = `${curTest}. Failure Event Test: ${result}`;
    curY = textNode.y + FONT_SIZE;
    curTest++;
  }
}
