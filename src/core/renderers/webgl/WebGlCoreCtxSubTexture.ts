import { assertTruthy } from '../../../utils.js';
import type { SubTexture } from '../../textures/SubTexture.js';
import type { Dimensions } from '../../utils.js';
import { WebGlCoreCtxTexture } from './WebGlCoreCtxTexture.js';

export class WebGlCoreCtxSubTexture extends WebGlCoreCtxTexture {
  constructor(gl: WebGLRenderingContext, textureSource: SubTexture) {
    super(gl, textureSource);
  }

  override async onLoadRequest(): Promise<Dimensions> {
    const props = await (this.textureSource as SubTexture).getTextureData();
    return {
      width: props.width || 0,
      height: props.height || 0,
    };
  }
}
