import {
  Texture,
  type TextureData,
  CoreTextureManager,
} from '@lightningjs/renderer';
import { assertTruthy } from '@lightningjs/renderer/utils';
/**
 * Augment the EffectMap interface to include the CustomEffect
 */
declare module '@lightningjs/renderer' {
  interface TextureMap {
    MyCustomTexture: typeof MyCustomTexture;
  }
}

export interface MyCustomTextureProps {
  percent?: number;
  w: number;
  h: number;
}

export class MyCustomTexture extends Texture {
  static z$__type__Props: MyCustomTextureProps;

  private props: Required<MyCustomTextureProps>;

  constructor(txManager: CoreTextureManager, props: MyCustomTextureProps) {
    super(txManager);
    this.props = MyCustomTexture.resolveDefaults(props);
  }

  override async getTextureSource(): Promise<TextureData> {
    const { percent, width, height } = this.props;
    const radius = Math.min(width, height) / 2;
    const angle = 2 * Math.PI * (percent / 100);
    const canvas = document.createElement('canvas');
    canvas.w = width;
    canvas.h = height;
    const ctx = canvas.getContext('2d');
    assertTruthy(ctx);
    ctx.beginPath();
    ctx.arc(radius, radius, radius, 0, 2 * Math.PI);
    ctx.fillStyle = 'orange';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(radius, radius);
    ctx.arc(radius, radius, radius, -angle / 2, angle / 2);
    ctx.closePath();
    ctx.fillStyle = 'blue';
    ctx.fill();

    this.setState('fetched', {
      width,
      height,
    });

    return {
      data: ctx.getImageData(0, 0, canvas.w, canvas.h),
    };
  }

  static override makeCacheKey(props: MyCustomTextureProps): string | false {
    // // Cache by props (only do this if could be helpful, otherwise leave it uncached)
    // const rprops = MyCustomTexture.resolveDefaults(props)
    // return `MyCustomTexture,${rprops.percent},${rprops.w},${rprops.h},`;
    return false; // <-- Don't cache at all
  }

  static override resolveDefaults(
    props: MyCustomTextureProps,
  ): Required<MyCustomTextureProps> {
    return {
      percent: props.percent ?? 20,
      w: props.w,
      h: props.h,
    };
  }
}
