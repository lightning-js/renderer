import type { CoreContextTexture } from './renderers/CoreContextTexture.js';
import type { CoreRenderer } from './renderers/CoreRenderer.js';
import { ColorTexture } from './textures/ColorTexture.js';
import { ImageTexture } from './textures/ImageTexture.js';
import { NoiseTexture } from './textures/NoiseTexture.js';
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
}

export type ExtractProps<Type> = Type extends { z$__type__Props: infer Props }
  ? Props
  : never;

export class CoreTextureManager {
  /**
   * Amount of used memory defined in pixels
   */
  usedMemory = 0;

  txConstructors: Partial<TextureMap> = {};

  textureCache: Map<string, Texture> = new Map();

  ctxTextureCache: WeakMap<Texture, CoreContextTexture> = new WeakMap();

  constructor(private renderer: CoreRenderer) {
    // Register default known texture types
    this.registerTextureType('ImageTexture', ImageTexture);
    this.registerTextureType('ColorTexture', ColorTexture);
    this.registerTextureType('NoiseTexture', NoiseTexture);
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
  ): Texture {
    const TextureClass = this.txConstructors[textureType];
    if (!TextureClass) {
      throw new Error(`Texture type "${textureType}" is not registered`);
    }
    const cacheKey = TextureClass.makeCacheKey(props as any);
    if (cacheKey && this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }
    const texture = new TextureClass(props as any);
    if (cacheKey) {
      this.textureCache.set(cacheKey, texture);
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
