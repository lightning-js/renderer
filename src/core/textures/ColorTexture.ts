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
import { Texture, TextureType, type TextureData } from './Texture.js';

/**
 * Properties of the {@link ColorTexture}
 */
export interface ColorTextureProps {
  /**
   * Color to use to generate the texture
   *
   * @default 0xffffffff (opaque white)
   */
  color?: number;
}

/**
 * Texture consisting of only a 1x1 color pixel
 *
 * @remarks
 * The pixel color is set with the {@link ColorTextureProps.color} prop.
 *
 * This is the default texture used for a Node if it's
 * {@link INodeProps.texture} prop is set to `null` (the default)
 *
 * Generally the 1x1 color pixel is stretched to whatever the set dimensions of
 * a Node are.
 */
export class ColorTexture extends Texture {
  public override type: TextureType = TextureType.color;

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

  override async getTextureSource(): Promise<TextureData> {
    const pixelData = new Uint8Array(4);

    if (this.color === 0xffffffff) {
      pixelData[0] = 255;
      pixelData[1] = 255;
      pixelData[2] = 255;
      pixelData[3] = 255;
    } else {
      pixelData[0] = (this.color >> 16) & 0xff; // Red
      pixelData[1] = (this.color >> 8) & 0xff; // Green
      pixelData[2] = this.color & 0xff; // Blue
      pixelData[3] = (this.color >>> 24) & 0xff; // Alpha
    }

    this.setSourceState('loaded', { width: 1, height: 1 });

    return {
      data: pixelData,
      premultiplyAlpha: true,
    };
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
