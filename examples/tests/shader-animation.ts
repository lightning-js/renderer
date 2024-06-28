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
  // await settings.snapshot();
}

export default async function test({
  renderer,
  testRoot,
  snapshot,
}: ExampleSettings) {
  const degToRad = (deg: number) => {
    return (Math.PI / 180) * deg;
  };

  const nodeSize = {
    width: 300,
    height: 300,
  };

  const t1 = renderer.createNode({
    ...nodeSize,
    x: 90,
    y: 90,
    color: 0xff0000ff,
    shader: renderer.createShader('RoundedRectangle', {
      radius: 100,
    }),
    parent: testRoot,
  });

  const t1Radius = renderer.createTextNode({
    mountX: 1,
    x: testRoot.width - 90,
    y: 90,
    fontSize: 40,
    fontFamily: 'Ubuntu',
    text: 'radius: 100',
    parent: testRoot,
    color: 0xffffffff,
  });

  const t2 = renderer.createNode({
    ...nodeSize,
    x: 90,
    y: 540,
    color: 0x00ff00ff,
    shader: renderer.createDynamicShader([
      renderer.createEffect('r1', 'radius', {
        radius: 0,
      }),
      renderer.createEffect('e1', 'border', {
        color: 0xff00ffff,
        width: 10,
      }),
    ]),
    parent: testRoot,
  });

  const t2Radius = renderer.createTextNode({
    mountX: 1,
    x: testRoot.width - 90,
    y: 540,
    fontSize: 40,
    fontFamily: 'Ubuntu',
    text: 'radius: 0',
    parent: testRoot,
    color: 0xffffffff,
  });

  const t2Border = renderer.createTextNode({
    mountX: 1,
    x: testRoot.width - 90,
    y: 590,
    fontSize: 40,
    fontFamily: 'Ubuntu',
    text: 'border: 10',
    parent: testRoot,
    color: 0xffffffff,
  });

  await snapshot({ name: 'startup' });

  const shaderAnimation = t1.animate(
    {
      x: 1140,
      shaderProps: {
        radius: 150,
      },
    },
    {
      duration: 500,
    },
  );
  shaderAnimation.start();
  await shaderAnimation.waitUntilStopped();
  t1Radius.text = 'radius: ' + t1.shader.props.radius!.toString();

  await snapshot({ name: 'animation1 finished' });

  const shaderAnimation2 = t2.animate(
    {
      x: 1140,
      shaderProps: {
        r1: {
          radius: 150,
        },
        e1: {
          width: 50,
        },
      },
    },
    {
      duration: 500,
    },
  );

  shaderAnimation2.start();
  await shaderAnimation2.waitUntilStopped();
  t2Radius.text = 'radius: ' + t2.shader.props.r1.radius!.toString();
  t2Border.text = 'border: ' + t2.shader.props.e1.width!.toString();

  await snapshot({ name: 'animation2 finished' });
  console.log('ready!');
}
