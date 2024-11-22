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

import { ImageWorkerManager } from './lib/ImageWorker.js';
import type { CoreRenderer } from './renderers/CoreRenderer.js';
import { ColorTexture } from './textures/ColorTexture.js';
import { ImageTexture } from './textures/ImageTexture.js';
import { NoiseTexture } from './textures/NoiseTexture.js';
import { SubTexture } from './textures/SubTexture.js';
import { RenderTexture } from './textures/RenderTexture.js';
import type { Texture } from './textures/Texture.js';

/**
 * Augmentable map of texture class types
 *
 * @remarks
 * This interface can be augmented by other modules/apps to add additional
 * texture types. The ones included directly here are the ones that are
 * included in the core library.
 */
export interface TextureMap {
  ColorTexture: typeof ColorTexture;
  ImageTexture: typeof ImageTexture;
  NoiseTexture: typeof NoiseTexture;
  SubTexture: typeof SubTexture;
  RenderTexture: typeof RenderTexture;
}

export type ExtractProps<Type> = Type extends { z$__type__Props: infer Props }
  ? Props
  : never;

/**
 * Contains information about the texture manager's internal state
 * for debugging purposes.
 */
export interface TextureManagerDebugInfo {
  keyCacheSize: number;
}

export type ResizeModeOptions =
  | {
      /**
       * Specifies that the image should be resized to cover the specified dimensions.
       */
      type: 'cover';
      /**
       * The horizontal clipping position
       * To clip the left, set clipX to 0. To clip the right, set clipX to 1.
       * clipX 0.5 will clip a equal amount from left and right
       *
       * @defaultValue 0.5
       */
      clipX?: number;
      /**
       * The vertical clipping position
       * To clip the top, set clipY to 0. To clip the bottom, set clipY to 1.
       * clipY 0.5 will clip a equal amount from top and bottom
       *
       * @defaultValue 0.5
       */
      clipY?: number;
    }
  | {
      /**
       * Specifies that the image should be resized to fit within the specified dimensions.
       */
      type: 'contain';
    };

/**
 * Universal options for all texture types
 *
 * @remarks
 * Texture Options provide a way to specify options that are relevant to the
 * texture loading process (including caching) and specifically for how a
 * texture is rendered within a specific Node (or set of Nodes).
 *
 * They are not used in determining the cache key for a texture (except if
 * the `cacheKey` option is provided explicitly to oveerride the default
 * cache key for the texture instance) nor are they stored/referenced within
 * the texture instance itself. Instead, the options are stored/referenced
 * within individual Nodes. So a single texture instance can be used in
 * multiple Nodes each using a different set of options.
 */
export interface TextureOptions {
  /**
   * Preload the texture immediately even if it's not being rendered to the
   * screen.
   *
   * @remarks
   * This allows the texture to be used immediately without any delay when it
   * is first needed for rendering. Otherwise the loading process will start
   * when the texture is first rendered, which may cause a delay in that texture
   * being shown properly.
   *
   * @defaultValue `false`
   */
  preload?: boolean;

  /**
   * Flip the texture horizontally when rendering
   *
   * @defaultValue `false`
   */
  flipX?: boolean;

  /**
   * Flip the texture vertically when rendering
   *
   * @defaultValue `false`
   */
  flipY?: boolean;

  /**
   * You can use resizeMode to determine the clipping automatically from the width
   * and height of the source texture. This can be convenient if you are unsure about
   * the exact image sizes but want the image to cover a specific area.
   *
   * The resize modes cover and contain are supported
   */
  resizeMode?: ResizeModeOptions;
}

export class CoreTextureManager {
  /**
   * Map of textures by cache key
   */
  keyCache: Map<string, Texture> = new Map();

  /**
   * Map of cache keys by texture
   */
  inverseKeyCache: WeakMap<Texture, string> = new WeakMap();

  /**
   * Map of texture constructors by their type name
   */
  txConstructors: Partial<TextureMap> = {};

  imageWorkerManager: ImageWorkerManager | null = null;
  hasCreateImageBitmap = !!self.createImageBitmap;
  createImageBitmapNotSupportsOptions = false;
  hasWorker = !!self.Worker;
  /**
   * Renderer that this texture manager is associated with
   *
   * @remarks
   * This MUST be set before the texture manager is used. Otherwise errors
   * will occur when using the texture manager.
   */
  renderer!: CoreRenderer;

  /**
   * The current frame time in milliseconds
   *
   * @remarks
   * This is used to populate the `lastRenderableChangeTime` property of
   * {@link Texture} instances when their renderable state changes.
   *
   * Set by stage via `updateFrameTime` method.
   */
  frameTime = 0;

  constructor(numImageWorkers: number) {
    // Register default known texture types
    if (this.hasCreateImageBitmap && this.hasWorker && numImageWorkers > 0) {
      this.imageWorkerManager = new ImageWorkerManager(numImageWorkers);
    }

    this.checkCompatibilities();

    this.registerTextureType('ImageTexture', ImageTexture);
    this.registerTextureType('ColorTexture', ColorTexture);
    this.registerTextureType('NoiseTexture', NoiseTexture);
    this.registerTextureType('SubTexture', SubTexture);
    this.registerTextureType('RenderTexture', RenderTexture);
  }

  registerTextureType<Type extends keyof TextureMap>(
    textureType: Type,
    textureClass: TextureMap[Type],
  ): void {
    this.txConstructors[textureType] = textureClass;
  }

  loadTexture<Type extends keyof TextureMap>(
    textureType: Type,
    props: ExtractProps<TextureMap[Type]>,
  ): InstanceType<TextureMap[Type]> {
    let texture: Texture | undefined;
    const TextureClass = this.txConstructors[textureType];
    if (!TextureClass) {
      throw new Error(`Texture type "${textureType}" is not registered`);
    }

    if (!texture) {
      const cacheKey = TextureClass.makeCacheKey(props as any);
      if (cacheKey && this.keyCache.has(cacheKey)) {
        // console.log('Getting texture by cache key', cacheKey);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        texture = this.keyCache.get(cacheKey)!;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
        texture = new TextureClass(this, props as any);
        if (cacheKey) {
          this.initTextureToCache(texture, cacheKey);
        }
      }
    }
    return texture as InstanceType<TextureMap[Type]>;
  }

  private initTextureToCache(texture: Texture, cacheKey: string) {
    const { keyCache, inverseKeyCache } = this;
    keyCache.set(cacheKey, texture);
    inverseKeyCache.set(texture, cacheKey);
  }

  /**
   * Remove a texture from the cache
   *
   * @remarks
   * Called by Texture Cleanup when a texture is freed.
   *
   * @param texture
   */
  removeTextureFromCache(texture: Texture) {
    const { inverseKeyCache, keyCache } = this;
    const cacheKey = inverseKeyCache.get(texture);
    if (cacheKey) {
      keyCache.delete(cacheKey);
    }
  }

  checkCompatibilities() {
    // check compatibility with createImageBitmap
    if (!this.hasCreateImageBitmap) {
      console.warn(
        '[Lightning] createImageBitmap is not supported on this browser. ImageTexture will be slower.',
      );
    } else {
      self.createImageBitmap(new Blob(), {}).catch((e: unknown) => {
        if (
          e instanceof Error &&
          e.message ===
            "Failed to execute 'createImageBitmap' on 'Window': No function was found that matched the signature provided."
        ) {
          console.warn(
            '[Lightning] createImageBitmap not supports (image, options) signature on this browser.',
          );
          this.createImageBitmapNotSupportsOptions = true;
        }
      });
    }
  }
}
