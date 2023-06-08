import type { TextureDesc } from '../../main-api/RendererMain.js';
import type { CoreTextureManager } from '../CoreTextureManager.js';
import { Texture } from './Texture.js';

export interface SubTextureProps {
  /**
   * The texture that this sub-texture is a sub-region of.
   */
  texture: TextureDesc;

  /**
   * The x position of the sub-texture in the parent texture.
   *
   * @default 0
   */
  x?: number;

  /**
   * The y position of the sub-texture in the parent texture.
   *
   * @default 0
   **/
  y?: number;

  /**
   * The width of the sub-texture.
   *
   * @default 0
   */
  width?: number;

  /**
   * The height of the sub-texture.
   **/
  height?: number;
}

/**
 * A texture that is a sub-region of another texture.
 *
 * @remarks
 * The source texture can be a Sprite Sheet/Texture Atlas.
 *
 */
export class SubTexture extends Texture {
  props: Required<SubTextureProps>;
  parentTexture: Texture;

  constructor(txManager: CoreTextureManager, props: SubTextureProps) {
    super(txManager);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    this.parentTexture = this.txManager.loadTexture(
      props.texture.txType,
      props.texture.props as any,
    );
    this.props = SubTexture.resolveDefaults(props || {});
  }

  override async getTextureData(): Promise<SubTextureProps> {
    return this.props;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static override makeCacheKey(props: SubTextureProps): string | false {
    return false;
  }

  static override resolveDefaults(
    props: SubTextureProps,
  ): Required<SubTextureProps> {
    return {
      texture: props.texture,
      x: props.x || 0,
      y: props.y || 0,
      width: props.width || 0,
      height: props.height || 0,
    };
  }

  static z$__type__Props: SubTextureProps;
}
