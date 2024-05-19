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

export default async function ({
  renderer,
  driverName,
  testRoot,
}: ExampleSettings) {
  const randomColor = () => {
    const randomInt = Math.floor(Math.random() * Math.pow(2, 32));
    const hexString = randomInt.toString(16).padStart(8, '0');

    return `#${hexString}`;
  };
  const rnd = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
  };

  const FONT_SIZE = 45;

  renderer.createTextNode({
    text: `Texture Factory Test (${driverName})`,
    fontSize: FONT_SIZE,
    offsetY: -5,
    parent: testRoot,
  });

  function execTest(y: number, title: string, setKey: boolean): Promise<boolean> {
    const textNode = renderer.createTextNode({
      text: title,
      fontSize: FONT_SIZE,
      y: y,
      parent: testRoot,
    });

    let factoryRuns = 0;

    const factory = () => {
      factoryRuns++;
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Unable to create canvas 2d context');
      for (let i = 0; i<10; i++) {
        ctx.fillStyle = randomColor();
        ctx.fillRect(rnd(0, 280), rnd(0, 180), rnd(20, 200), rnd(20, 100));
      }
      return ctx.getImageData(0, 0, 300, 200);
    }

    renderer.createNode({
      color: 0xffffffff,
      x: 20,
      y: y + 80,
      width: 300,
      height: 200,
      parent: testRoot,
      texture: renderer.createTexture(
        'ImageTexture', {
          src: factory,
          key: setKey ? `test-key-${y}` : undefined
        }
      )
    });

    renderer.createNode({
      color: 0xffffffff,
      x: 340,
      y: y + 80,
      width: 300,
      height: 200,
      parent: testRoot,
      texture: renderer.createTexture(
        'ImageTexture', {
          src: factory,
          key: setKey ? `test-key-${y}` : undefined
        }
      )
    });

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        let result = '';
        if ((setKey && factoryRuns === 1) || (!setKey && factoryRuns === 2)) {
          textNode.color = 0x00ff00ff;
          result = 'Pass';
        } else {
          textNode.color = 0xff0000ff;
          result = `Fail (${factoryRuns})`;
        }
        textNode.text += `: ${result}`;
        if (result === 'Pass') resolve(true);
        else reject({ setKey, factoryRuns });
      }, 50);
    });
  }

  await execTest(80, '1 - No key', false);
  await execTest(400, '2 - With key', true);
}
