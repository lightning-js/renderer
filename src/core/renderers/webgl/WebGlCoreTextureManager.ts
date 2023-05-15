import { loadImage } from '../../../utils.js';
import { WebGlCoreTexture } from './WebGlCoreTexture.js';
import { CoreTextureManager } from '../CoreTextureManager.js';
import {
  createImageTexture,
  createWhitePixelTexture,
} from './internal/TextureUtils.js';

export class WebGlCoreTextureManager extends CoreTextureManager {
  /**
   * Amount of used memory defined in pixels
   */
  usedMemory = 0;

  /**
   * All uploaded textures
   */
  textureSources = [];

  /**
   * Lookup id to tx source
   */
  textureSourceHashMap: Map<string, WebGlCoreTexture | null> = new Map();

  constructor(protected gl: WebGLRenderingContext | WebGL2RenderingContext) {
    super();
  }

  getWhitePixelTexture() {
    const cacheKey = '#white-pixel';
    if (this.textureSourceHashMap.has(cacheKey)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return this.textureSourceHashMap.get(cacheKey)!;
    }
    const texture = createWhitePixelTexture(this.gl);
    if (!texture) {
      throw new Error('Failed to create texture');
    }
    return this.onTextureLoaded(
      new WebGlCoreTexture(this.gl, texture, cacheKey),
      cacheKey,
    );
  }

  async getImageTexture(imageUrl: string) {
    const { gl, textureSourceHashMap } = this;

    if (!this.hasTexture(imageUrl)) {
      // store empty placeholder while loading
      this.setTexture(imageUrl, null);
      // let platform upload image
      const image = await loadImage(imageUrl);
      if (!image) {
        throw new Error('Failed to load image');
      }
      const texture = createImageTexture(gl, image, {
        w: image.width,
        h: image.height,
      });
      if (!texture) {
        throw new Error('Failed to create texture');
      }
      return this.onTextureLoaded(
        new WebGlCoreTexture(this.gl, texture, imageUrl),
        imageUrl,
      );
    } else {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return textureSourceHashMap.get(imageUrl)!;
    }
  }

  /**
   * Return cached texture or create new
   * @param options
   */
  hasTexture(cacheKey: string): boolean {
    return this.textureSourceHashMap.has(cacheKey);
  }

  setTexture(cacheKey: string, texture: WebGlCoreTexture | null) {
    this.textureSourceHashMap.set(cacheKey, texture);
  }

  removeTexture(cacheKey: string) {
    if (this.hasTexture(cacheKey)) {
      this.textureSourceHashMap.delete(cacheKey);
    }
  }

  private onTextureLoaded(
    texture: WebGlCoreTexture,
    cacheKey: string,
  ): WebGlCoreTexture {
    if (texture) {
      this.setTexture(cacheKey, texture);
    } else {
      // remove placeholder
      this.removeTexture(cacheKey);
    }
    return texture;
  }
}
