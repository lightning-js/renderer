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

export default async function test({ renderer, testRoot }: ExampleSettings) {
  const node = renderer.createNode({
    width: 500,
    height: 500,
    color: 0x00ff00ff,
    parent: testRoot,
  });

  const animation = node
    .animate({ x: 200, y: 200 }, { duration: 16.7 })
    .start();
  await animation.waitUntilStarted();
  console.log('Animation started');
  await animation.waitUntilStopped();
  // Depending on subtle timing differences we may or may not ever get to this
  // point in the code.
  console.log('Animation stopped');
  await node
    .animate({ x: 100, y: 100 }, { duration: 1000 })
    .start()
    .waitUntilStopped();
}
