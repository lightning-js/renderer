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
  const ktx1Label = renderer.createTextNode({
    x: 100,
    y: 100,
    color: 0xffffffff,
    alpha: 1.0,
    text: 'w: 400',
    fontFamily: 'Ubuntu',
    fontSize: 30,
    parent: testRoot,
  });

  const url1 =
    'https://img001-eu-mo-prd.delivery.skycdp.com/select/image?entityId=8557447259811357112&companyId=5598815685921580105&width=400&ratio=16x9&rule=Sky_Tile&partnerIdentifier=sky-uk&location=GB&route=lightning&outputFormat=ktx&compression=etc&compressionType=ETC1&compressionQuality=etcfast';

  const randomWidth = Math.floor(Math.random() * 300) + 200;
  const url2 = `https://img001-eu-mo-prd.delivery.skycdp.com/select/image?entityId=8557447259811357112&companyId=5598815685921580105&width=${randomWidth}&ratio=16x9&rule=Sky_Tile&partnerIdentifier=sky-uk&location=GB&route=lightning&outputFormat=ktx&compression=etc&compressionType=ETC1&compressionQuality=etcfast`;

  const ktx1 = renderer.createNode({
    x: 100,
    y: 170,
    width: 550,
    height: 550,
    // src: '../assets/test-etc1.pvr',
    src: url1,
    imageType: 'compressed',
    parent: testRoot,
  });

  ktx1.on('loaded', (node, data) => {
    console.log('ktx1 loaded');
    const { width, height } = data.dimensions;
    node.width = width;
    node.height = height;

    ktx1Label.text = `w: ${width}, h: ${height}`;
  });

  const ktx2Label = renderer.createTextNode({
    x: 800,
    y: 100,
    color: 0xffffffff,
    alpha: 1.0,
    text: 'w: 333',
    fontFamily: 'Ubuntu',
    fontSize: 30,
    parent: testRoot,
  });

  const ktx2 = renderer.createNode({
    x: 800,
    y: 170,
    width: 400,
    height: 400,
    src: url2,
    imageType: 'ktx',
    parent: testRoot,
  });

  ktx2.on('loaded', (node, data) => {
    console.log('ktx2 loaded');
    const { width, height } = data.dimensions;
    node.width = width;
    node.height = height;
    ktx2Label.text = `w: ${width}, h: ${height}`;
  });
}
