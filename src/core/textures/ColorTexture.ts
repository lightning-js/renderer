import type { CoreTextureManager } from '../CoreTextureManager.js';
import { Texture } from './Texture.js';

export interface ColorTextureProps {
  color?: number;
}

export class ColorTexture extends Texture {
  props: Required<ColorTextureProps>;

  constructor(txManager: CoreTextureManager, props?: ColorTextureProps) {
    super(txManager);
    this.props = ColorTexture.resolveDefaults(props || {});
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

  static override makeCacheKey(props: ColorTextureProps): string {
    const resolvedProps = ColorTexture.resolveDefaults(props);
    return `ColorTexture,${resolvedProps.color}`;
  }

  static override resolveDefaults(
    props: ColorTextureProps,
  ): Required<ColorTextureProps> {
    return {
      color: props.color || 0xffffffff,
    };
  }

  static z$__type__Props: ColorTextureProps;
}
