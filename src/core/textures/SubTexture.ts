/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2023 Comcast Cable Communications Management, LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { CoreTextureManager } from '../CoreTextureManager.js';
import {
  Texture,
  TextureType,
  type TextureData,
  type TextureFailedEventHandler,
  type TextureLoadedEventHandler,
} from './Texture.js';

/**
 * Properties of the {@link SubTexture}
 */
export interface SubTextureProps {
  /**
   * The texture that this sub-texture is a sub-region of.
   */
  texture: Texture;

  /**
   * The x pixel position of the top-left of the sub-texture within the parent
   * texture.
   *
   * @default 0
   */
  x?: number;

  /**
   * The y pixel position of the top-left sub-texture within the parent
   * texture.
   *
   * @default 0
   **/
  y?: number;

  /**
   * The width of the sub-texture in pixels.
   *
   * @default 0
   */
  width?: number;

  /**
   * The height of the sub-texture in pixels
   **/
  height?: number;
}

/**
 * A Texture that is a sub-region of another Texture.
 *
 * @remarks
 * The parent texture can be a Sprite Sheet/Texture Atlas and set using the
 * {@link SubTextureProps.texture} prop. The sub-region relative to the parent
 * texture is defined with the {@link SubTextureProps.x},
 * {@link SubTextureProps.y}, {@link SubTextureProps.width}, and
 * {@link SubTextureProps.height} pixel values.
 */
export class SubTexture extends Texture {
  props: Required<SubTextureProps>;
  parentTexture: Texture;

  public override type: TextureType = TextureType.subTexture;

  constructor(txManager: CoreTextureManager, props: SubTextureProps) {
    super(txManager);
    this.props = SubTexture.resolveDefaults(props || {});
    this.parentTexture = this.props.texture;

    // If parent texture is already loaded / failed, trigger loaded event manually
    // so that users get a consistent event experience.
    // We do this in a microtask to allow listeners to be attached in the same
    // synchronous task after calling loadTexture()
    queueMicrotask(() => {
      const parentTx = this.parentTexture;
      if (parentTx.state === 'loaded') {
        this.onParentTxLoaded(parentTx, parentTx.dimensions!);
      } else if (parentTx.state === 'failed') {
        this.onParentTxFailed(parentTx, parentTx.error!);
      }
      parentTx.on('loaded', this.onParentTxLoaded);
      parentTx.on('failed', this.onParentTxFailed);
    });
  }

  private onParentTxLoaded: TextureLoadedEventHandler = () => {
    // We ignore the parent's passed dimensions, and simply use the SubTexture's
    // configured dimensions (because that's all that matters here)
    this.setState('loaded', {
      width: this.props.width,
      height: this.props.height,
    });
  };

  private onParentTxFailed: TextureFailedEventHandler = (target, error) => {
    this.setState('failed', error);
  };

  override onChangeIsRenderable(isRenderable: boolean): void {
    // Propagate the renderable owner change to the parent texture
    this.parentTexture.setRenderableOwner(this, isRenderable);
  }

  override async getTextureData(): Promise<TextureData> {
    return {
      data: this.props,
    };
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
