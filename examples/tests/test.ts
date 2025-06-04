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

import { type INode, type IAnimationController } from '@lightningjs/renderer';
import rocko from '../assets/rocko.png';
import elevator from '../assets/elevator.png';
import spritemap from '../assets/spritemap.png';
import { Character } from '../common/Character.js';
import type { ExampleSettings } from '../common/ExampleSettings.js';

export default async function ({ renderer, testRoot }: ExampleSettings) {
  const redRect = renderer.createNode({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    color: 0xff0000ff,
    shader: renderer.createShader('Rounded', {
      radius: 10,
    }),
    parent: testRoot,
  });

  const holder = renderer.createNode({
    x: 150,
    y: 900,
    width: 100,
    height: 100,
    color: 0xff0000ff,
    parent: testRoot,
    zIndex: 0,
    zIndexLocked: 0,
    alpha: 0.5,
  });

  const child = renderer.createNode({
    x: 111,
    y: 0,
    width: 111,
    height: 111,
    color: 0xff0000ff,
    parent: holder,
    zIndex: 12,
    alpha: 0.5,
  });

  const greenRect = renderer.createNode({
    x: 100,
    y: 0,
    width: 100,
    height: 100,
    color: 0x00ff00ff,
    parent: testRoot,
  });

  const shaft = renderer.createNode({
    x: 395,
    y: 0,
    width: 210,
    height: renderer.settings.appHeight,
    color: 0xffffffff,
    texture: renderer.createTexture('NoiseTexture', {
      width: 210,
      height: renderer.settings.appHeight,
    }),
    parent: testRoot,
  });

  /*
   * Begin: Relative Positioning Platform
   */

  const relativePositioningPlatform = renderer.createNode({
    x: 605,
    y: 230,
    width: 1315,
    height: 50,
    color: 0xaabb66ff,
    texture: renderer.createTexture('NoiseTexture', {
      width: 1315,
      height: 50,
    }),
    parent: testRoot,
  });

  const relativePositioningChild = renderer.createNode({
    x: 10,
    y: 10,
    width: 1315 - 20,
    height: 30,
    color: 0xaaedffaa,
    parent: relativePositioningPlatform,
    texture: renderer.createTexture('NoiseTexture', {
      width: 1315 - 20,
      height: 30,
    }),
  });

  const relativePositioningGrandchild = renderer.createNode({
    x: 10,
    y: 10,
    width: 1315 - 20 - 20,
    height: 10,
    color: 0xff00ffff,
    parent: relativePositioningChild,
    texture: renderer.createTexture('NoiseTexture', {
      width: 1315 - 20 - 20,
      height: 50,
    }),
  });

  /*
   * End: Relative Positioning Platform
   */

  const rockoRect = renderer.createNode({
    x: -181,
    y: renderer.settings.appHeight - 218,
    width: 181,
    height: 218,
    src: rocko,
    color: 0xffffffff,
    parent: testRoot,
    zIndex: 1,
  });

  const elevatorRect = renderer.createNode({
    x: 400,
    y: 0,
    width: 200,
    height: 268,
    src: elevator,
    color: 0x0000ffff,
    parent: testRoot,
    zIndex: 2,
    alpha: 0.9,
  });

  const elevatorNumber = renderer.createTextNode({
    x: 0,
    y: 0,
    width: 200,
    height: 268,
    color: 0xffffffff,
    alpha: 1.0,
    text: 'Dn',
    contain: 'both',
    fontFamily: 'Ubuntu',
    fontSize: 100,
    textAlign: 'center',
    parent: elevatorRect,
    zIndex: 3,
  });

  setInterval(() => {
    shaft.texture = renderer.createTexture('NoiseTexture', {
      width: 210,
      height: renderer.settings.appHeight,
      cacheId: Math.floor(Math.random() * 100000),
    });
  }, 1000);

  // setTimeout required for ThreadX right now because the emit() that sends
  // the animation to the renderer worker doesn't work until the Node is fully
  // shared to the worker.
  let rockoAnimation: IAnimationController | null = null;

  setTimeout(async () => {
    while (true) {
      // force behind elevator
      rockoRect.zIndex = 1;

      rockoAnimation = rockoRect.animate({}, { duration: 1000 }).start();
      await rockoAnimation.waitUntilStopped();

      rockoAnimation = rockoRect
        .animate(
          {
            x: 400,
          },
          {
            duration: 1000,
          },
        )
        .start();
      await rockoAnimation.waitUntilStopped();

      rockoAnimation = rockoRect
        .animate(
          {
            y: elevatorRect.height - rockoRect.height,
          },
          {
            duration: 1000,
          },
        )
        .start();
      await rockoAnimation.waitUntilStopped();

      // force before elevator
      rockoRect.zIndex = 3;

      rockoAnimation = rockoRect
        .animate(
          {
            x: renderer.settings.appWidth,
            // y: 100,
          },
          {
            duration: 2616,
          },
        )
        .start();
      await rockoAnimation.waitUntilStopped();

      console.log('resetting rocko');
      rockoRect.x = -rockoRect.width;
      rockoRect.y = renderer.settings.appHeight - 218;
      rockoRect.flush();
    }
  }, 1000);

  let elevatorAnimation: IAnimationController | null = null;

  setTimeout(async () => {
    while (true) {
      elevatorNumber.text = 'Dn';
      elevatorRect.color = 0x0000ffff;
      elevatorAnimation = elevatorRect
        .animate(
          {
            y: 1080 - elevatorRect.height,
          },
          {
            duration: 1000,
          },
        )
        .start();
      await elevatorAnimation.waitUntilStopped();

      elevatorAnimation = elevatorRect
        .animate(
          {
            // y: 1080 - elevatorRect.height,
          },
          {
            duration: 1000,
          },
        )
        .start();
      await elevatorAnimation.waitUntilStopped();

      elevatorNumber.text = 'Up';

      elevatorRect.color = 0x00ff00ff;
      elevatorAnimation = elevatorRect
        .animate(
          {
            y: 0,
          },
          {
            duration: 1000,
          },
        )
        .start();
      await elevatorAnimation.waitUntilStopped();

      elevatorRect.color = 0x00ff00ff;
      elevatorAnimation = elevatorRect
        .animate(
          {
            // y: 0,
          },
          {
            duration: 2616,
          },
        )
        .start();
      await elevatorAnimation.waitUntilStopped();
    }
  }, 1000);

  let blueRect: INode | null = null;

  const interval = setInterval(() => {
    redRect.color++;
  }, 100);

  setInterval(() => {
    if (blueRect) {
      blueRect.destroy();
      blueRect = null;
    } else {
      blueRect = renderer.createNode({
        x: 200,
        y: 0,
        width: 100,
        height: 100,
        color: 0x0000ffff,
        parent: testRoot,
      });
    }
  }, 500);

  setInterval(() => {
    if (greenRect.parent) {
      greenRect.parent = null;
    } else {
      greenRect.parent = testRoot;
    }
  }, 1000);

  /*
   * Begin: Sprite Map Demo
   */

  const spriteMapTexture = renderer.createTexture('ImageTexture', {
    src: spritemap,
  });

  const frames = Array.from(Array(8).keys()).map((i) => {
    const x = (i % 8) * 100;
    const y = Math.floor(i / 8) * 150;
    return renderer.createTexture('SubTexture', {
      texture: spriteMapTexture,
      x,
      y,
      width: 100,
      height: 150,
    });
  });

  // add bunch of characters
  for (let i = 0; i < 5; i++) {
    new Character(
      { x: 800 + i * 200, y: 125, zIndex: i % 2 === 0 ? 3 : 1 },
      renderer,
      frames,
    );
  }

  const character = new Character(
    { x: 1800, y: 125, zIndex: 6 },
    renderer,
    frames,
  );

  // When user presses left or right arrow, move the character
  // When user presses spacebar, jump
  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft') {
      character.setState('left', 'walk');
      character.node
        .animate(
          {
            x: character.node.x - 30,
          },
          { duration: 200 },
        )
        .start();
    } else if (e.code === 'ArrowRight') {
      character.setState('right', 'walk');
      character.node
        .animate(
          {
            x: character.node.x + 30,
          },
          { duration: 200 },
        )
        .start();
    } else if (e.code === 'Space') {
      character.setState(character.direction, 'jump');
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft') {
      character.setState('left', 'idle');
    } else if (e.code === 'ArrowRight') {
      character.setState('right', 'idle');
    }
  });

  /*
   * End: Sprite Map Demo
   */

  /// Text Demo
  const textNode = renderer.createTextNode({
    x: shaft.x + shaft.width,
    y: relativePositioningPlatform.y + relativePositioningPlatform.height,
    width: 300,
    height: 200,
    color: 0xffffffff,
    alpha: 1.0,
    text: 'Text Test: 0',
    fontFamily: 'Ubuntu',
    contain: 'width',
    textAlign: 'center',
    fontSize: 100,
    scale: 1,
    parent: testRoot,
  });

  const noChangeText = renderer.createTextNode({
    x: renderer.settings.appWidth,
    y: renderer.settings.appHeight,
    mount: 1,
    width: 300,
    height: 1,
    color: 0xffffffff,
    alpha: 1.0,
    text: 'Rocko Test',
    fontFamily: 'NotoSans',
    contain: 'width',
    textAlign: 'center',
    fontSize: 100,
    parent: testRoot,
  });

  let count = 1;
  setInterval(() => {
    textNode.text = `Text Test: ${count++}`;
  }, 1000);

  console.log('ready!');
}
