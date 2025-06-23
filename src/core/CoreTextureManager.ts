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
import { TextureType, type Texture } from './textures/Texture.js';
import { EventEmitter } from '../common/EventEmitter.js';
import { getTimeStamp } from './platform.js';
import type { Stage } from './Stage.js';
import {
  validateCreateImageBitmap,
  type CreateImageBitmapSupport,
} from './lib/validateImageBitmap.js';

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

export interface TextureManagerSettings {
  numImageWorkers: number;
  createImageBitmapSupport: 'auto' | 'basic' | 'options' | 'full';
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
   * Prevent clean up of the texture when it is no longer being used.
   *
   * @remarks
   * This is useful when you want to keep the texture in memory for later use.
   * Regardless of whether the texture is being used or not, it will not be
   * cleaned up.
   *
   * @defaultValue `false`
   */
  preventCleanup?: boolean;

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

export class CoreTextureManager extends EventEmitter {
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

  private priorityQueue: Array<Texture> = [];
  private uploadTextureQueue: Array<Texture> = [];
  private initialized = false;
  private stage: Stage;
  private numImageWorkers: number;

  imageWorkerManager: ImageWorkerManager | null = null;
  hasCreateImageBitmap = !!self.createImageBitmap;
  imageBitmapSupported = {
    basic: false,
    options: false,
    full: false,
  };

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

  constructor(stage: Stage, settings: TextureManagerSettings) {
    super();

    const { numImageWorkers, createImageBitmapSupport } = settings;
    this.stage = stage;
    this.numImageWorkers = numImageWorkers;

    if (createImageBitmapSupport === 'auto') {
      validateCreateImageBitmap()
        .then((result) => {
          this.initialize(result);
        })
        .catch(() => {
          console.warn(
            '[Lightning] createImageBitmap is not supported on this browser. ImageTexture will be slower.',
          );

          // initialized without image worker manager and createImageBitmap
          this.initialized = true;
          this.emit('initialized');
        });
    } else {
      this.initialize({
        basic: createImageBitmapSupport === 'basic',
        options: createImageBitmapSupport === 'options',
        full: createImageBitmapSupport === 'full',
      });
    }

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

  private initialize(support: CreateImageBitmapSupport) {
    this.hasCreateImageBitmap =
      support.basic || support.options || support.full;
    this.imageBitmapSupported = support;

    if (!this.hasCreateImageBitmap) {
      console.warn(
        '[Lightning] createImageBitmap is not supported on this browser. ImageTexture will be slower.',
      );
    }

    if (
      this.hasCreateImageBitmap &&
      this.hasWorker &&
      this.numImageWorkers > 0
    ) {
      this.imageWorkerManager = new ImageWorkerManager(
        this.numImageWorkers,
        support,
      );
    } else {
      console.warn(
        '[Lightning] Imageworker is 0 or not supported on this browser. Image loading will be slower.',
      );
    }

    this.initialized = true;
    this.emit('initialized');
  }

  /**
   * Enqueue a texture for uploading to the GPU.
   *
   * @param texture - The texture to upload
   */
  enqueueUploadTexture(texture: Texture): void {
    if (this.uploadTextureQueue.includes(texture) === false) {
      this.uploadTextureQueue.push(texture);
    }
  }

  /**
   * Create a texture
   *
   * @param textureType - The type of texture to create
   * @param props - The properties to use for the texture
   */
  createTexture<Type extends keyof TextureMap>(
    textureType: Type,
    props: ExtractProps<TextureMap[Type]>,
  ): InstanceType<TextureMap[Type]> {
    let texture: Texture | undefined;
    const TextureClass = this.txConstructors[textureType];
    if (!TextureClass) {
      throw new Error(`Texture type "${textureType}" is not registered`);
    }

    const cacheKey = TextureClass.makeCacheKey(props as any);
    if (cacheKey && this.keyCache.has(cacheKey)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      texture = this.keyCache.get(cacheKey)!;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
      texture = new TextureClass(this, props as any);

      if (cacheKey) {
        this.initTextureToCache(texture, cacheKey);
      }
    }

    return texture as InstanceType<TextureMap[Type]>;
  }

  orphanTexture(texture: Texture): void {
    // if it is part of the download or upload queue, remove it
    this.removeTextureFromQueue(texture);

    if (texture.type === TextureType.subTexture) {
      // ignore subtextures
      return;
    }

    this.stage.txMemManager.addToOrphanedTextures(texture);
  }

  /**
   * Override loadTexture to use the batched approach.
   *
   * @param texture - The texture to load
   * @param immediate - Whether to prioritize the texture for immediate loading
   */
  loadTexture(texture: Texture, priority?: boolean): void {
    this.stage.txMemManager.removeFromOrphanedTextures(texture);

    if (texture.type === TextureType.subTexture) {
      // ignore subtextures - they get loaded through their parent
      return;
    }

    // if the texture is already loaded, don't load it again
    if (
      texture.ctxTexture !== undefined &&
      texture.ctxTexture.state === 'loaded'
    ) {
      texture.setState('loaded');
      return;
    }

    // if the texture is already being processed, don't load it again
    if (this.uploadTextureQueue.includes(texture) === true) {
      return;
    }

    // if the texture is already loading, free it, this can happen if the texture is
    // orphaned and then reloaded
    if (
      texture.ctxTexture !== undefined &&
      texture.ctxTexture.state === 'loading'
    ) {
      texture.free();
    }

    // if we're not initialized, just queue the texture into the priority queue
    if (this.initialized === false) {
      this.priorityQueue.push(texture);
      return;
    }

    // If the texture failed to load, we need to re-download it.
    if (texture.state === 'failed') {
      texture.free();
      texture.freeTextureData();
    }

    texture.setState('loading');

    // Get the texture data
    texture
      .getTextureData()
      .then(() => {
        texture.setState('fetched');

        // For non-image textures, upload immediately
        if (texture.type !== TextureType.image) {
          this.uploadTexture(texture);
        } else {
          // For image textures, queue for throttled upload
          // If it's a priority texture, upload it immediately
          if (priority === true) {
            this.uploadTexture(texture);
          } else {
            this.enqueueUploadTexture(texture);
          }
        }
      })
      .catch((err) => {
        console.error(err);
        texture.setState('failed');
      });
  }

  /**
   * Upload a texture to the GPU
   *
   * @param texture Texture to upload
   */
  uploadTexture(texture: Texture): void {
    if (
      this.stage.txMemManager.doNotExceedCriticalThreshold === true &&
      this.stage.txMemManager.criticalCleanupRequested === true
    ) {
      // we're at a critical memory threshold, don't upload textures
      this.enqueueUploadTexture(texture);
      return;
    }

    const coreContext = texture.loadCtxTexture();
    if (coreContext !== null && coreContext.state === 'loaded') {
      texture.setState('loaded');
      return;
    }

    coreContext.load();
  }

  /**
   * Check if a texture is being processed
   */
  isProcessingTexture(texture: Texture): boolean {
    return this.uploadTextureQueue.includes(texture) === true;
  }

  /**
   * Process a limited number of uploads.
   *
   * @param maxProcessingTime - The maximum processing time in milliseconds
   */
  processSome(maxProcessingTime: number): void {
    if (this.initialized === false) {
      return;
    }

    const startTime = getTimeStamp();

    // Process priority queue
    while (
      this.priorityQueue.length > 0 &&
      getTimeStamp() - startTime < maxProcessingTime
    ) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const texture = this.priorityQueue.pop()!;
      texture.getTextureData().then(() => {
        this.uploadTexture(texture);
      });
    }

    // Process uploads
    while (
      this.uploadTextureQueue.length > 0 &&
      getTimeStamp() - startTime < maxProcessingTime
    ) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.uploadTexture(this.uploadTextureQueue.shift()!);
    }
  }

  public hasUpdates(): boolean {
    return this.uploadTextureQueue.length > 0;
  }

  /**
   * Initialize a texture to the cache
   *
   * @param texture Texture to cache
   * @param cacheKey Cache key for the texture
   */
  initTextureToCache(texture: Texture, cacheKey: string) {
    const { keyCache, inverseKeyCache } = this;
    keyCache.set(cacheKey, texture);
    inverseKeyCache.set(texture, cacheKey);
  }

  /**
   * Get a texture from the cache
   *
   * @param cacheKey
   */
  getTextureFromCache(cacheKey: string): Texture | undefined {
    return this.keyCache.get(cacheKey);
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

  /**
   * Remove texture from the upload queue
   *
   * @param texture - The texture to remove
   */
  removeTextureFromQueue(texture: Texture): void {
    const uploadIndex = this.uploadTextureQueue.indexOf(texture);
    if (uploadIndex !== -1) {
      this.uploadTextureQueue.splice(uploadIndex, 1);
    }
  }

  /**
   * Resolve a parent texture from the cache or fallback to the provided texture.
   *
   * @param texture - The provided texture to resolve.
   * @returns The cached or provided texture.
   */
  resolveParentTexture(texture: ImageTexture): Texture {
    if (!texture?.props) {
      return texture;
    }

    const cacheKey = ImageTexture.makeCacheKey(texture.props);
    const cachedTexture = cacheKey
      ? this.getTextureFromCache(cacheKey)
      : undefined;
    return cachedTexture ?? texture;
  }
}
