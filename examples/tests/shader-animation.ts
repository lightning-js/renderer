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

export async function automation(settings: ExampleSettings) {
  // Snapshot single page
  await test(settings);
  await settings.snapshot();
}

export default async function test({ renderer, testRoot }: ExampleSettings) {
  const degToRad = (deg: number) => {
    return (Math.PI / 180) * deg;
  };

  const t1 = renderer.createNode({
    x: 0,
    y: 0,
    width: 960,
    height: 540,
    color: 0xff0000ff,
    shader: renderer.createShader('RoundedRectangle', {
      radius: 40,
    }),
    parent: testRoot,
  });

  const shaderAnimation = t1.animate(
    {
      x: 400,
      shader: {
        radius: 200,
      },
    },
    {
      delay: 400,
      duration: 5000,
    },
  );

  shaderAnimation?.start();

  document.addEventListener('click', () => {
    if (t1.shader) {
      t1.shader.radius = 10;
    }
  });

  console.log('ready!');
}
