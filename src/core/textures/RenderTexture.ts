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
 * Properties of the {@link RenderTexture}
 */
export interface RenderTextureProps {
  /**
   * WebGL Texture width
   * @default 256
   */
  width?: number;

  /**
   * WebGL Texture height
   * @default 256
   */
  height?: number;
}

export class RenderTexture extends Texture {
  props: Required<RenderTextureProps>;

  public override type: TextureType = TextureType.renderToTexture;

  constructor(txManager: CoreTextureManager, props?: RenderTextureProps) {
    super(txManager);
    this.props = RenderTexture.resolveDefaults(props || {});
  }

  get width() {
    return this.props.width;
  }

  set width(value: number) {
    this.props.width = value;
  }

  get height() {
    return this.props.height;
  }

  set height(value: number) {
    this.props.height = value;
  }

  override async getTextureSource(): Promise<TextureData> {
    return {
      data: null,
      premultiplyAlpha: null,
    };
  }

  static override resolveDefaults(
    props: RenderTextureProps,
  ): Required<RenderTextureProps> {
    return {
      width: props.width || 256,
      height: props.height || 256,
    };
  }

  static z$__type__Props: RenderTextureProps;
}
