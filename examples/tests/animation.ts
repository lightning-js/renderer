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

import type { IAnimationController } from '@lightningjs/renderer';

import type { ExampleSettings } from '../common/ExampleSettings.js';
interface AnimationExampleSettings {
  duration: number;
  easing: string;
  delay: number;
  loop: boolean;
  stopMethod: 'reverse' | 'reset' | false;
}

export default async function ({ renderer, testRoot }: ExampleSettings) {
  const node = renderer.createNode({
    x: 0,
    y: 0,
    w: 1920,
    h: 1080,
    color: 0x000000ff,
    parent: testRoot,
  });

  const animatableNode = renderer.createNode({
    x: 0,
    y: 300,
    w: 200,
    h: 200,
    color: 0xffffffff,
    parent: node,
  });

  const easingLabel = renderer.createTextNode({
    parent: node,
    x: 40,
    y: 40,
    fontFamily: 'Ubuntu',
    fontSize: 40,
    text: '',
  });

  const legend = renderer.createTextNode({
    parent: node,
    x: 40,
    y: 90,
    fontFamily: 'Ubuntu',
    fontSize: 20,
    text: 'press left or right arrow key to change easing',
  });

  /**
   * Loop animation demo
   */
  const easings = [
    'linear',
    'ease-in',
    'ease-out',
    'ease-in-out',
    'ease-in-sine',
    'ease-out-sine',
    'ease-in-out-sine',
    'ease-in-cubic',
    'ease-out-cubic',
    'ease-in-out-cubic',
    'ease-in-circ',
    'ease-out-circ',
    'ease-in-out-circ',
    'ease-in-back',
    'ease-out-back',
    'ease-in-out-back',
    'cubic-bezier(0,1.35,.99,-0.07)',
    'cubic-bezier(.41,.91,.99,-0.07)',
    'loopStopMethodReverse',
    'loopStopMethodReset',
    'loop',
  ];

  let animationIndex = 0;
  let currentAnimation: IAnimationController;

  const execEasing = (index = 0): void => {
    const easing = easings[index] ?? 'linear';
    easingLabel.text = `Easing demo: ${easing}`;
    const animationSettings: Partial<AnimationExampleSettings> = {
      duration: 2000,
      delay: 500,
      loop: false,
      stopMethod: false,
      easing: 'linear',
    };
    animationSettings.easing = easing;

    // restore x position before start of every animation
    animatableNode.x = 0;

    if (easing === 'loopStopMethodReverse') {
      animationSettings.easing = 'linear';
      animationSettings.loop = true;
      animationSettings.stopMethod = 'reverse';
    } else if (easing === 'loopStopMethodReset') {
      animationSettings.easing = 'linear';
      animationSettings.loop = true;
      animationSettings.stopMethod = 'reset';
    } else if (easing === 'loop') {
      animationSettings.easing = 'linear';
      animationSettings.loop = true;
    } else {
      animationSettings.loop = false;
      animationSettings.stopMethod = false;
    }

    if (currentAnimation) {
      currentAnimation.stop();
    }

    currentAnimation = animatableNode.animate(
      {
        x: renderer.settings.appWidth - animatableNode.w,
      },
      animationSettings, // Remove the unnecessary assertion
    );

    currentAnimation.start();
  };

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      animationIndex++;
    }
    if (e.key === 'ArrowLeft') {
      animationIndex--;
    }

    // wrap around
    animationIndex =
      ((animationIndex % easings.length) + easings.length) % easings.length;

    execEasing(animationIndex);
  });

  execEasing(animationIndex);
}
