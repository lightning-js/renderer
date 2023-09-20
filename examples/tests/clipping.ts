/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2023 Comcast
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

export default async function ({ renderer, appDimensions }: ExampleSettings) {
  const roundRectShader = renderer.makeShader('RoundedRectangle', {
    radius: 10,
  });

  const parentX = 0;
  const parentY = 0;

  // Create two nodes spaced appart
  const n1 = renderer.createNode({
    x: parentX,
    y: parentY,
    width: 400,
    height: 400,
    // shader: roundRectShader,
    color: 0xff0000ff,
    parent: renderer.root,
    clipping: true,
  });

  const n2 = renderer.createNode({
    x: -parentX,
    y: -parentY,
    width: appDimensions.width,
    height: appDimensions.height,
    // shader: roundRectShader,
    color: 0x00ff0099,
    parent: n1,
  });

  const bottomRightCornerX = 1920 - 400;
  const bottomRightCornerY = 1080 - 400;

  const a1 = n1
    .animate(
      { x: bottomRightCornerX, y: bottomRightCornerY },
      { duration: 10000, repeat: 10 },
    )
    .start();
  const a2 = n2
    .animate(
      { x: -bottomRightCornerX, y: -bottomRightCornerY },
      { duration: 10000, repeat: 10 },
    )
    .start();
  await Promise.all([a1.waitUntilStopped(), a2.waitUntilStopped()]);
}
