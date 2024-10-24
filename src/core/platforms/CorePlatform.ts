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

export abstract class CorePlatform {
  /**
   * Gets the WebGL context wrapper that provides access to WebGL-specific functions
   * such as creating textures, binding buffers, etc.
   * @returns {WebGLFunctions} An instance of WebGLFunctions that wraps the WebGL context.
   */
  abstract get gl(): CoreGlContext;

  /**
   * Creates a new canvas element.
   * @returns The created HTMLCanvasElement.
   */
  abstract createCanvas(): HTMLCanvasElement;

  /**
   * Creates a WebGL context (either WebGL1 or WebGL2) for a given canvas.
   * @param canvas - The canvas element to create the context for.
   * @returns The created WebGLRenderingContext or WebGL2RenderingContext.
   */
  abstract createWebGLContext(
    canvas: HTMLCanvasElement,
  ): WebGLRenderingContext | WebGL2RenderingContext;

  /**
   * Creates a 2D canvas rendering context.
   * @param canvas - The canvas element.
   * @returns The 2D rendering context.
   */
  abstract createCanvasRenderingContext2D(
    canvas: HTMLCanvasElement,
  ): CanvasRenderingContext2D;

  /**
   * Sets the pixel ratio for the canvas.
   * @param pixelRatio - The pixel ratio to set.
   */
  abstract setCanvasPixelRatio(pixelRatio: number): void;

  /**
   * Sets the clear color for the canvas.
   * @param context - The 2D rendering context.
   * @param color - The color to set.
   */
  abstract setCanvasClearColor(
    context: CanvasRenderingContext2D,
    color: string,
  ): void;

  /**
   * Starts the main rendering loop, calling the provided update function every frame.
   * @param Stage - The stage for rendering
   */
  abstract startLoop(stage: Stage): void;

  /**
   * Creates an ImageBitmap from an image source with specified cropping coordinates.
   * @param image - The source image or blob to create an image bitmap from.
   * @param sx - The x-coordinate of the sub-rectangle of the image.
   * @param sy - The y-coordinate of the sub-rectangle of the image.
   * @param sw - The width of the sub-rectangle of the image.
   * @param sh - The height of the sub-rectangle of the image.
   * @param options - Image bitmap options like premultiplyAlpha, colorSpaceConversion, etc.
   * @returns A promise that resolves to an ImageBitmap.
   */
  abstract createImageBitmap(
    image: ImageBitmapSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    options?: ImageBitmapOptions,
  ): Promise<ImageBitmap>;

  /**
   * Creates an ImageBitmap from an image source without cropping.
   * @param image - The source image or blob to create an image bitmap from.
   * @param options - Image bitmap options like premultiplyAlpha, colorSpaceConversion, etc.
   * @returns A promise that resolves to an ImageBitmap.
   */
  abstract createImageBitmap(
    image: ImageBitmapSource,
    options?: ImageBitmapOptions,
  ): Promise<ImageBitmap>;

  /**
   * Retrieves the current timestamp.
   * @returns The current timestamp.
   */
  abstract getTimeStamp(): number;
}
