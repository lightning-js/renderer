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
  interface TextureTypeMap {
    MyCustomTexture: typeof MyCustomTexture;
  }
}

export interface MyCustomTextureProps {
  percent?: number;
  width: number;
  height: number;
}

export class MyCustomTexture extends Texture {
  static z$__type__Props: MyCustomTextureProps;

  private props: Required<MyCustomTextureProps>;

  constructor(txManager: CoreTextureManager, props: MyCustomTextureProps) {
    super(txManager);
    this.props = {
      percent: props.percent ?? 25,
      width: props.width,
      height: props.height,
    };
  }

  override async getTextureData(): Promise<TextureData> {
    const { percent, width, height } = this.props;
    const radius = Math.min(width, height) / 2;
    const angle = 2 * Math.PI * (percent / 100);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
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
    return {
      data: ctx.getImageData(0, 0, canvas.width, canvas.height),
    };
  }
}
