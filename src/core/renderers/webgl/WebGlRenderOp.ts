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
import type { WebGlCtxTexture } from './WebGlCtxTexture.js';
import type { WebGlRenderer } from './WebGlRenderer.js';
import type { BufferCollection } from './internal/BufferCollection.js';
import type { WebGlShaderNode } from './WebGlShaderNode.js';
import type { QuadOptions } from '../CoreRenderer.js';
import type { CoreTextNode } from '../../CoreTextNode.js';
import type { RectWithValid } from '../../lib/utils.js';
import type { Dimensions } from '../../../common/CommonTypes.js';

type ReqQuad =
  | 'alpha'
  | 'shader'
  | 'parentHasRenderTexture'
  | 'rtt'
  | 'clippingRect'
  | 'h'
  | 'w';
type RenderOpQuadOptions = Pick<QuadOptions, ReqQuad> &
  Partial<Omit<QuadOptions, ReqQuad>> & {
    sdfShaderProps?: Record<string, unknown>;
    sdfBuffers?: BufferCollection;
  };

/**
 * Can render multiple quads with multiple textures (up to vertex shader texture limit)
 *
 */
export class WebGlRenderOp extends CoreRenderOp {
  numQuads = 0;
  textures: WebGlCtxTexture[] = [];

  /**
   * need to improve this when TextRenderers are refactored
   */
  readonly sdfShaderProps: Record<string, unknown> | undefined;
  readonly sdfNode: CoreTextNode | undefined;
  readonly maxTextures: number;
  readonly buffers: BufferCollection;
  readonly shader: WebGlShaderNode;
  readonly w: number;
  readonly h: number;
  readonly clippingRect: RectWithValid;
  readonly rtt: boolean;
  readonly parentHasRenderTexture: boolean;
  readonly framebufferDimensions?: Dimensions | null;
  readonly alpha: number;
  readonly pixelRatio: number;

  constructor(
    readonly renderer: WebGlRenderer,
    quad: RenderOpQuadOptions,
    readonly bufferIdx: number,
  ) {
    super();
    this.buffers = quad.sdfBuffers || renderer.quadBufferCollection;
    this.shader = quad.shader as WebGlShaderNode;
    this.w = quad.w;
    this.h = quad.h;
    this.clippingRect = quad.clippingRect;
    this.parentHasRenderTexture = quad.parentHasRenderTexture;
    this.framebufferDimensions = quad.framebufferDimensions;
    this.rtt = quad.rtt;
    this.alpha = quad.alpha;
    this.pixelRatio =
      this.parentHasRenderTexture === true ? 1 : renderer.stage.pixelRatio;

    /**
     * related to line 51
     */
    this.sdfShaderProps = quad.sdfShaderProps;

    this.maxTextures = this.shader.program.supportsIndexedTextures
      ? (renderer.glw.getParameter(
          renderer.glw.MAX_VERTEX_TEXTURE_IMAGE_UNITS,
        ) as number)
      : 1;
  }

  addTexture(texture: WebGlCtxTexture): number {
    const { textures, maxTextures } = this;
    let existingIdx = -1;
    const texturesLength = textures.length;
    for (let i = 0; i < texturesLength; i++) {
      const t = textures[i];
      if (t === texture) {
        existingIdx = i;
        break;
      }
    }

    if (existingIdx !== -1) {
      return existingIdx;
    }

    if (texturesLength >= maxTextures) {
      return 0xffffffff;
    }
    this.textures.push(texture);
    return texturesLength;
  }

  draw() {
    const { glw, options, stage } = this.renderer;

    stage.shManager.useShader(this.shader.program);
    this.shader.program.bindRenderOp(this);

    // Clipping
    if (this.clippingRect.valid === true) {
      const clipX = Math.round(this.clippingRect.x * this.pixelRatio);
      const clipWidth = Math.round(this.clippingRect.w * this.pixelRatio);
      const clipHeight = Math.round(this.clippingRect.h * this.pixelRatio);
      let clipY = Math.round(
        options.canvas.height -
          clipHeight -
          this.clippingRect.y * this.pixelRatio,
      );
      // if parent has render texture, we need to adjust the scissor rect
      // to be relative to the parent's framebuffer
      if (this.parentHasRenderTexture) {
        clipY = this.framebufferDimensions
          ? this.framebufferDimensions.h - this.h
          : 0;
      }

      glw.setScissorTest(true);
      glw.scissor(clipX, clipY, clipWidth, clipHeight);
    } else {
      glw.setScissorTest(false);
    }

    // Check if this is SDF rendering (has sdfBuffers)
    if (this.sdfShaderProps !== undefined) {
      // SDF rendering uses drawArrays with explicit triangle vertices (6 vertices per quad)
      glw.drawArrays(glw.TRIANGLES, 0, 6 * this.numQuads);
    } else {
      // Regular rendering uses drawElements with index buffer (4 vertices per quad)
      const quadIdx = (this.bufferIdx / 32) * 6 * 2;
      glw.drawElements(
        glw.TRIANGLES,
        6 * this.numQuads,
        glw.UNSIGNED_SHORT,
        quadIdx,
      );
    }
  }
}
