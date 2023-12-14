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
  const etc1Pvr = renderer.createNode({
    x: 100,
    y: 100,
    width: 550,
    height: 550,
    src: '../assets/test-etc1.pvr',
    parent: testRoot,
  });

  const s3tcKtx = renderer.createNode({
    x: 800,
    y: 100,
    width: 250,
    height: 250,
    src: '../assets/test-s3tc.ktx',
    parent: testRoot,
  });
  /*
   * End: Sprite Map Demo
   */
  console.log('ready!');
}
