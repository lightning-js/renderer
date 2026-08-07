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
import type { SdfBuffer } from './SdfBuffer.js';
import type { WebGlShaderNode } from './WebGlShaderNode.js';
import type { RectWithValid } from '../../lib/utils.js';
import type { Dimensions } from '../../../common/CommonTypes.js';
import type { Stage } from '../../Stage.js';

/**
 * A batched SDF text render operation.
 *
 * Rather than owning its own WebGL buffer, this op references a range inside
 * one of the renderer's shared SDF vertex buffers (a {@link SdfBuffer}). Text
 * nodes that share the same atlas texture, clipping rect, and RTT state are
 * merged into a single SdfRenderOp, producing one draw call for many strings.
 *
 * `startQuad` is 0-based within the owning SdfBuffer. The shared element index
 * buffer holds the standard quad index pattern starting at index 0, so the
 * draw range is `startQuad * 6 * 2` bytes regardless of which SdfBuffer (and
 * therefore which GPU layout) this op draws from.
 */
export class SdfRenderOp extends CoreRenderOp {
  public numQuads = 0;
  public readonly isCoreNode = false as const;
  public renderOpTextures: WebGlCtxTexture[] = [];
  public time: number = 0;
  readonly stage: Stage;

  /**
   * Index of the first quad of this batch within the owning SdfBuffer.
   * Used to compute the byte offset into the shared element index buffer.
   */
  public startQuad = 0;

  constructor(
    readonly renderer: WebGlRenderer,
    readonly shader: WebGlShaderNode,
    readonly sdfBuffer: SdfBuffer,
    readonly worldAlpha: number,
    readonly clippingRect: RectWithValid,
    readonly w: number,
    readonly h: number,
    readonly rtt: boolean,
    public parentHasRenderTexture: boolean,
    public framebufferDimensions: Dimensions | null,
  ) {
    super();
    this.stage = renderer.stage;
  }

  get quadBufferCollection() {
    return this.sdfBuffer.quadBufferCollection;
  }

  addTexture(texture: WebGlCtxTexture): number {
    const { renderOpTextures } = this;
    const length = renderOpTextures.length;

    for (let i = 0; i < length; i++) {
      if (renderOpTextures[i] === texture) {
        return i;
      }
    }

    if (length >= 1) {
      return 0xffffffff;
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

    // Draw the batch range from the shared SDF buffer using indexed rendering.
    // 4 vertices per quad, 6 indices per quad (2 triangles).
    // Byte offset into the shared Uint16 index buffer:
    const byteOffset = this.startQuad * 6 * 2;
    glw.drawElements(
      glw.TRIANGLES,
      6 * this.numQuads,
      glw.UNSIGNED_SHORT,
      byteOffset,
    );
  }
}
