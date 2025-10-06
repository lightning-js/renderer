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

export async function automation(settings: ExampleSettings) {
  // Snapshot single page
  await test(settings);
  await settings.snapshot();
}

export default async function test({ renderer, testRoot }: ExampleSettings) {
  const node = renderer.createNode({
    x: 0,
    y: 0,
    w: 1920,
    h: 1080,
    color: 0x000000ff,
    parent: testRoot,
  });

  const holderNode = renderer.createNode({
    x: 1920 / 2 - 100,
    y: 1080 / 3 - 100,
    w: 200,
    h: 200,
    color: 0xffffffff,
    parent: node,
  });

  const alignedNodeDescription = renderer.createTextNode({
    parent: node,
    x: 200,
    y: 1080 / 3 - 30,
    fontFamily: 'Ubuntu',
    fontSize: 30,
    text: 'Shows a parent node with 4 aligned children',
  });

  const alignedNodeProps = {
    x: 0,
    y: 0,
    w: 50,
    h: 50,
    color: 0xffa500ff,
    parent: holderNode,
  };

  const alignedNodeTL = renderer.createNode({
    ...alignedNodeProps,
  });

  const alignedNodeTR = renderer.createNode({
    ...alignedNodeProps,
    x: 150,
  });

  const alignedNodeBL = renderer.createNode({
    ...alignedNodeProps,
    y: 150,
  });

  const alignedNodeBR = renderer.createNode({
    ...alignedNodeProps,
    x: 150,
    y: 150,
  });

  const emptyHolderNode = renderer.createNode({
    x: 1920 / 2 - 100,
    y: 1080 / 2,
    parent: testRoot,
  });

  const emptyAlignedNodeDescription = renderer.createTextNode({
    parent: node,
    x: 200,
    y: 1080 / 2 + 30,
    fontFamily: 'Ubuntu',
    fontSize: 30,
    text: 'Shows a empty holder node, with a parent \nnode and 4 aligned children',
  });

  const holderNodeTwo = renderer.createNode({
    x: 0,
    y: 0,
    w: 200,
    h: 200,
    parent: emptyHolderNode,
  });

  const emptyAlignedNodeProps = {
    ...alignedNodeProps,
    parent: holderNodeTwo,
  };

  const emptyAlignedNodeTL = renderer.createNode({
    ...emptyAlignedNodeProps,
  });

  const emptyalignedNodeTR = renderer.createNode({
    ...emptyAlignedNodeProps,
    x: 150,
  });

  const emptalignedNodeBL = renderer.createNode({
    ...emptyAlignedNodeProps,
    x: 0,
    y: 150,
  });

  const emptyalignedNodeBR = renderer.createNode({
    ...emptyAlignedNodeProps,
    x: 150,
    y: 150,
  });
}
