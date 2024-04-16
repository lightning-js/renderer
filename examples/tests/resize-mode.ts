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
import rockoImg from '../assets/rocko.png';
import environmentImg from '../assets/robot/environment.png';
import type { ExampleSettings } from '../common/ExampleSettings.js';

export default async function ({
  renderer,
  driverName,
  testRoot,
}: ExampleSettings) {
  const FONT_SIZE = 45;
  const BEGIN_Y = FONT_SIZE;

  // Header
  renderer.createTextNode({
    text: `Resizemode Test (${driverName})`,
    fontSize: FONT_SIZE,
    offsetY: -5,
    parent: testRoot,
  });

  const curX = 0;
  let curY = BEGIN_Y;
  let curTest = 1;

  // Wrapper for contain resizeMode
  const wrapperContain = renderer.createNode({
    x: curX,
    y: curY,
    width: 200,
    height: 200,
    color: 0xaaaaaaff,
    parent: testRoot,
  });

  const nodeContain = renderer.createNode({
    x: 100,
    y: 100,
    mount: 0.5,
    texture: renderer.createTexture(
      'ImageTexture',
      { src: rockoImg },
      {
        resizeMode: {
          type: 'contain',
          width: 180,
          height: 180,
        },
      },
    ),
    parent: wrapperContain,
  });

  await execLoadingTest(wrapperContain, nodeContain, 149, 180);

  // Wrapper for cover resizeMode
  const wrapperCover = renderer.createNode({
    x: curX,
    y: curY,
    width: 200,
    height: 200,
    color: 0xaaaaaaff,
    parent: testRoot,
  });

  const nodeCover = renderer.createNode({
    texture: renderer.createTexture(
      'ImageTexture',
      { src: rockoImg },
      {
        preload: true,
        resizeMode: {
          type: 'cover',
          width: 200,
          height: 200,
          clipY: 1,
        },
      },
    ),
    parent: wrapperCover,
  });

  await execLoadingTest(wrapperCover, nodeCover, 200, 241);

  //
  const wrapperCover1 = renderer.createNode({
    x: curX,
    y: curY,
    width: 200,
    height: 200,
    color: 0xaaaaaaff,
    parent: testRoot,
  });

  const nodeCover1 = renderer.createNode({
    texture: renderer.createTexture(
      'ImageTexture',
      { src: environmentImg },
      {
        resizeMode: {
          type: 'cover',
          width: 200,
          height: 200,
          clipX: 0.3,
        },
      },
    ),
    parent: wrapperCover1,
  });

  await execLoadingTest(wrapperCover1, nodeCover1, 356, 200);

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
    wrapperNode: INode,
    imgNode: INode,
    expectedWidth: number,
    expectedHeight: number,
  ) {
    const textNode = renderer.createTextNode({
      x: curX,
      text: '',
      fontSize: FONT_SIZE,
      offsetY: -5,
      parent: testRoot,
    });

    let exception: string | false = false;
    try {
      await waitForTxLoaded(imgNode);
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      exception = (e as any)?.message ?? 'Unknown';
    }

    textNode.y = wrapperNode.y + wrapperNode.height;
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
    textNode.text = `${curTest}. Resize Mode Test: ${result} (${imgNode.width}x${imgNode.height})${expectedPostfix}`;
    curY = textNode.y + FONT_SIZE;
    curTest++;
  }
}
