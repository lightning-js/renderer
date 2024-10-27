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

import { CoreGlContext } from './CoreGlContext.js';
import { Stage } from '../Stage.js';
import type { ContextSpy } from '../lib/ContextSpy.js';

export abstract class CorePlatform {
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
   * Creates a WebGL context from a given canvas element.
   *
   * @param {HTMLCanvasElement} canvas - The canvas element to create the WebGL context from.
   * @param {boolean} [forceWebGL2=false] - Whether to force the use of WebGL2 if available.
   * @param {boolean} [contextSpy=false] - Whether to enable context spying for debugging purposes.
   * @returns {WebGLRenderingContext | WebGL2RenderingContext} The created WebGL context.
   */
  abstract createWebGLContext(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    forceWebGL2: boolean,
    contextSpy: ContextSpy | null,
  ): CoreGlContext;

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
