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

  const url1 = `http://localhost:8080/?url=https%3A%2F%2Fimg001-eu-mo-prd.delivery.skycdp.com%2Fselect%2Fimage%3FentityId%3D8557447259811357112%26companyId%3D5598815685921580105%26width%3D1920%26ratio%3D16x9%26rule%3DSky_Tile%26partnerIdentifier%3Dsky-uk%26location%3DGB%26outputFormat%3Dpng&actions=(a:resize,t:inside,w:${
    123 * 4
  })&output=(f:ktx,c:etc,t:ETC1,q:etcfast)`;

  const randomWidth = Math.floor(Math.random() * 300) + 200;
  const url2 = `http://localhost:8080/?url=https%3A%2F%2Fimg001-eu-mo-prd.delivery.skycdp.com%2Fselect%2Fimage%3FentityId%3D8557447259811357112%26companyId%3D5598815685921580105%26width%3D1920%26ratio%3D16x9%26rule%3DSky_Tile%26partnerIdentifier%3Dsky-uk%26location%3DGB%26outputFormat%3Dpng&actions=(a:resize,t:inside,w:${randomWidth})&output=(f:ktx,c:etc,t:ETC1,q:etcfast)`;

  const compressedNode1 = renderer.createNode({
    x: 100,
    y: 170,
    width: 550,
    height: 550,
    // src: '../assets/green-25.png',
    src: url1,
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
    src: url2,
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
