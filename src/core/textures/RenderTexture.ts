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
  w?: number;

  /**
   * WebGL Texture height
   * @default 256
   */
  h?: number;
}

export class RenderTexture extends Texture {
  props: Required<RenderTextureProps>;

  public override type: TextureType = TextureType.renderToTexture;

  constructor(
    txManager: CoreTextureManager,
    props: Required<RenderTextureProps>,
  ) {
    super(txManager);
    this.props = props;
  }

  get w() {
    return this.props.w;
  }

  set w(value: number) {
    this.props.w = value;
  }

  get h() {
    return this.props.h;
  }

  set h(value: number) {
    this.props.h = value;
  }

  override async getTextureSource(): Promise<TextureData> {
    // Render texture data ready - dimensions will be set during upload
    return {
      data: null,
      premultiplyAlpha: null,
    };
  }

  static override resolveDefaults(
    props: RenderTextureProps,
  ): Required<RenderTextureProps> {
    return {
      w: props.w || 256,
      h: props.h || 256,
    };
  }

  static z$__type__Props: RenderTextureProps;
}
