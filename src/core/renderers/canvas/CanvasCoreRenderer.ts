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

import type { CoreShaderManager } from "../../CoreShaderManager.js";
import { getRgbaComponents, type RGBA } from "../../lib/utils.js";
import { SubTexture } from "../../textures/SubTexture.js";
import type { Texture } from "../../textures/Texture.js";
import type { CoreContextTexture } from "../CoreContextTexture.js";
import { CoreRenderer, type CoreRendererOptions, type QuadOptions } from "../CoreRenderer.js";
import { CanvasCoreTexture } from "./CanvasCoreTexture.js";
import { formatRgba, parseColor } from "./internal/ColorUtils.js";

export class CanvasCoreRenderer extends CoreRenderer {

  private context: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private pixelRatio: number;
  private clearColor: RGBA | undefined;

  constructor(options: CoreRendererOptions) {
    super(options);

    this.mode = 'canvas';
    this.shManager.renderer = this;

    const { canvas, pixelRatio, clearColor } = options;
    this.canvas = canvas as HTMLCanvasElement;
    this.context = canvas.getContext('2d') as CanvasRenderingContext2D;
    this.pixelRatio = pixelRatio;
    this.clearColor = clearColor ? getRgbaComponents(clearColor) : undefined;
  }

  reset(): void {
    // quick reset canvas
    this.canvas.width = this.canvas.width ?? 1920;
    const ctx = this.context;

    if (this.clearColor) {
      const [r, g, b, a] = this.clearColor;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    ctx.scale(this.pixelRatio, this.pixelRatio);
  }

  render(): void {
    // noop
  }

  addQuad(quad: QuadOptions): void {
    const ctx = this.context;
    const {
      tx, ty, width, height, alpha, colorTl, ta, tb, tc, td, clippingRect
    } = quad;
    let texture = quad.texture;
    let ctxTexture: CanvasCoreTexture | undefined = undefined;
    let frame: { x: number, y: number, width: number, height: number } | undefined;

    if (texture) {
      if (texture instanceof SubTexture) {
        frame = texture.props;
        texture = texture.parentTexture;
      }

      ctxTexture = this.txManager.getCtxTexture(texture) as CanvasCoreTexture;
      if (texture.state === 'freed') {
        ctxTexture.load();
        return;
      }
      if (texture.state !== 'loaded' || !ctxTexture.hasImage()) {
        return;
      }
    }

    const color = parseColor(colorTl);
    const hasTransform = ta !== 1;
    const hasClipping = clippingRect.width !== 0 && clippingRect.height !== 0;

    if (hasTransform || hasClipping) {
      ctx.save();
    }

    if (hasClipping) {
      const { x, y, width, height } = quad.clippingRect;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + width, y);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
      ctx.clip();
    }

    if (hasTransform) {
      // Quad transform:
      // | ta tb tx |
      // | tc td ty |
      // | 0  0  1  |
      // C2D transform:
      // | a  c  e  |
      // | b  d  f  |
      // | 0  0  1  |
      const scale = this.pixelRatio;
      ctx.setTransform(ta, tc, tb, td, tx * scale, ty * scale);
      ctx.scale(scale, scale);
      ctx.translate(-tx, -ty);
    }

    if (ctxTexture) {
      const image = ctxTexture.getImage(color);
      ctx.globalAlpha = alpha;
      if (frame) {
        ctx.drawImage(image, frame.x, frame.y, frame.width, frame.height, tx, ty, width, height);
      } else {
        ctx.drawImage(image, tx, ty, width, height);
      }
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = formatRgba(color);
      ctx.fillRect(tx, ty, width, height);
    }

    if (hasTransform || hasClipping) {
      ctx.restore();
    }
  }

  createCtxTexture(textureSource: Texture): CoreContextTexture {
    return new CanvasCoreTexture(this.txMemManager, textureSource);
  }

  getShaderManager(): CoreShaderManager {
    return this.shManager;
  }
}
