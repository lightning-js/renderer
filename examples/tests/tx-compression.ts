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

export default async function ({ renderer, testRoot }: ExampleSettings) {
  const cn1Label = renderer.createTextNode({
    x: 100,
    y: 100,
    color: 0xffffffff,
    alpha: 1.0,
    text: 'w: 400',
    fontFamily: 'Ubuntu',
    fontSize: 30,
    parent: testRoot,
  });

  const compressedNode1 = renderer.createNode({
    x: 100,
    y: 170,
    width: 550,
    height: 550,
    src: '../assets/test-etc1.pvr',
    imageType: 'compressed',
    parent: testRoot,
  });

  compressedNode1.on('loaded', (node, data) => {
    const { width, height } = data.dimensions;
    node.width = width;
    node.height = height;

    cn1Label.text = `w: ${width}, h: ${height}`;
  });

  compressedNode1.on('failed', (node, error) => {
    console.error('compressed error', error);
  });

  const cn2Label = renderer.createTextNode({
    x: 800,
    y: 100,
    color: 0xffffffff,
    alpha: 1.0,
    text: 'w: 333',
    fontFamily: 'Ubuntu',
    fontSize: 30,
    parent: testRoot,
  });

  const compressedNode2 = renderer.createNode({
    x: 800,
    y: 170,
    width: 400,
    height: 400,
    src: '../assets/test-s3tc.ktx',
    imageType: 'compressed',
    parent: testRoot,
  });

  compressedNode2.on('loaded', (node, data) => {
    const { width, height } = data.dimensions;
    node.width = width;
    node.height = height;
    cn2Label.text = `w: ${width}, h: ${height}`;
  });
}
