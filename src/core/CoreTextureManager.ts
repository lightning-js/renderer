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
}

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
    options?: TextureOptions,
  ): Texture {
    const TextureClass = this.txConstructors[textureType];
    if (!TextureClass) {
      throw new Error(`Texture type "${textureType}" is not registered`);
    }
    let texture: Texture;
    const cacheKey = TextureClass.makeCacheKey(props as any);
    if (cacheKey && this.textureCache.has(cacheKey)) {
      texture = this.textureCache.get(cacheKey)!;
    } else {
      texture = new TextureClass(props as any);
      if (cacheKey) {
        this.textureCache.set(cacheKey, texture);
      }
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
