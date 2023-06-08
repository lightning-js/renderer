import type { CoreContextTexture } from './renderers/CoreContextTexture.js';
import type { CoreRenderer } from './renderers/CoreRenderer.js';
import { ColorTexture } from './textures/ColorTexture.js';
import { ImageTexture } from './textures/ImageTexture.js';
import { NoiseTexture } from './textures/NoiseTexture.js';
import { SubTexture } from './textures/SubTexture.js';
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
}

export type ExtractProps<Type> = Type extends { z$__type__Props: infer Props }
  ? Props
  : never;

/**
 * Universal options for all texture types
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
   */
  cacheKey?: string | false;
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

  /**
   * Renderer that this texture manager is associated with
   *
   * @remarks
   * This MUST be set before the texture manager is used. Otherwise errors
   * will occur when using the texture manager.
   */
  renderer!: CoreRenderer;

  constructor() {
    // Register default known texture types
    this.registerTextureType('ImageTexture', ImageTexture);
    this.registerTextureType('ColorTexture', ColorTexture);
    this.registerTextureType('NoiseTexture', NoiseTexture);
    this.registerTextureType('SubTexture', SubTexture);
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
    options?: TextureOptions,
  ): Texture {
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
    const notFoundInIdCache = texture === undefined;
    // If the texture is not found in the ID cache, try to get it from the key cache
    if (!texture) {
      const cacheKey =
        options?.cacheKey ?? TextureClass.makeCacheKey(props as any);
      if (cacheKey && this.textureKeyCache.has(cacheKey)) {
        // console.log('Getting texture by cache key', cacheKey);
        texture = this.textureKeyCache.get(cacheKey)!;
      } else {
        texture = new TextureClass(this, props as any);
        if (cacheKey) {
          this.textureKeyCache.set(cacheKey, texture);
        }
      }
    }
    // If the texture was not found in the ID cache, add it to the ID cache
    if (notFoundInIdCache && options?.id !== undefined) {
      this.textureIdCache.set(options.id, texture);
    }
    if (options?.preload) {
      const ctxTx = this.getCtxTexture(texture);
      ctxTx.load();
    }
    return texture;
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
