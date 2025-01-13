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

import type { ExampleSettings } from '../common/ExampleSettings.js';
import spritemap from '../assets/spritemap.png';

export async function automation(settings: ExampleSettings) {
  // Snapshot single page
  await test(settings);
  await settings.snapshot();
}

export default async function test({ renderer, testRoot }: ExampleSettings) {
  const FONT_SIZE = 45;

  renderer.createTextNode({
    text: `Render to Texture Spritemap Test`,
    fontSize: FONT_SIZE,
    offsetY: -5,
    parent: testRoot,
  });

  const spriteMapTexture = renderer.createTexture('ImageTexture', {
    src: spritemap,
  });

  spriteMapTexture.on('load', (dimensions) => {
    console.log('Spritemap Texture loaded', dimensions);
  });

  const rttNode = renderer.createNode({
    x: 200,
    y: 200,
    width: 300,
    height: 300,
    parent: testRoot,
    rtt: true,
    clipping: true,
    zIndex: 5,
    colorTop: 0xfff00fff,
    colorBottom: 0x00ffffff,
  });

  renderer.createNode({
    x: 0,
    y: 0,
    width: 300,
    height: 300,
    parent: rttNode,
    color: 0xff0000ff,
  });

  renderer.createTextNode({
    x: 0,
    y: 0,
    text: 'Render to texture',
    parent: rttNode,
    fontSize: 48,
    color: 0xffffffff,
    fontFamily: 'Ubuntu',
  });

  function execTest(
    positionX: number,
    sourceX: number,
    title: string,
  ): Promise<boolean> {
    const character = renderer.createTexture('SubTexture', {
      texture: spriteMapTexture,
      x: sourceX,
      y: 0,
      width: 100,
      height: 150,
    });

    renderer.createNode({
      x: positionX,
      y: 80,
      width: 100,
      height: 150,
      texture: character,
      parent: rttNode,
    });

    return new Promise((resolve, reject) => {
      renderer.once('idle', () => {
        resolve(true);
      });
    });
  }

  await execTest(0, 0, 'Character 1');
  await execTest(60, 100, 'Character 2');
  await execTest(120, 200, 'Character 3');
  await execTest(180, 300, 'Character 4');
  await execTest(240, 400, 'Character 5');
}
