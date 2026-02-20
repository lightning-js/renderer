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
import type { RectWithValid } from '../../lib/utils.js';
import type { Dimensions } from '../../../common/CommonTypes.js';
import type { Stage } from '../../Stage.js';

/**
 * Can render multiple quads with multiple textures (up to vertex shader texture limit)
 *
 */
export class SdfRenderOp extends CoreRenderOp {
  public numQuads = 0;
  public readonly isCoreNode = false as const;
  public renderOpTextures: WebGlCtxTexture[] = [];
  public time: number = 0;
  readonly stage: Stage;

  constructor(
    readonly renderer: WebGlRenderer,
    readonly shader: WebGlShaderNode,
    readonly sdfShaderProps: Record<string, unknown>,
    readonly quadBufferCollection: BufferCollection,
    readonly worldAlpha: number,
    readonly clippingRect: RectWithValid,
    readonly w: number,
    readonly h: number,
    readonly rtt: boolean,
    readonly parentHasRenderTexture: boolean,
    readonly framebufferDimensions: Dimensions | null,
  ) {
    super();
    this.stage = renderer.stage;
  }

  addTexture(texture: WebGlCtxTexture): number {
    const { renderOpTextures } = this;
    const length = renderOpTextures.length;

    // We only support 1 texture (atlas) for SDF for now, but following the pattern
    for (let i = 0; i < length; i++) {
      if (renderOpTextures[i] === texture) {
        return i;
      }
    }

    renderOpTextures.push(texture);
    return length;
  }

  draw() {
    const { glw, stage } = this.renderer;
    const canvas = stage.platform!.canvas!;

    stage.shManager.useShader(this.shader.program);
    this.shader.program.bindRenderOp(this);

    // Clipping
    if (this.clippingRect.valid === true) {
      const pixelRatio = this.parentHasRenderTexture ? 1 : stage.pixelRatio;
      const clipX = Math.round(this.clippingRect.x * pixelRatio);
      const clipWidth = Math.round(this.clippingRect.w * pixelRatio);
      const clipHeight = Math.round(this.clippingRect.h * pixelRatio);
      let clipY = Math.round(
        canvas.height - clipHeight - this.clippingRect.y * pixelRatio,
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

    // SDF rendering uses drawArrays with explicit triangle vertices (6 vertices per quad)
    // Note: buffers should be bound by bindRenderOp -> bindBufferCollection
    glw.drawArrays(glw.TRIANGLES, 0, 6 * this.numQuads);
  }
}
