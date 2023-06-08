import type { CoreTextureManager } from '../CoreTextureManager.js';
import { Texture, type TextureData } from './Texture.js';

export interface NoiseTextureProps {
  /**
   * Width of texture
   *
   * @default 128
   */
  w?: number;
  /**
   * Height of texture
   *
   * @default 128
   */
  h?: number;
  /**
   * A number value that can be varied to force new textures to be generated
   *
   * @default 0
   */
  cacheId?: number;
}

export class NoiseTexture extends Texture {
  props: Required<NoiseTextureProps>;

  constructor(txManager: CoreTextureManager, props: NoiseTextureProps) {
    super(txManager);
    this.props = NoiseTexture.resolveDefaults(props);
  }

  override async getTextureData(): Promise<TextureData> {
    const { w, h } = this.props;
    const size = w * h * 4;
    const pixelData8 = new Uint8ClampedArray(size);
    for (let i = 0; i < size; i += 4) {
      const v = Math.floor(Math.random() * 256);
      pixelData8[i] = v;
      pixelData8[i + 1] = v;
      pixelData8[i + 2] = v;
      pixelData8[i + 3] = 255;
    }
    return await createImageBitmap(new ImageData(pixelData8, w, h), {
      premultiplyAlpha: 'none',
    });
  }

  static override makeCacheKey(props: NoiseTextureProps): string {
    const resolvedProps = NoiseTexture.resolveDefaults(props);
    return `NoiseTexture,${resolvedProps.w},${resolvedProps.h},${resolvedProps.cacheId}`;
  }

  static override resolveDefaults(
    props: NoiseTextureProps,
  ): Required<NoiseTextureProps> {
    return {
      w: props.w ?? 128,
      h: props.h ?? 128,
      cacheId: props.cacheId ?? 0,
    };
  }

  static z$__type__Props: NoiseTextureProps;
}
