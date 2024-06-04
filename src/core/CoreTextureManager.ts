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
import type { CoreContextTexture } from './renderers/CoreContextTexture.js';
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
export interface TextureTypeMap {
  ColorTexture: typeof ColorTexture;
  ImageTexture: typeof ImageTexture;
  NoiseTexture: typeof NoiseTexture;
  SubTexture: typeof SubTexture;
  RenderTexture: typeof RenderTexture;
}

/**
 * Map of texture instance types
 */
export type TextureMap = {
  [K in keyof TextureTypeMap]: InstanceType<TextureTypeMap[K]>;
};

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
}

/**
 * {@link CoreTextureManager.refCountMap}
 */
interface RefCountObj {
  cacheKey: string | false;
  count: number;
}

export class CoreTextureManager {
  /**
   * Amount of used memory defined in pixels
   */
  usedMemory = 0;

  /**
   * Cache of textures by their Cache Key
   */
  keyCache: Map<string, Texture> = new Map();
  /**
   * This map keeps track of the number of renderable owners that are using a
   * Texture that is in the {@link keyCache}. This is used to determine when a
   * Texture is no longer being used and can be removed from the cache.
   */
  refCountMap: WeakMap<Texture, RefCountObj> = new WeakMap();
  /**
   * The Textures in the set have a renderable owner count of 0. This means
   * their entries in the {@link keyCache} can be removed.
   */
  zeroRefSet: Set<Texture> = new Set();

  ctxTextureCache: WeakMap<Texture, CoreContextTexture> = new WeakMap();

  /**
   * Map of texture constructors by their type name
   */
  txConstructors: Partial<TextureTypeMap> = {};

  imageWorkerManager: ImageWorkerManager | null = null;
  hasCreateImageBitmap = !!self.createImageBitmap;
  hasWorker = !!self.Worker;
  /**
   * Renderer that this texture manager is associated with
   *
   * @remarks
   * This MUST be set before the texture manager is used. Otherwise errors
   * will occur when using the texture manager.
   */
  renderer!: CoreRenderer;

  constructor(numImageWorkers: number) {
    // Register default known texture types
    if (this.hasCreateImageBitmap && this.hasWorker && numImageWorkers > 0) {
      this.imageWorkerManager = new ImageWorkerManager(numImageWorkers);
    }

    if (!this.hasCreateImageBitmap) {
      console.warn(
        '[Lightning] createImageBitmap is not supported on this browser. ImageTexture will be slower.',
      );
    }

    this.registerTextureType('ImageTexture', ImageTexture);
    this.registerTextureType('ColorTexture', ColorTexture);
    this.registerTextureType('NoiseTexture', NoiseTexture);
    this.registerTextureType('SubTexture', SubTexture);
    this.registerTextureType('RenderTexture', RenderTexture);
  }

  registerTextureType<Type extends keyof TextureTypeMap>(
    textureType: Type,
    textureClass: TextureTypeMap[Type],
  ): void {
    this.txConstructors[textureType] = textureClass;
  }

  loadTexture<Type extends keyof TextureTypeMap>(
    textureType: Type,
    props: ExtractProps<TextureTypeMap[Type]>,
  ): InstanceType<TextureTypeMap[Type]> {
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
    return texture as InstanceType<TextureTypeMap[Type]>;
  }

  private initTextureToCache(
    texture: Texture,
    cacheKey: string | false,
  ): RefCountObj {
    const { keyCache, refCountMap, zeroRefSet } = this;
    if (cacheKey) {
      keyCache.set(cacheKey, texture);
    }
    const refCountObj = { cacheKey, count: 0 };
    refCountMap.set(texture, refCountObj);
    zeroRefSet.add(texture);
    return refCountObj;
  }

  /**
   * Increment the renderable owner count for a Texture in the {@link keyCache}.
   *
   * @remarks
   * If the Texture is not in the {@link keyCache}, this method does nothing.
   *
   * @param texture
   */
  incTextureRenderable(texture: Texture): void {
    const { refCountMap } = this;
    let refCountObj = refCountMap.get(texture);
    if (!refCountObj) {
      refCountObj = this.initTextureToCache(texture, false);
    }
    const oldCount = refCountObj.count;
    refCountObj.count = oldCount + 1;
    // If the texture was in the zero reference set, which was
    // is if the count was 0, remove it.
    if (oldCount === 0) {
      this.zeroRefSet.delete(texture);
    }
  }

  /**
   * Decrement the renderable owner count for a Texture in the {@link keyCache}.
   *
   * @remarks
   * If the Texture is not in the {@link keyCache}, this method does nothing.
   *
   * @param texture
   */
  decTextureRenderable(texture: Texture): void {
    const { refCountMap } = this;
    const refCountObj = refCountMap.get(texture);
    if (refCountObj) {
      const oldCount = refCountObj.count;
      refCountObj.count = oldCount - 1;
      // New count is now 0, add to the zero reference set.
      if (oldCount === 1) {
        this.zeroRefSet.add(texture);
      }
    }
  }

  /**
   * Flush out all textures that have a renderable owner count of 0
   *
   * @remarks
   * Each Texture flushed will be removed from the {@link keyCache} (if it's in
   * there) and also have its associated CoreContextTexture freed.
   */
  flushUnusedTextures(): void {
    const { keyCache, zeroRefSet, refCountMap } = this;
    for (const texture of zeroRefSet) {
      const refCountObj = refCountMap.get(texture);
      if (refCountObj && texture.state !== 'loading') {
        // We want to make sure we don't free any textures that are still loading
        // because text and end users might be depending on a `loaded` / `failed`
        // event to know when a texture is ready to use.
        const { cacheKey } = refCountObj;
        if (cacheKey) {
          keyCache.delete(cacheKey);
        }

        // Free the ctx texture if it exists.
        refCountMap.delete(texture);
        zeroRefSet.delete(texture);
        this.ctxTextureCache.get(texture)?.free();
      }
    }
  }

  /**
   * Get an object containing debug information about the texture manager.
   *
   * @returns
   */
  getDebugInfo(): TextureManagerDebugInfo {
    // const textureSet = new Set<Texture>();
    // for (const texture of this.textureIdCache.values()) {
    //   textureSet.add(texture);
    // }
    // for (const texture of this.textureKeyCache.values()) {
    //   textureSet.add(texture);
    // }
    // TODO: Output number of bytes used by textures
    return {
      keyCacheSize: this.keyCache.size,
    };
  }

  /**
   * Get a CoreContextTexture for the given Texture source.
   *
   * @remarks
   * If the texture source already has an allocated CoreContextTexture, it will be
   * returned from the cache. Otherwise, a new CoreContextTexture will be created
   * and cached.
   *
   * ContextTextures are stored in a WeakMap, so they will be garbage collected
   * when the Texture source is no longer referenced.
   *
   * @param textureSource
   * @returns
   */
  getCtxTexture(textureSource: Texture): CoreContextTexture {
    if (this.ctxTextureCache.has(textureSource)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return this.ctxTextureCache.get(textureSource)!;
    }
    const texture = this.renderer.createCtxTexture(textureSource);

    this.ctxTextureCache.set(textureSource, texture);
    return texture;
  }
}
