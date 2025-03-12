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

import { type Stage } from '../Stage.js';

export abstract class Platform {
  /**
   * Creates a new canvas element.
   * @returns The created HTMLCanvasElement.
   */
  abstract createCanvas(): HTMLCanvasElement;

  /**
   * Get a DOM element by ID
   * @returns The DOM element (or null)
   */
  abstract getElementById(id: string): HTMLElement | null;

  /**
   * Starts the main rendering loop, calling the provided update function every frame.
   * @param Stage - The stage for rendering
   */
  abstract startLoop(stage: Stage): void;

  /**
   * Returns the platform createImageBitmap function
   * @returns {createImageBitmap}
   */
  abstract get createImageBitmap(): typeof createImageBitmap;

  /**
   * Retrieves the current timestamp.
   * @returns The current timestamp.
   */
  abstract getTimeStamp(): number;
}
