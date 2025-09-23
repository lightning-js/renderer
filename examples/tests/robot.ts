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

import environmentImg from '../assets/robot/environment.png';
import doorLeftGroundImg from '../assets/robot/elevator-door-left-ground-floor.png';
import doorRightGroundImg from '../assets/robot/elevator-door-right-ground-floor.png';
import doorTopTopImg from '../assets/robot/elevator-door-top-top-floor.png';
import doorBottomTopImg from '../assets/robot/elevator-door-bottom-top-floor.png';
import elevatorBgImg from '../assets/robot/elevator-background.png';
import robotImg from '../assets/robot/robot.png';
import shadowImg from '../assets/robot/robot-shadow.png';
import type { ExampleSettings } from '../common/ExampleSettings.js';

export default async function ({ renderer, testRoot }: ExampleSettings) {
  const elevatorBg = renderer.createNode({
    x: 368,
    y: 228,
    w: 226,
    h: 214,
    zIndex: 0,
    src: elevatorBgImg,
    parent: testRoot,
  });

  const elevatorBg2 = renderer.createNode({
    x: 368,
    y: 827,
    w: 226,
    h: 214,
    zIndex: 0,
    src: elevatorBgImg,
    parent: testRoot,
  });

  const doorLeftGround = renderer.createNode({
    x: 480 - 68,
    y: 827,
    w: 68,
    h: 194,
    zIndex: 2,
    src: doorLeftGroundImg,
    parent: testRoot,
  });

  const doorRightGround = renderer.createNode({
    x: 480,
    y: 827,
    w: 68,
    h: 194,
    zIndex: 2,
    src: doorRightGroundImg,
    parent: testRoot,
  });

  const environment = renderer.createNode({
    x: 0,
    y: 0,
    w: renderer.settings.appWidth,
    h: renderer.settings.appHeight,
    zIndex: 3,
    src: environmentImg,
    parent: testRoot,
  });

  const robot = renderer.createNode({
    x: -140,
    y: 850,
    w: 140,
    h: 140,
    zIndex: 5,
    color: 0x00000000,
    parent: testRoot,
  });

  const shadow = renderer.createNode({
    x: -40,
    y: 180,
    w: 228,
    h: 65,
    zIndex: 5,
    src: shadowImg,
    parent: robot,
  });

  const robotCore = renderer.createNode({
    x: 0,
    y: 0,
    w: 140,
    h: 140,
    zIndex: 5,
    src: robotImg,
    parent: robot,
  });

  setTimeout(async () => {
    while (true) {
      await robotCore
        .animate({ y: 10 }, { duration: 500 })
        .start()
        .waitUntilStopped();
      await robotCore
        .animate({ y: 0 }, { duration: 500 })
        .start()
        .waitUntilStopped();
    }
  }, 1000);

  const doorTopTop = renderer.createNode({
    x: 375,
    y: 207,
    w: 211,
    h: 129,
    zIndex: 4,
    src: doorTopTopImg,
    parent: testRoot,
  });

  const doorBottomTop = renderer.createNode({
    x: 375,
    y: 207 + 129,
    w: 211,
    h: 129,
    zIndex: 4,
    src: doorBottomTopImg,
    parent: testRoot,
  });

  setTimeout(async () => {
    await openGroundDoors(1000);
    await robot
      .animate({ x: 410 }, { duration: 1000 })
      .start()
      .waitUntilStopped();
    shadow.animate({ alpha: 0 }, { duration: 500 }).start();
    robot.zIndex = 1;
    robotCore.zIndex = 1;
    shadow.zIndex = 1;
    await closeGroundDoors(1000);
    await robot
      .animate({ y: 200 }, { duration: 1000 })
      .start()
      .waitUntilStopped();
    shadow.y = 100;
    await openTopDoors(1000);
    robot.zIndex = 5;
    robotCore.zIndex = 5;
    shadow.zIndex = 5;
    shadow.animate({ alpha: 1 }, { duration: 500 }).start();
    await shadow.animate({}, { duration: 2000 }).start().waitUntilStopped();
    await robot
      .animate({ x: renderer.settings.appWidth }, { duration: 5000 })
      .start()
      .waitUntilStopped();
    await closeTopDoors(1000);
  }, 1000);

  function openTopDoors(duration: number) {
    const a1 = doorTopTop.animate({ y: 207 - 129 }, { duration }).start();
    const a2 = doorBottomTop
      .animate({ y: 207 + 129 + 20 }, { duration })
      .start();
    const a3 = elevatorBg.animate({ y: 228 - 20 }, { duration }).start();
    return Promise.all([
      a1.waitUntilStopped(),
      a2.waitUntilStopped(),
      a3.waitUntilStopped(),
    ]);
  }

  function closeTopDoors(duration: number) {
    const a1 = doorTopTop.animate({ y: 207 }, { duration }).start();
    const a2 = doorBottomTop.animate({ y: 207 + 129 }, { duration }).start();
    const a3 = elevatorBg.animate({ y: 228 }, { duration }).start();
    return Promise.all([
      a1.waitUntilStopped(),
      a2.waitUntilStopped(),
      a3.waitUntilStopped(),
    ]);
  }

  function openGroundDoors(duration: number) {
    const a1 = doorLeftGround
      .animate({ x: 480 - 68 - 68 }, { duration })
      .start();
    const a2 = doorRightGround.animate({ x: 480 + 68 }, { duration }).start();
    return Promise.all([a1.waitUntilStopped(), a2.waitUntilStopped()]);
  }

  function closeGroundDoors(duration: number) {
    const a1 = doorLeftGround.animate({ x: 480 - 68 }, { duration }).start();
    const a2 = doorRightGround.animate({ x: 480 }, { duration }).start();
    return Promise.all([a1.waitUntilStopped(), a2.waitUntilStopped()]);
  }
}
