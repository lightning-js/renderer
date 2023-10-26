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
  const t0 = renderer.createNode({
    x: 0,
    y: 0,
    src: 'https://image.tmdb.org/t/p/original/mvoW41kdSxiobGZ9ONL1Tqrpt3h.jpg',
    width: 1920,
    height: 1080,
    zIndex: 29,
    shader: renderer.createShader('DynamicShader', {
      effects: [
        {
          type: 'radialGradient',
          props: {
            colors: [0x0000007c, 0x0000007c, 0x004882ff],
            stops: [0, 0.4, 1.0],
            height: 720,
            width: 1920,
            pivot: [0.8, 0],
          },
        },
      ],
    }),
    parent: renderer.root,
  });

  /*
   * End: Sprite Map Demo
   */
  console.log('ready!');
}
