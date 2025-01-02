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
import type { CoreNode } from '../../CoreNode.js';
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
import {
  CanvasShaderProgram,
  type CanvasShaderType,
} from './CanvasShaderProgram.js';
import {
  formatRgba,
  parseColor,
  type IParsedColor,
} from './internal/ColorUtils.js';
import { CoreShaderNode } from '../CoreShaderNode.js';

export class CanvasCoreRenderer extends CoreRenderer {
  private context: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private pixelRatio: number;
  private clearColor: RGBA | undefined;
  public renderToTextureActive = false;
  activeRttNode: CoreNode | null = null;

  constructor(options: CoreRendererOptions) {
    super(options);

    this.mode = 'canvas';

    const { canvas, pixelRatio, clearColor } = options;
    this.canvas = canvas as HTMLCanvasElement;
    this.context = canvas.getContext('2d') as CanvasRenderingContext2D;
    this.pixelRatio = pixelRatio;
    this.clearColor = clearColor ? getRgbaComponents(clearColor) : undefined;
  }

  reset(): void {
    this.canvas.width = this.canvas.width; // quick reset canvas

    const ctx = this.context;

    if (this.clearColor) {
      const [r, g, b, a] = this.clearColor;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    ctx.scale(this.pixelRatio, this.pixelRatio);
  }

  load(): void {
    //noop
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

    if (texture) {
      if (texture instanceof SubTexture) {
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

    const hasTransform = ta !== 1;
    const hasClipping = clippingRect.width !== 0 && clippingRect.height !== 0;

    const hasShader = Boolean(quad.shader);

    let saveAndRestore = hasTransform || hasClipping;

    if (hasShader) {
      saveAndRestore =
        saveAndRestore ||
        (quad.shader?.program as CanvasShaderProgram).saveAndRestore!;
    }

    if (saveAndRestore) {
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

    if (hasShader) {
      let contextRendered = false;
      let renderContext: (() => void) | null = () => {
        this.renderContext(quad);
        contextRendered = true;
      };
      (quad.shader?.program as CanvasShaderProgram).render(
        this.context,
        quad,
        quad.shader?.getResolvedProps(),
        renderContext,
      );
      if (contextRendered === false) {
        renderContext();
      }
      renderContext = null;
    } else {
      this.renderContext(quad);
    }

    if (saveAndRestore) {
      ctx.restore();
    }
  }

  renderContext(quad: QuadOptions) {
    const color = parseColor(quad.colorTl);
    const hasGradient =
      quad.colorTl !== quad.colorTr || quad.colorTl !== quad.colorBr;
    if (quad.texture) {
      const image = (quad.texture.ctxTexture as CanvasCoreTexture).getImage(
        color,
      );
      this.context.globalAlpha = color.a ?? quad.alpha;
      if (quad.texture instanceof SubTexture) {
        this.context.drawImage(
          image,
          quad.texture.props.x,
          quad.texture.props.y,
          quad.texture.props.width,
          quad.texture.props.height,
          quad.tx,
          quad.ty,
          quad.width,
          quad.height,
        );
      } else {
        this.context.drawImage(
          image,
          quad.tx,
          quad.ty,
          quad.width,
          quad.height,
        );
      }
      this.context.globalAlpha = 1;
    } else if (hasGradient) {
      let endX: number = quad.tx;
      let endY: number = quad.ty;
      let endColor: IParsedColor;
      if (quad.colorTl === quad.colorTr) {
        // vertical
        endX = quad.tx;
        endY = quad.ty + quad.height;
        endColor = parseColor(quad.colorBr);
      } else {
        // horizontal
        endX = quad.tx + quad.width;
        endY = quad.ty;
        endColor = parseColor(quad.colorTr);
      }
      const gradient = this.context.createLinearGradient(
        quad.tx,
        quad.ty,
        endX,
        endY,
      );
      gradient.addColorStop(0, formatRgba(color));
      gradient.addColorStop(1, formatRgba(endColor));
      this.context.fillStyle = gradient;
      this.context.fillRect(quad.tx, quad.ty, quad.width, quad.height);
    } else {
      this.context.fillStyle = formatRgba(color);
      this.context.fillRect(quad.tx, quad.ty, quad.width, quad.height);
    }
  }

  createShaderNode(
    shaderConfig: Readonly<CanvasShaderType>,
    program: CanvasShaderProgram,
    props?: Record<string, any>,
  ): CoreShaderNode<any> {
    return new CoreShaderNode(shaderConfig, program, this.stage, props);
  }

  createShaderProgram(shaderConfig: CanvasShaderType): CanvasShaderProgram {
    return new CanvasShaderProgram(this, shaderConfig);
  }

  createCtxTexture(textureSource: Texture): CoreContextTexture {
    return new CanvasCoreTexture(this.stage.txMemManager, textureSource);
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

  override getDefaultShaderNode() {
    return null;
  }
}
