/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2024 Comcast Cable Communications Management, LLC.
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
import robotImg from '../assets/robot/robot.png';

export async function automation(settings: ExampleSettings) {
  // Snapshot single page
  await test(settings);
}

/**
 * This test verifies that the animation events are firing as expected.
 *
 * This test runs three seperate animations of a robot.
 *
 * Animation 1:
 * - Starts at 0, 0
 * - Moves to 100, 100
 * - Duration: 500ms
 * - Delay: 500ms
 * - Tests that the 'animating' event is fired after the delay
 * - Tests that the waitUntilStopped() promise resolves when the animation finishes
 *
 * Animation 2:
 * - Starts at 100, 100
 * - Moves to 0, 0
 * - Duration: 500ms
 * - No Delay
 * - Tests that the 'animating' event is fired (even if no delay)
 * - Tests that the 'stopped' event is fired when the animation finishes
 *
 * Animation 3:
 * - Starts at 0, 0
 * - Moves to 100, 100
 * - Duration: 500ms
 * - No Delay
 * - Tests that the 'stopped' event is fired when stop() is called before the
 *   animation finishes
 * - Robot resets to 0, 0 when stop() is called
 *
 * @param param0
 */
export default async function test({
  renderer,
  testRoot,
  snapshot,
}: ExampleSettings) {
  testRoot.w = 250;
  testRoot.h = 250;
  testRoot.color = 0xffffffff;

  const FONT_FAMILY = 'SDF-Ubuntu';

  const robot = renderer.createNode({
    x: 0,
    y: 0,
    w: 140,
    h: 140,
    zIndex: 5,
    src: robotImg,
    parent: testRoot,
  });

  const status = renderer.createTextNode({
    mount: 1,
    x: testRoot.w,
    y: testRoot.h,
    fontSize: 40,
    fontFamily: FONT_FAMILY,
    parent: testRoot,
    color: 0x000000ff,
  });

  //////////////////////////
  // Animation 1
  //////////////////////////
  status.text = 'a1: init';
  await snapshot({ name: 'a1' });
  const animation1 = robot.animate(
    {
      x: 100,
      y: 100,
    },
    {
      delay: 500,
      duration: 500,
    },
  );
  animation1.once('animating', () => {
    robot.color = 0x00ff00ff; // green
    // Hide the robot until after the snapshot is taken
    // Hack for the VRT, since the position of the robot at this point will not
    // be consistent between runs of the VRT.
    robot.alpha = 0;
    status.text = 'a1: animating';
    snapshot({ name: 'a1' })
      .then(() => {
        robot.alpha = 1;
      })
      .catch(console.error);
  });
  // This will resolve right await because the animation starts out stopped.
  await animation1.waitUntilStopped();
  animation1.start();
  await animation1.waitUntilStopped();
  status.text = 'a1: stopped';
  robot.color = 0xff0000ff; // red
  await snapshot({ name: 'a1' });

  //////////////////////////
  // Animation 2
  //////////////////////////
  status.text = 'a2: init';
  robot.color = 0xffffffff; // white
  await snapshot({ name: 'a2' });
  const animation2 = robot.animate(
    {
      x: 0,
      y: 0,
    },
    {
      duration: 500,
    },
  );
  animation2.once('animating', () => {
    robot.color = 0x00ff00ff; // green
    // Hide the robot until after the snapshot is taken...
    // Hack for the VRT, since the position of the robot at this point will not
    // be consistent between runs of the VRT.
    robot.alpha = 0;
    status.text = 'a2: animating';
    snapshot({ name: 'a2' })
      .then(() => {
        robot.alpha = 1;
      })
      .catch(console.error);
  });

  const stoppedEventPromiseA2 = new Promise<void>((resolve) => {
    animation2.once('stopped', () => {
      status.text = 'a2: stopped';
      robot.color = 0xff0000ff; // red
      snapshot({ name: 'a2' })
        .then(() => {
          robot.alpha = 1;
          resolve();
        })
        .catch(console.error);
    });
  });
  animation2.start();
  await stoppedEventPromiseA2;

  //////////////////////////
  // Animation 3
  //////////////////////////
  status.text = 'a3: init';
  robot.color = 0xffffffff; // white
  await snapshot({ name: 'a3' });
  const animation3 = robot.animate(
    {
      x: 100,
      y: 100,
    },
    {
      duration: 500,
    },
  );

  const stoppedEventPromiseA3 = new Promise<void>((resolve) => {
    animation3.once('stopped', () => {
      status.text = 'a3: stopped';
      robot.color = 0xff0000ff; // red
      snapshot({ name: 'a3' })
        .then(() => {
          robot.alpha = 1;
          resolve();
        })
        .catch(console.error);
    });
  });
  animation3.start();
  await delay(100);
  // Force stop the animation
  animation3.stop();
  // Wait for the stopped event to be fired
  await stoppedEventPromiseA3;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
