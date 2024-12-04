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
 * Properties of the {@link NoiseTexture}
 */
export interface NoiseTextureProps {
  /**
   * Width of texture
   *
   * @default 128
   */
  width?: number;
  /**
   * Height of texture
   *
   * @default 128
   */
  height?: number;
  /**
   * A number value that can be varied to force new textures to be generated
   *
   * @default 0
   */
  cacheId?: number;
}

/**
 * Texture consisting of a random grid of greyscale pixels
 *
 * @remarks
 * The width and height of the NoiseTexture are defined by it's
 * {@link NoiseTextureProps.width} and {@link NoiseTextureProps.height}
 * properties. The {@link NoiseTextureProps.cacheId} prop can be varied in order
 * to bypass cache and get newly randomized texture data.
 */
export class NoiseTexture extends Texture {
  props: Required<NoiseTextureProps>;

  public override type: TextureType = TextureType.noise;

  constructor(txManager: CoreTextureManager, props: NoiseTextureProps) {
    super(txManager);
    this.props = NoiseTexture.resolveDefaults(props);
  }

  override async getTextureSource(): Promise<TextureData> {
    const { width, height } = this.props;
    const size = width * height * 4;
    const pixelData8 = new Uint8ClampedArray(size);
    for (let i = 0; i < size; i += 4) {
      const v = Math.floor(Math.random() * 256);
      pixelData8[i] = v;
      pixelData8[i + 1] = v;
      pixelData8[i + 2] = v;
      pixelData8[i + 3] = 255;
    }

    return {
      data: new ImageData(pixelData8, width, height),
    };
  }

  static override makeCacheKey(props: NoiseTextureProps): string | false {
    if (props.cacheId === undefined) {
      return false;
    }
    const resolvedProps = NoiseTexture.resolveDefaults(props);
    return `NoiseTexture,${resolvedProps.width},${resolvedProps.height},${resolvedProps.cacheId}`;
  }

  static override resolveDefaults(
    props: NoiseTextureProps,
  ): Required<NoiseTextureProps> {
    return {
      width: props.width ?? 128,
      height: props.height ?? 128,
      cacheId: props.cacheId ?? 0,
    };
  }

  static z$__type__Props: NoiseTextureProps;
}
