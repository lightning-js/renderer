import { Texture } from './Texture.js';

export interface ColorTextureProps {
  color?: number;
}

export class ColorTexture extends Texture {
  props: Required<ColorTextureProps>;

  constructor(props?: ColorTextureProps) {
    super();
    this.props = {
      color: props?.color || 0xffffffff,
    };
  }

  get color() {
    return this.props.color;
  }

  set color(color: number) {
    this.props.color = color;
  }

  override async getTextureData(): Promise<ImageBitmap> {
    const pixelData32 = new Uint32Array([this.color]);
    const pixelData8 = new Uint8ClampedArray(pixelData32.buffer);
    return await createImageBitmap(new ImageData(pixelData8, 1, 1), {
      premultiplyAlpha: 'none',
    });
  }
}
