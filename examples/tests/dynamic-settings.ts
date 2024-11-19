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
  let currentColor = 0x00000000; // Transparent
  renderer.createNode({
    x: 100,
    y: 100,
    width: 250,
    height: 250,
    color: 0xffffffff,
    parent: testRoot,
  });

  window.addEventListener('keydown', (e) => {
    const colors: number[] = [
      0x00000000, // Transparent
      0xff0000ff, // Red
      0x00ff00ff, // Green
      0x0000ffff, // Blue
      0xffff00ff, // Yellow
      0xff00ffff, // Magenta
      0x00ffffff, // Cyan
      0x000000ff, // Black
      0xffffffff, // White
      0x808080ff, // Gray
      0x800000ff, // Maroon
    ];

    if (e.key === 'ArrowLeft') {
      const currentIndex = colors.indexOf(currentColor);
      const previousIndex = (currentIndex - 1 + colors.length) % colors.length;
      currentColor = colors[previousIndex] ?? 0xff0000ff;
      renderer.setClearColor(currentColor);
    } else if (e.key === 'ArrowRight') {
      const currentIndex = colors.indexOf(currentColor);
      const nextIndex = (currentIndex + 1) % colors.length;
      currentColor = colors[nextIndex] ?? 0xff0000ff;
      renderer.setClearColor(currentColor);
    }
  });
  console.log('ready!');
}
