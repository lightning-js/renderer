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

import { assertTruthy } from '../utils.js';
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
 * Augmentable map of texture types
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
  idCacheSize: number;
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
   * ID to use for this texture.
   *
   * @remarks
   * This is for internal use only as an optimization.
   *
   * @privateRemarks
   * This is used to avoid having to look up the texture in the texture cache
   * by its cache key. Theoretically this should be faster.
   *
   * @defaultValue Automatically generated
   */
  id?: number;

  /**
   * Cache key to use for this texture
   *
   * @remarks
   * If this is set, the texture will be cached using this key. If a texture
   * with the same key is already cached, it will be returned instead of
   * creating a new texture.
   *
   * If this is not set (undefined), it will be automatically generated via
   * the specified `Texture`'s `makeCacheKey()` method.
   *
   * @defaultValue Automatically generated via `Texture.makeCacheKey()`
   */
  cacheKey?: string | false;

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

export class CoreTextureManager {
  /**
   * Amount of used memory defined in pixels
   */
  usedMemory = 0;

  txConstructors: Partial<TextureMap> = {};

  textureKeyCache: Map<string, Texture> = new Map();
  textureIdCache: Map<number, Texture> = new Map();

  ctxTextureCache: WeakMap<Texture, CoreContextTexture> = new WeakMap();
  textureRefCountMap: WeakMap<
    Texture,
    { cacheKey: string | false; count: number }
  > = new WeakMap();
  imageWorkerManager: ImageWorkerManager;
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
    this.imageWorkerManager = new ImageWorkerManager(numImageWorkers);
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
    options: TextureOptions | null = null,
  ): InstanceType<TextureMap[Type]> {
    const TextureClass = this.txConstructors[textureType];
    if (!TextureClass) {
      throw new Error(`Texture type "${textureType}" is not registered`);
    }
    let texture: Texture | undefined;
    // If an ID is specified, try to get the texture from the ID cache first
    if (options?.id !== undefined && this.textureIdCache.has(options.id)) {
      // console.log('Getting texture by texture desc ID', options.id);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      texture = this.textureIdCache.get(options.id)!;
    }
    // If the texture is not found in the ID cache, try to get it from the key cache
    if (!texture) {
      const descId = options?.id;
      const cacheKey =
        options?.cacheKey ?? TextureClass.makeCacheKey(props as any);
      if (cacheKey && this.textureKeyCache.has(cacheKey)) {
        // console.log('Getting texture by cache key', cacheKey);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        texture = this.textureKeyCache.get(cacheKey)!;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
        texture = new TextureClass(this, props as any);
      }
      if (descId) {
        this.addTextureIdToCache(descId, cacheKey, texture);
      }
    }
    if (options?.preload) {
      const ctxTx = this.getCtxTexture(texture);
      ctxTx.load();
    }
    return texture as InstanceType<TextureMap[Type]>;
  }

  /**
   * Add a `Texture` to the texture cache by its texture desc ID and cache key
   *
   * @remarks
   * This is used internally by the `CoreTextureManager` to cache textures
   * when they are created.
   *
   * It handles updating the texture ID cache, texture key cache, and texture
   * reference count map.
   *
   * @param textureDescId
   * @param cacheKey
   * @param texture
   */
  private addTextureIdToCache(
    textureDescId: number,
    cacheKey: string | false,
    texture: Texture,
  ): void {
    const { textureIdCache, textureRefCountMap } = this;
    textureIdCache.set(textureDescId, texture);
    if (textureRefCountMap.has(texture)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      textureRefCountMap.get(texture)!.count++;
    } else {
      textureRefCountMap.set(texture, { cacheKey, count: 1 });
      if (cacheKey) {
        this.textureKeyCache.set(cacheKey, texture);
      }
    }
  }

  /**
   * Remove a `Texture` from the texture cache by its texture desc ID
   *
   * @remarks
   * This is called externally by when we know (at least reasonably well) that
   * the `TextureRef` in the Main API space has been is no longer used. This
   * allows us to remove the `Texture` from the Usage Cache so that it can be
   * garbage collected as well.
   *
   * @param textureDescId
   */
  removeTextureIdFromCache(textureDescId: number): void {
    const { textureIdCache, textureRefCountMap } = this;
    const texture = textureIdCache.get(textureDescId);
    if (!texture) {
      // Sometimes a texture is removed from the cache before it ever gets
      // added to the cache. This is fine and not an error.
      return;
    }
    textureIdCache.delete(textureDescId);
    if (textureRefCountMap.has(texture)) {
      const refCountObj = textureRefCountMap.get(texture);
      assertTruthy(refCountObj);
      refCountObj.count--;
      if (refCountObj.count === 0) {
        textureRefCountMap.delete(texture);
        // If the texture is not referenced anywhere else, remove it from the key cache
        // as well.
        // This should allow the `Texture` instance to be garbage collected.
        if (refCountObj.cacheKey) {
          this.textureKeyCache.delete(refCountObj.cacheKey);
        }
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
      keyCacheSize: this.textureKeyCache.size,
      idCacheSize: this.textureIdCache.size,
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
