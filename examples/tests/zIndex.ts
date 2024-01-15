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

export const Colors = {
  Black: 0x000000ff,
  Red: 0xff0000ff,
  Green: 0x00ff00ff,
  Blue: 0x0000ffff,
  Magenta: 0xff00ffff,
  Gray: 0x7f7f7fff,
  White: 0xffffffff,
};

export async function automation(settings: ExampleSettings) {
  // Snapshot single page
  await test(settings);
  await settings.snapshot();
}

export default async function test({ renderer, testRoot }: ExampleSettings) {
  const leftStackText = renderer.createTextNode({
    x: 100,
    y: 100,
    width: 400,
    height: 268,
    color: 0xffffffff,
    alpha: 1.0,
    text: 'These should neatly stack on top of each other.',
    contain: 'both',
    fontFamily: 'Ubuntu',
    fontSize: 30,
    textAlign: 'center',
    parent: testRoot,
    zIndex: 3,
  });

  const generatedRectangles: any = [];

  Array(10)
    .fill(null)
    .forEach((_, i) => {
      const color = Object.keys(Colors)[i % Object.keys(Colors).length];

      generatedRectangles.push(
        renderer.createNode({
          x: 200 + i * 20,
          y: 200 + i * 20,
          width: 200,
          height: 200,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          color: Colors[color],
          shader: renderer.createShader('RoundedRectangle', {
            radius: 2,
          }),
          zIndex: 10 + (i + 1),
          parent: testRoot,
        }),
      );
    });

  const parentRect = renderer.createNode({
    x: 800,
    y: 200,
    width: 600,
    height: 600,
    color: Colors.Gray,
    // shader: renderer.createShader('RoundedRectangle', {
    //   radius: 40,
    // }),
    zIndex: 2,
    parent: testRoot,
    zIndexLocked: 1,
  });

  const childRectWhite = renderer.createNode({
    x: 100,
    y: 100,
    width: 200,
    height: 200,
    color: Colors.White,
    // shader: renderer.createShader('RoundedRectangle', {
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
    color: Colors.Red,
    // shader: renderer.createShader('RoundedRectangle', {
    //   radius: 40,
    // }),
    zIndex: 5,
    parent: parentRect,
  });

  const rightStackText = renderer.createTextNode({
    x: 700,
    y: 100,
    width: 700,
    height: 268,
    color: 0xffffffff,
    alpha: 1.0,
    text: 'Green box should overlap even though it has a lower zIndex because the parent is locked',
    contain: 'both',
    fontFamily: 'Ubuntu',
    fontSize: 30,
    textAlign: 'center',
    parent: testRoot,
    zIndex: 3,
  });

  const blockingRect = renderer.createNode({
    x: 750,
    y: 300,
    width: 400,
    height: 100,
    color: Colors.Green,
    // shader: renderer.createShader('RoundedRectangle', {
    //   radius: 40,
    // }),
    zIndex: 2,
    parent: testRoot,
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft') {
      // reverse the order of the rectangles
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
      generatedRectangles.forEach((rect: any) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        rect.zIndex = 100 - rect.zIndex;
      });
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
    shader: renderer.createShader('RoundedRectangle', {
      radius: 2,
    }),
    // eslint-disable-next-line  @typescript-eslint/no-loss-of-precision
    zIndex: 148901482921849101841290481,
    // eslint-disable-next-line  @typescript-eslint/no-loss-of-precision
    zIndexLocked: 148901482921849101841290481,
    parent: testRoot,
  });

  renderer.createNode({
    x: 0,
    y: 900,
    width: 10,
    height: 10,
    color: 0x00ffffff,
    shader: renderer.createShader('RoundedRectangle', {
      radius: 2,
    }),
    // eslint-disable-next-line  @typescript-eslint/no-loss-of-precision
    zIndex: -148901482921849101841290481,
    // eslint-disable-next-line  @typescript-eslint/no-loss-of-precision
    zIndexLocked: -148901482921849101841290481,
    parent: testRoot,
  });

  renderer.createNode({
    x: 1000,
    y: 900,
    width: 10,
    height: 10,
    color: 0x00ffffff,
    shader: renderer.createShader('RoundedRectangle', {
      radius: 2,
    }),
    // @ts-expect-error Invalid prop test
    zIndex: 'boop',
    // @ts-expect-error Invalid prop test
    zIndexLocked: 'boop',
    parent: testRoot,
  });

  renderer.createNode({
    x: 1000,
    y: 0,
    width: 10,
    height: 10,
    color: 0x00ffffff,
    shader: renderer.createShader('RoundedRectangle', {
      radius: 2,
    }),
    // @ts-expect-error Invalid prop test
    zIndex: true,
    // @ts-expect-error Invalid prop test
    zIndexLocked: true,
    parent: testRoot,
  });

  renderer.createNode({
    x: 1000,
    y: 0,
    width: 10,
    height: 10,
    color: 0x00ffffff,
    shader: renderer.createShader('RoundedRectangle', {
      radius: 2,
    }),
    // @ts-expect-error Invalid prop test
    zIndex: null,
    // @ts-expect-error Invalid prop test
    zIndexLocked: null,
    parent: testRoot,
  });

  renderer.createNode({
    x: 200,
    y: 0,
    width: 10,
    height: 10,
    color: 0x00ffffff,
    shader: renderer.createShader('RoundedRectangle', {
      radius: 2,
    }),
    zIndex: undefined,
    zIndexLocked: undefined,
    parent: testRoot,
  });

  renderer.createNode({
    x: 200,
    y: 900,
    width: 10,
    height: 10,
    color: 0x00ffffff,
    shader: renderer.createShader('RoundedRectangle', {
      radius: 2,
    }),
    // @ts-expect-error Invalid prop test
    // eslint-disable-next-line  @typescript-eslint/no-empty-function
    zIndex: () => {},
    // @ts-expect-error Invalid prop test
    // eslint-disable-next-line  @typescript-eslint/no-empty-function
    zIndexLocked: () => {},
    parent: testRoot,
  });

  renderer.createNode({
    x: 500,
    y: 900,
    width: 10,
    height: 10,
    color: 0x00ffffff,
    shader: renderer.createShader('RoundedRectangle', {
      radius: 2,
    }),
    // @ts-expect-error Invalid prop test
    zIndex: {},
    // @ts-expect-error Invalid prop test
    zIndexLocked: {},
    parent: testRoot,
  });
}
