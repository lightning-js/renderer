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

export default async function ({ renderer }: ExampleSettings) {
  const rectOne = renderer.createNode({
    x: 200,
    y: 200,
    width: 200,
    height: 200,
    color: 0xaabb66ff,
    shader: renderer.makeShader('RoundedRectangle', {
      radius: 40,
    }),
    zIndex: 1,
    parent: renderer.root,
  });

  const rectTwo = renderer.createNode({
    x: 220,
    y: 220,
    width: 200,
    height: 200,
    color: 0xffaaee00,
    shader: renderer.makeShader('RoundedRectangle', {
      radius: 40,
    }),
    zIndex: 3,
    parent: renderer.root,
  });

  const rectThree = renderer.createNode({
    x: 240,
    y: 240,
    width: 200,
    height: 200,
    color: 0x0000ffff,
    shader: renderer.makeShader('RoundedRectangle', {
      radius: 40,
    }),
    zIndex: 4,
    parent: renderer.root,
  });

  const parentRect = renderer.createNode({
    x: 800,
    y: 200,
    width: 600,
    height: 600,
    color: 0xaabb66ff,
    // shader: renderer.makeShader('RoundedRectangle', {
    //   radius: 40,
    // }),
    zIndex: 2,
    parent: renderer.root,
    zIndexLocked: 1,
  });

  const childRectWhite = renderer.createNode({
    x: 100,
    y: 100,
    width: 200,
    height: 200,
    color: 0xffaaee00,
    // shader: renderer.makeShader('RoundedRectangle', {
    //   radius: 40,
    // }),
    zIndex: 4,
    parent: parentRect,
  });

  const childRectRed = renderer.createNode({
    x: 120,
    y: 120,
    width: 200,
    height: 200,
    color: 0x0000ffff,
    // shader: renderer.makeShader('RoundedRectangle', {
    //   radius: 40,
    // }),
    zIndex: 5,
    parent: parentRect,
  });

  const blockingRect = renderer.createNode({
    x: 80,
    y: 80,
    width: 1600,
    height: 800,
    color: 0x00ffffff,
    // shader: renderer.makeShader('RoundedRectangle', {
    //   radius: 40,
    // }),
    zIndex: 0,
    parent: renderer.root,
  });

  const rectOrder = [rectOne, rectTwo, rectThree];
  const rectChildOrder = [parentRect, childRectWhite, childRectRed];

  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft') {
      console.log('Reversing');
      rectOrder.reverse();
      rectOrder.forEach((rect, i) => {
        rect.zIndex = i + 1;
      });

      rectChildOrder.reverse();
      rectChildOrder.forEach((rect, i) => {
        rect.zIndex = i + 2;
      });
    } else if (e.code === 'ArrowRight') {
      console.log('middle');
      rectTwo.zIndex = rectTwo.zIndex === 100 ? 2 : 100;
      childRectWhite.zIndex = childRectWhite.zIndex === 100 ? 4 : 100;
    } else if (e.code === 'Space') {
      blockingRect.zIndex = blockingRect.zIndex === 10 ? 0 : 10;
    }
  });

  /*
   * Error stuff
   */

  renderer.createNode({
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    color: 0x00ffffff,
    shader: renderer.makeShader('RoundedRectangle', {
      radius: 2,
    }),
    // eslint-disable-next-line  @typescript-eslint/no-loss-of-precision
    zIndex: 148901482921849101841290481,
    // eslint-disable-next-line  @typescript-eslint/no-loss-of-precision
    zIndexLocked: 148901482921849101841290481,
    parent: renderer.root,
  });

  renderer.createNode({
    x: 0,
    y: 900,
    width: 10,
    height: 10,
    color: 0x00ffffff,
    shader: renderer.makeShader('RoundedRectangle', {
      radius: 2,
    }),
    // eslint-disable-next-line  @typescript-eslint/no-loss-of-precision
    zIndex: -148901482921849101841290481,
    // eslint-disable-next-line  @typescript-eslint/no-loss-of-precision
    zIndexLocked: -148901482921849101841290481,
    parent: renderer.root,
  });

  renderer.createNode({
    x: 1000,
    y: 900,
    width: 10,
    height: 10,
    color: 0x00ffffff,
    shader: renderer.makeShader('RoundedRectangle', {
      radius: 2,
    }),
    // @ts-expect-error Invalid prop test
    zIndex: 'boop',
    // @ts-expect-error Invalid prop test
    zIndexLocked: 'boop',
    parent: renderer.root,
  });

  renderer.createNode({
    x: 1000,
    y: 0,
    width: 10,
    height: 10,
    color: 0x00ffffff,
    shader: renderer.makeShader('RoundedRectangle', {
      radius: 2,
    }),
    // @ts-expect-error Invalid prop test
    zIndex: true,
    // @ts-expect-error Invalid prop test
    zIndexLocked: true,
    parent: renderer.root,
  });

  renderer.createNode({
    x: 1000,
    y: 0,
    width: 10,
    height: 10,
    color: 0x00ffffff,
    shader: renderer.makeShader('RoundedRectangle', {
      radius: 2,
    }),
    // @ts-expect-error Invalid prop test
    zIndex: null,
    // @ts-expect-error Invalid prop test
    zIndexLocked: null,
    parent: renderer.root,
  });

  renderer.createNode({
    x: 200,
    y: 0,
    width: 10,
    height: 10,
    color: 0x00ffffff,
    shader: renderer.makeShader('RoundedRectangle', {
      radius: 2,
    }),
    zIndex: undefined,
    zIndexLocked: undefined,
    parent: renderer.root,
  });

  renderer.createNode({
    x: 200,
    y: 900,
    width: 10,
    height: 10,
    color: 0x00ffffff,
    shader: renderer.makeShader('RoundedRectangle', {
      radius: 2,
    }),
    // @ts-expect-error Invalid prop test
    // eslint-disable-next-line  @typescript-eslint/no-empty-function
    zIndex: () => {},
    // @ts-expect-error Invalid prop test
    // eslint-disable-next-line  @typescript-eslint/no-empty-function
    zIndexLocked: () => {},
    parent: renderer.root,
  });

  renderer.createNode({
    x: 500,
    y: 900,
    width: 10,
    height: 10,
    color: 0x00ffffff,
    shader: renderer.makeShader('RoundedRectangle', {
      radius: 2,
    }),
    // @ts-expect-error Invalid prop test
    zIndex: {},
    // @ts-expect-error Invalid prop test
    zIndexLocked: {},
    parent: renderer.root,
  });
}
