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

import type { BaseShaderController } from '../../../main-api/ShaderController.js';
import type { CoreNode } from '../../CoreNode.js';
import type { CoreShaderManager } from '../../CoreShaderManager.js';
import { getRgbaComponents, type RGBA } from '../../lib/utils.js';
import { SubTexture } from '../../textures/SubTexture.js';
import type { Texture } from '../../textures/Texture.js';
import type { CoreContextTexture } from '../CoreContextTexture.js';
import {
  CoreRenderer,
  type CoreRendererOptions,
  type QuadOptions,
} from '../CoreRenderer.js';
import { CanvasCoreTexture } from './CanvasCoreTexture.js';
import { getBorder, getRadius, strokeLine } from './internal/C2DShaderUtils.js';
import {
  formatRgba,
  parseColorRgba,
  parseColor,
  type IParsedColor,
} from './internal/ColorUtils.js';
import { UnsupportedShader } from './shaders/UnsupportedShader.js';

export class CanvasCoreRenderer extends CoreRenderer {
  private context: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private pixelRatio: number;
  private clearColor: RGBA | undefined;
  public renderToTextureActive = false;
  activeRttNode: CoreNode | null = null;
  private defShaderCtr: BaseShaderController;

  constructor(options: CoreRendererOptions) {
    super(options);

    this.mode = 'canvas';
    this.shManager.renderer = this;

    const { canvas, pixelRatio, clearColor } = options;
    this.canvas = canvas as HTMLCanvasElement;
    this.context = canvas.getContext('2d') as CanvasRenderingContext2D;
    this.pixelRatio = pixelRatio;
    this.clearColor = clearColor ? getRgbaComponents(clearColor) : undefined;

    // Stub for default shader controller since the canvas renderer does not
    // (really) support the concept of a shader (yet)
    this.defShaderCtr = {
      type: 'DefaultShader',
      props: {},
      shader: new UnsupportedShader('DefaultShader'),
      getResolvedProps: () => () => {
        return {};
      },
    };
  }

  reset(): void {
    // eslint-disable-next-line no-self-assign
    this.canvas.width = this.canvas.width; // quick reset canvas

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
      tx,
      ty,
      width,
      height,
      alpha,
      colorTl,
      colorTr,
      colorBr,
      ta,
      tb,
      tc,
      td,
      clippingRect,
    } = quad;
    let texture = quad.texture;
    let ctxTexture: CanvasCoreTexture | undefined = undefined;
    let frame:
      | { x: number; y: number; width: number; height: number }
      | undefined;

    if (texture) {
      if (texture instanceof SubTexture) {
        frame = texture.props;
        texture = texture.parentTexture;
      }

      ctxTexture = texture.ctxTexture as CanvasCoreTexture;
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
    const hasGradient = colorTl !== colorTr || colorTl !== colorBr;
    const hasQuadShader = Boolean(quad.shader);
    const radius = hasQuadShader ? getRadius(quad) : 0;
    const border = hasQuadShader ? getBorder(quad) : undefined;

    if (hasTransform || hasClipping || radius) {
      ctx.save();
    }

    if (hasClipping) {
      const path = new Path2D();
      const { x, y, width, height } = clippingRect;
      path.rect(x, y, width, height);
      ctx.clip(path);
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

    if (radius) {
      const path = new Path2D();
      path.roundRect(tx, ty, width, height, radius);
      ctx.clip(path);
    }

    if (ctxTexture) {
      const image = ctxTexture.getImage(color);
      ctx.globalAlpha = color.a ?? alpha;
      if (frame) {
        ctx.drawImage(
          image,
          frame.x,
          frame.y,
          frame.width,
          frame.height,
          tx,
          ty,
          width,
          height,
        );
      } else {
        ctx.drawImage(image, tx, ty, width, height);
      }
      ctx.globalAlpha = 1;
    } else if (hasGradient) {
      let endX: number = tx;
      let endY: number = ty;
      let endColor: IParsedColor;
      if (colorTl === colorTr) {
        // vertical
        endX = tx;
        endY = ty + height;
        endColor = parseColor(colorBr);
      } else {
        // horizontal
        endX = tx + width;
        endY = ty;
        endColor = parseColor(colorTr);
      }
      const gradient = ctx.createLinearGradient(tx, ty, endX, endY);
      gradient.addColorStop(0, formatRgba(color));
      gradient.addColorStop(1, formatRgba(endColor));
      ctx.fillStyle = gradient;
      ctx.fillRect(tx, ty, width, height);
    } else {
      ctx.fillStyle = formatRgba(color);
      ctx.fillRect(tx, ty, width, height);
    }

    if (border && border.width) {
      const borderWidth = border.width;
      const borderInnerWidth = border.width / 2;
      const borderColor = formatRgba(parseColorRgba(border.color ?? 0));

      ctx.beginPath();
      ctx.lineWidth = borderWidth;
      ctx.strokeStyle = borderColor;
      ctx.globalAlpha = alpha;
      if (radius) {
        ctx.roundRect(
          tx + borderInnerWidth,
          ty + borderInnerWidth,
          width - borderWidth,
          height - borderWidth,
          radius,
        );
        ctx.stroke();
      } else {
        ctx.strokeRect(
          tx + borderInnerWidth,
          ty + borderInnerWidth,
          width - borderWidth,
          height - borderWidth,
        );
      }
      ctx.globalAlpha = 1;
    } else if (hasQuadShader) {
      const borderTop = getBorder(quad, 'Top');
      const borderRight = getBorder(quad, 'Right');
      const borderBottom = getBorder(quad, 'Bottom');
      const borderLeft = getBorder(quad, 'Left');

      if (borderTop) {
        strokeLine(
          ctx,
          tx,
          ty,
          width,
          height,
          borderTop.width,
          borderTop.color,
          'Top',
        );
      }

      if (borderRight) {
        strokeLine(
          ctx,
          tx,
          ty,
          width,
          height,
          borderRight.width,
          borderRight.color,
          'Right',
        );
      }

      if (borderBottom) {
        strokeLine(
          ctx,
          tx,
          ty,
          width,
          height,
          borderBottom.width,
          borderBottom.color,
          'Bottom',
        );
      }

      if (borderLeft) {
        strokeLine(
          ctx,
          tx,
          ty,
          width,
          height,
          borderLeft.width,
          borderLeft.color,
          'Left',
        );
      }
    }

    if (hasTransform || hasClipping || radius) {
      ctx.restore();
    }
  }

  createCtxTexture(textureSource: Texture): CoreContextTexture {
    return new CanvasCoreTexture(this.txMemManager, textureSource);
  }

  getShaderManager(): CoreShaderManager {
    return this.shManager;
  }

  override getDefShaderCtr(): BaseShaderController {
    return this.defShaderCtr;
  }

  renderRTTNodes(): void {
    // noop
  }

  removeRTTNode(node: CoreNode): void {
    // noop
  }

  renderToTexture(node: CoreNode): void {
    // noop
  }
  getBufferInfo(): null {
    return null;
  }

  /**
   * Updates the clear color of the canvas renderer.
   *
   * @param color - The color to set as the clear color.
   */
  updateClearColor(color: number) {
    this.clearColor = color ? getRgbaComponents(color) : undefined;
  }
}
