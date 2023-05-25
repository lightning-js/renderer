import { loadImage } from '../../../utils.js';
import { WebGlCoreCtxTexture } from './WebGlCoreCtxTexture.js';
import { CoreTextureManager } from '../CoreTextureManager.js';
import type { Texture } from '../../textures/Texture.js';

export class WebGlCoreTextureManager extends CoreTextureManager {
  /**
   * Amount of used memory defined in pixels
   */
  usedMemory = 0;

  ctxTextureCache: WeakMap<Texture, WebGlCoreCtxTexture> = new WeakMap();

  constructor(protected gl: WebGLRenderingContext | WebGL2RenderingContext) {
    super();
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
  getCtxTexture(textureSource: Texture): WebGlCoreCtxTexture {
    if (this.ctxTextureCache.has(textureSource)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return this.ctxTextureCache.get(textureSource)!;
    }
    const texture = new WebGlCoreCtxTexture(this.gl, textureSource);
    this.ctxTextureCache.set(textureSource, texture);
    return texture;
  }
}
