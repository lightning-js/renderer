/*
 * Copyright 2023 Comcast Cable Communications Management, LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
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
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ExampleSettings } from '../common/ExampleSettings.js';

export async function automation(settings: ExampleSettings) {
  const next = await test(settings);
  await settings.snapshot();
  while (await next()) {
    await settings.snapshot();
  }
}

export default async function test({ renderer, testRoot }: ExampleSettings) {
  let radialW = 400;
  let radialH = 400;
  let radialPivotX = 0.5;
  let radialPivotY = 0.5;

  const node = renderer.createNode({
    x: 0,
    y: 0,
    w: 1920,
    h: 1080,
    color: 0xffffffff,
    shader: renderer.createShader('RadialGradient', {
      colors: [0xffff00ff, 0xff0000ff, 0x0000ffff],
      stops: [0, 0.5, 1],
      w: radialW,
      h: radialH,
      pivot: [radialPivotX, radialPivotY],
    }),
    parent: testRoot,
  });

  const controlNode = renderer.createNode({
    x: node.w * radialPivotX,
    y: node.h * radialPivotY,
    mount: 0.5,
    w: radialW,
    h: radialH,
    color: 0x00000000,
    shader: renderer.createShader('Border', {
      w: 2,
      color: 0x00ff00ff,
    }),
    parent: node,
  });

  const changeGradientParams = (
    w: number,
    h: number,
    pivotX: number,
    pivotY: number,
  ) => {
    node.shader.props = {
      w,
      h,
      pivot: [pivotX, pivotY],
    };

    controlNode.x = node.w * pivotX;
    controlNode.y = node.h * pivotY;
    controlNode.w = w;
    controlNode.h = h;
  };

  const mutations = [
    () => {
      changeGradientParams(400, 400, 0, 0);
    },
    () => {
      changeGradientParams(400, 400, 1, 1);
    },
    () => {
      changeGradientParams(2400, 800, 0.5, 1.1);
    },
    () => {
      changeGradientParams(400, 2400, 0.8, 0.5);
    },
  ];
  let i = -1;

  async function next(loop = false, idx = i + 1) {
    if (idx > mutations.length - 1) {
      if (!loop) {
        return false;
      }
      idx = 0;
    }
    i = idx;
    mutations[idx]!();
    return true;
  }

  window.addEventListener('keydown', (event) => {
    // When right arrow is pressed, call next
    if (event.key === 'ArrowRight') {
      next(true).catch(console.error);
    }
  });

  return next;
}
