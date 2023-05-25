import { Texture, type TextureData } from './Texture.js';

export interface ImageTextureProps {
  src?: string;
}

export class ImageTexture extends Texture {
  props: Required<ImageTextureProps>;

  constructor(props: ImageTextureProps) {
    super();
    this.props = {
      src: props.src || '',
    };
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
}
