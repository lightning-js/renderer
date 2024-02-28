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

import { CoreRenderOp } from '../CoreRenderOp.js';
import { WebGlCoreShader } from './WebGlCoreShader.js';
import type { WebGlCoreCtxTexture } from './WebGlCoreCtxTexture.js';
import type { WebGlCoreRendererOptions } from './WebGlCoreRenderer.js';
import type { BufferCollection } from './internal/BufferCollection.js';
import type { Dimensions } from '../../../common/CommonTypes.js';
import type { Rect, RectWithValid } from '../../lib/utils.js';
import type { WebGlContextWrapper } from '../../lib/WebGlContextWrapper.js';

const MAX_TEXTURES = 8; // TODO: get from gl

/**
 * Can render multiple quads with multiple textures (up to vertex shader texture limit)
 *
 */
export class WebGlCoreRenderOp extends CoreRenderOp {
  length = 0;
  numQuads = 0;
  textures: WebGlCoreCtxTexture[] = [];
  readonly maxTextures: number;

  constructor(
    readonly glw: WebGlContextWrapper,
    readonly options: WebGlCoreRendererOptions,
    readonly buffers: BufferCollection,
    readonly shader: WebGlCoreShader,
    readonly shaderProps: Record<string, unknown>,
    readonly alpha: number,
    readonly clippingRect: RectWithValid,
    readonly dimensions: Dimensions,
    readonly bufferIdx: number,
    readonly zIndex: number,
    readonly renderToTexture: boolean | undefined,
    readonly parentHasRenderTexture: boolean | undefined,
  ) {
    super();
    this.maxTextures = shader.supportsIndexedTextures
      ? (glw.getParameter(glw.MAX_VERTEX_TEXTURE_IMAGE_UNITS) as number)
      : 1;
  }

  addTexture(texture: WebGlCoreCtxTexture): number {
    const { textures, maxTextures } = this;
    const existingIdx = textures.findIndex((t) => t === texture);
    if (existingIdx !== -1) {
      return existingIdx;
    }
    const newIdx = textures.length;
    if (newIdx >= maxTextures) {
      return 0xffffffff;
    }
    this.textures.push(texture);
    return newIdx;
  }

  draw() {
    const { glw, shader, shaderProps, options } = this;
    const { shManager } = options;

    shManager.useShader(shader);
    shader.bindRenderOp(this, shaderProps);

    // TODO: Reduce calculations required
    const quadIdx = (this.bufferIdx / 24) * 6 * 2;

    // Clipping
    if (this.clippingRect.valid) {
      const { x, y, width, height } = this.clippingRect;
      const pixelRatio = options.pixelRatio;
      const canvasHeight = options.canvas.height;

      const clipX = Math.round(x * pixelRatio);
      const clipWidth = Math.round(width * pixelRatio);
      const clipHeight = Math.round(height * pixelRatio);
      const clipY = Math.round(canvasHeight - clipHeight - y * pixelRatio);
      glw.setScissorTest(true);
      glw.scissor(clipX, clipY, clipWidth, clipHeight);
    } else {
      glw.setScissorTest(false);
    }

    glw.drawElements(
      glw.TRIANGLES,
      6 * this.numQuads,
      glw.UNSIGNED_SHORT,
      quadIdx,
    );
  }
}
