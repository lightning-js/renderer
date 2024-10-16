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
  const textNode = renderer.createTextNode({
    width: 600,
    height: 200,
    color: 0xffffffff,
    alpha: 1.0,
    text: 'Force Canvas Test: 1',
    fontFamily: 'Ubuntu',
    contain: 'width',
    textAlign: 'center',
    fontSize: 80,
    scale: 1,
    parent: testRoot,
  });

  let count = 1;
  setInterval(() => {
    textNode.text = `Force Canvas Test: ${count++}`;
  }, 1000);
  console.log('ready!');
}
