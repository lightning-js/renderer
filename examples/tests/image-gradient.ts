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
import rocko from '../assets/rocko.png';

export default async function ({ renderer }: ExampleSettings) {
  const elements = [
    'colorTl',
    'colorTr',
    'colorBl',
    'colorBr',
    'colorTop',
    'colorBottom',
    'colorLeft',
    'colorRight',
    'color',
  ];

  const nodes = elements.map((element, idx) => {
    return renderer.createNode({
      src: rocko,
      x: (idx % 4) * 300 + 100,
      y: Math.floor(idx / 4) * 300 + 100,
      width: 250,
      height: 250,
      color: 0x000000ff,
      [element]: 0xff0000ff,
      parent: renderer.root,
    });
  });

  setTimeout(() => {
    nodes.forEach((node, idx) => {
      node
        .animate(
          {
            [elements[idx] ?? 'color']: 0x00ff00ff,
          },
          {
            duration: 1000,
          },
        )
        .start();
    });
  }, 2000);
  /*
   * End: Sprite Map Demo
   */
  console.log('ready!');
}
