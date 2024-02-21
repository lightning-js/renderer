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
import type { WebGlContextWrapper } from '../lib/WebGlContextWrapper.js';
import { Texture, type TextureData } from './Texture.js';

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
  framebuffer: WebGLFramebuffer | null = null;
  nativeTexture: WebGLTexture | null = null;

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

  get ctxTexture(): WebGLTexture {
    if (!this.nativeTexture) {
      throw new Error('RenderTexture not created yet');
    }
    return this.nativeTexture;
  }

  create(glw: WebGlContextWrapper) {
    // Create a render texture
    const texture = glw.createTexture();
    if (!texture) {
      throw new Error('Unable to create texture');
    }

    glw.bindTexture(texture);
    glw.texImage2D(
      0,
      glw.RGBA,
      this.width,
      this.height,
      0,
      glw.RGBA,
      glw.UNSIGNED_BYTE,
      null,
    );

    glw.texParameteri(glw.TEXTURE_MIN_FILTER, glw.LINEAR);
    glw.texParameteri(glw.TEXTURE_WRAP_S, glw.CLAMP_TO_EDGE);
    glw.texParameteri(glw.TEXTURE_WRAP_T, glw.CLAMP_TO_EDGE);
    // Create Framebuffer object
    this.framebuffer = glw.createFramebuffer();

    if (!this.framebuffer) {
      throw new Error('Unable to create framebuffer');
    }
    // Bind the framebuffer
    glw.bindFramebuffer(this.framebuffer);

    // Attach the texture to the framebuffer
    glw.framebufferTexture2D(glw.COLOR_ATTACHMENT0, texture, 0);

    // Unbind the framebuffer
    glw.bindFramebuffer(null);

    this.nativeTexture = texture;
  }

  override async getTextureData(): Promise<TextureData> {
    const pixelData32 = new Uint32Array([0xffffff00]);
    const pixelData8 = new Uint8ClampedArray(pixelData32.buffer);
    return {
      data: new ImageData(pixelData8, 1, 1),
      premultiplyAlpha: true,
    };
  }

  static override makeCacheKey(props: RenderTextureProps): string {
    const resolvedProps = RenderTexture.resolveDefaults(props);
    return `RenderTexture,${resolvedProps.width},${resolvedProps.height}`;
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
