import type { CoreTextureManager } from '../CoreTextureManager.js';
import { Texture, type TextureData } from './Texture.js';

export interface ImageTextureProps {
  src?: string;
}

export class ImageTexture extends Texture {
  props: Required<ImageTextureProps>;

  constructor(txManager: CoreTextureManager, props: ImageTextureProps) {
    super(txManager);
    this.props = ImageTexture.resolveDefaults(props);
  }

  get src() {
    return this.props.src;
  }

  set src(src: string) {
    this.props.src = src;
  }

  override async getTextureData(): Promise<TextureData> {
    if (!this.src) {
      return null;
    }
    const response = await fetch(this.src);
    const blob = await response.blob();
    return await createImageBitmap(blob, {
      premultiplyAlpha: 'premultiply',
      colorSpaceConversion: 'none',
      // @ts-expect-error should be fixed in next ts release
      imageOrientation: 'none',
    });
  }

  static override makeCacheKey(props: ImageTextureProps): string {
    const resolvedProps = ImageTexture.resolveDefaults(props);
    return `ImageTexture,${resolvedProps.src}`;
  }

  static override resolveDefaults(
    props: ImageTextureProps,
  ): Required<ImageTextureProps> {
    return {
      src: props.src || '',
    };
  }

  static z$__type__Props: ImageTextureProps;
}
