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

import logo from '../assets/lightning.png';
import type { ExampleSettings } from '../common/ExampleSettings.js';

export default async function ({ renderer, testRoot }: ExampleSettings) {
  const bg = renderer.createNode({
    width: 1920,
    height: 1080,
    color: 0x000000ff,
    parent: testRoot,
  });

  const dataNodeCheckBox = renderer.createNode({
    width: 100,
    height: 100,
    x: 80,
    y: 200,
    color: 0xff0000ff,
    parent: bg,
  });

  const dataNode = renderer.createNode({
    width: 505,
    height: 101,
    x: 200,
    y: 200,
    src: logo,
    parent: bg,
    data: {
      id: 'dataNode',
      number: 1,
      boolean: true,
    },
  });

  const tooLongStringCheckBox = renderer.createNode({
    width: 100,
    height: 100,
    x: 80,
    y: 400,
    color: 0xff0000ff,
    parent: bg,
  });

  const tooLongString = renderer.createNode({
    width: 505,
    height: 101,
    x: 200,
    y: 400,
    src: logo,
    parent: bg,
    data: {
      id: 'tooLongString',
      b: 'a'.repeat(2049),
    },
  });

  const textNodeCheckBox = renderer.createNode({
    width: 100,
    height: 100,
    x: 80,
    y: 600,
    color: 0xff0000ff,
    parent: bg,
  });

  const textNode = renderer.createTextNode({
    x: 200,
    y: 600,
    height: 100,
    text: 'Hello World',
    fontFamily: 'Ubuntu',
    fontSize: 100,
    parent: bg,
    data: {
      id: 'textNode',
    },
  });

  const testDetailsText = renderer.createTextNode({
    x: 30,
    y: 80,
    height: 100,
    text: 'Boxes should turn green if the inspector is enabled',
    fontFamily: 'Ubuntu',
    fontSize: 50,
    parent: bg,
  });

  const testQparamDetailsText = renderer.createTextNode({
    x: 30,
    y: 800,
    height: 100,
    text: 'Please make sure to run this test with ?inspector=true',
    fontFamily: 'Ubuntu',
    fontSize: 50,
    parent: bg,
  });

  setTimeout(() => {
    // Select the first element with data-id="dataNode"
    const domDataNode = document.querySelector('[data-id="dataNode"]');
    if (domDataNode) {
      dataNodeCheckBox.color = 0x00ff00ff;
    }

    const domTooLongString = document.querySelector(
      '[data-id="tooLongString"]',
    );

    if (domTooLongString) {
      tooLongStringCheckBox.color = 0x00ff00ff;
    }

    const domTextNode = document.querySelector('[data-id="textNode"]');

    if (domTextNode) {
      textNodeCheckBox.color = 0x00ff00ff;
    }
  }, 1000);
}
