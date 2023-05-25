import { CoreTexture } from '../CoreTexture.js';

export class WebGlCoreTexture extends CoreTexture {
  constructor(
    protected gl: WebGLRenderingContext,
    public readonly texture: WebGLTexture,
    cacheKey: string | null,
  ) {
    super();
    this.cacheKey = cacheKey;
  }
}
