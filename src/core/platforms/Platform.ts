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
import type { WebGlContextWrapper } from './web/WebGlContextWrapper.js';
import type { ImageResponse } from '../textures/ImageTexture.js';

/**
 * Settings for the Platform
 */
export interface PlatformSettings {
  /**
   * Number of image workers to spawn for parallel image processing
   * @default 2
   */
  numImageWorkers?: number;

  /**
   * Whether to force the use of WebGL2 (if supported by the platform) or WebGL1. By default, the platform will use WebGL2 if it is available, and fall back to WebGL1 if it is not.
   * @default false
   */
  forceWebGL2?: boolean;
}

export abstract class Platform {
  public readonly settings: Required<PlatformSettings>;

  public glw: WebGlContextWrapper | null = null;
  public canvas: HTMLCanvasElement | null = null;

  constructor(settings: PlatformSettings = {}) {
    // Apply default settings
    this.settings = {
      numImageWorkers: settings.numImageWorkers ?? 2,
      forceWebGL2: settings.forceWebGL2 ?? false,
    };
  }

  /**
   * Creates a new canvas element.
   * @returns The created HTMLCanvasElement.
   */
  abstract createCanvas(): HTMLCanvasElement;

  /**
   * Create new rendering context (only for WebGL, Canvas does not require a context)
   */
  abstract createContext(): void;

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
   * Fetches a resource from the network.
   * @param url - The URL of the resource to fetch.
   * @returns A promise that resolves with the response.
   */
  abstract fetch(url: string): Promise<unknown>;

  /**
   * Loads an image from a UR and returns it as an ImageBitmap or HTMLImageElement.
   * @param src - The source URL or Blob of the image to load.
   * @param premultiplyAlpha - Whether to premultiply alpha (if supported by the platform).
   * @param sx - The x coordinate of the top left corner of the sub-rectangle of the source image to draw into the destination context.
   * @param sy - The y coordinate of the top left corner of the sub-rectangle of the source image to draw into the destination context.
   * @param sw - The width of the sub-rectangle of the source image to draw into the destination context.
   * @param sh - The height of the sub-rectangle of the source image to draw into the destination context.
   * @returns A promise that resolves with an object containing the loaded image and whether alpha was premultiplied.
   */
  abstract loadImage(
    src: string,
    premultiplyAlpha: boolean | null,
    sx?: number | null,
    sy?: number | null,
    sw?: number | null,
    sh?: number | null,
  ): Promise<ImageResponse>;

  /**
   * Create an image out of a Blob
   *
   * @param blob - The Blob to create an image from
   * @param premultiplyAlpha - Whether to premultiply alpha (if supported by the platform).
   * @param sx - The x coordinate of the top left corner of the sub-rectangle of the source image to draw into the destination context.
   * @param sy - The y coordinate of the top left corner of the sub-rectangle of the source image to draw into the destination context.
   * @param sw - The width of the sub-rectangle of the source image to draw into the destination context.
   * @param sh - The height of the sub-rectangle of the source image to draw into the destination context.
   * @returns A promise that resolves with an object containing the loaded image and whether alpha was premultiplied.
   */
  abstract createImage(
    blob: Blob,
    premultiplyAlpha: boolean | null,
    sx?: number | null,
    sy?: number | null,
    sw?: number | null,
    sh?: number | null,
  ): Promise<ImageResponse>;

  /**
   * Loads an SVG image from a URL and returns it as an ImageBitmap or HTMLImageElement.
   * @param src - The source URL of the SVG image to load.
   * @param width - The width to render the SVG image.
   * @param height - The height to render the SVG image.
   * @param sx - The x coordinate of the top left corner of the sub-rectangle of the source image to draw into the destination context.
   * @param sy - The y coordinate of the top left corner of the sub-rectangle of the source image to draw into the destination context.
   * @param sw - The width of the sub-rectangle of the source image to draw into the destination context.
   * @param sh - The height of the sub-rectangle of the source image to draw into the destination context.
   */
  abstract loadSvg(
    src: string,
    width: number | null,
    height: number | null,
    sx?: number | null,
    sy?: number | null,
    sw?: number | null,
    sh?: number | null,
  ): Promise<ImageResponse>;

  /**
   * Loads a compressed texture from a URL and returns it as an ImageBitmap or HTMLImageElement.
   * @param src - The source URL of the compressed texture to load.
   * @returns A promise that resolves with an object containing the loaded image and whether alpha was premultiplied.
   */
  abstract loadCompressedTexture(src: string): Promise<ImageResponse>;

  /**
   * Retrieves the current timestamp.
   * @returns The current timestamp.
   */
  abstract getTimeStamp(): number;

  /**
   * Adds a FontFace to the platforms FontFaceSet
   * @param font - The FontFace to add
   */
  abstract addFont(font: FontFace): void;
}
