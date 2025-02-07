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
import { SubTexture } from '../../textures/SubTexture.js';
import { TextureType, type Texture } from '../../textures/Texture.js';
import type { CoreContextTexture } from '../CoreContextTexture.js';
import {
  CoreRenderer,
  type CoreRendererOptions,
  type QuadOptions,
} from '../CoreRenderer.js';
import { CanvasTexture } from './CanvasTexture.js';
import {
  parseColor,
  parseToAbgrString,
  parseToRgbaString,
} from './internal/ColorUtils.js';
import { assertTruthy } from '../../../utils.js';
import { CanvasShaderNode, type CanvasShaderType } from './CanvasShaderNode.js';

export class CanvasRenderer extends CoreRenderer {
  private context: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private pixelRatio: number;
  private clearColor: string;
  public renderToTextureActive = false;
  activeRttNode: CoreNode | null = null;

  private parsedColorCache: Map<number, string> = new Map();

  constructor(options: CoreRendererOptions) {
    super(options);

    this.mode = 'canvas';

    const { canvas } = options;
    this.canvas = canvas as HTMLCanvasElement;
    this.context = canvas.getContext('2d') as CanvasRenderingContext2D;
    this.pixelRatio = this.stage.pixelRatio;
    this.clearColor = this.getParsedColor(this.stage.clearColor);
  }

  reset(): void {
    this.canvas.width = this.canvas.width; // quick reset canvas

    const ctx = this.context;

    if (this.clearColor) {
      ctx.fillStyle = this.clearColor;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    ctx.scale(this.pixelRatio, this.pixelRatio);
  }

  render(): void {
    // noop
  }

  addQuad(quad: QuadOptions): void {
    const ctx = this.context;
    const { tx, ty, ta, tb, tc, td, clippingRect } = quad;
    let texture = quad.texture;
    const textureType = texture?.type;
    assertTruthy(textureType, 'Texture type is not defined');

    // The Canvas2D renderer only supports image and color textures
    if (
      textureType !== TextureType.image &&
      textureType !== TextureType.color &&
      textureType !== TextureType.subTexture &&
      textureType !== TextureType.noise
    ) {
      return;
    }

    if (texture) {
      if (texture instanceof SubTexture) {
        texture = texture.parentTexture;
      }

      if (texture.state === 'freed') {
        return;
      }
      if (texture.state !== 'loaded') {
        return;
      }
    }

    const hasTransform = ta !== 1;
    const hasClipping = clippingRect.width !== 0 && clippingRect.height !== 0;
    const hasShader = quad.shader !== null;

    let saveAndRestore = hasTransform === true || hasClipping === true;
    if (hasShader === true) {
      saveAndRestore =
        saveAndRestore || (quad.shader as CanvasShaderNode).applySNR;
    }

    if (saveAndRestore) {
      ctx.save();
    }

    if (hasClipping === true) {
      const path = new Path2D();
      const { x, y, width, height } = clippingRect;
      path.rect(x, y, width, height);
      ctx.clip(path);
    }

    if (hasTransform === true) {
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

    if (hasShader === true) {
      let renderContext: (() => void) | null = () => {
        this.renderContext(quad);
      };
      (quad.shader as CanvasShaderNode).render(ctx, quad, renderContext);
      renderContext = null;
    } else {
      this.renderContext(quad);
    }

    if (saveAndRestore) {
      ctx.restore();
    }
  }

  renderContext(quad: QuadOptions) {
    const color = quad.colorTl;
    const textureType = quad.texture?.type;
    if (
      (textureType === TextureType.image ||
        textureType === TextureType.subTexture ||
        textureType === TextureType.noise) &&
      quad.texture?.ctxTexture
    ) {
      const tintColor = parseColor(color);
      const image = (quad.texture.ctxTexture as CanvasTexture).getImage(
        tintColor,
      );
      this.context.globalAlpha = tintColor.a ?? quad.alpha;
      if (textureType === TextureType.subTexture) {
        this.context.drawImage(
          image,
          (quad.texture as SubTexture).props.x,
          (quad.texture as SubTexture).props.y,
          (quad.texture as SubTexture).props.width,
          (quad.texture as SubTexture).props.height,
          quad.tx,
          quad.ty,
          quad.width,
          quad.height,
        );
      } else {
        try {
          this.context.drawImage(
            image,
            quad.tx,
            quad.ty,
            quad.width,
            quad.height,
          );
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          // noop
        }
      }
      this.context.globalAlpha = 1;
      return;
    }
    const hasGradient =
      quad.colorTl !== quad.colorTr || quad.colorTl !== quad.colorBr;
    if (textureType === TextureType.color && hasGradient) {
      let endX: number = quad.tx;
      let endY: number = quad.ty;
      let endColor: number;
      if (quad.colorTl === quad.colorTr) {
        // vertical
        endX = quad.tx;
        endY = quad.ty + quad.height;
        endColor = quad.colorBr;
      } else {
        // horizontal
        endX = quad.tx + quad.width;
        endY = quad.ty;
        endColor = quad.colorTr;
      }
      const gradient = this.context.createLinearGradient(
        quad.tx,
        quad.ty,
        endX,
        endY,
      );
      gradient.addColorStop(0, this.getParsedColor(color));
      gradient.addColorStop(1, this.getParsedColor(endColor));
      this.context.fillStyle = gradient;
      this.context.fillRect(quad.tx, quad.ty, quad.width, quad.height);
    } else if (textureType === TextureType.color) {
      this.context.fillStyle = this.getParsedColor(color);
      this.context.fillRect(quad.tx, quad.ty, quad.width, quad.height);
    }
  }

  createShaderNode(
    shaderKey: string,
    shaderType: Readonly<CanvasShaderType>,
    props?: Record<string, any>,
  ) {
    return new CanvasShaderNode(shaderKey, shaderType, this.stage, props);
  }

  createShaderProgram(shaderConfig) {
    return null;
  }

  createCtxTexture(textureSource: Texture): CoreContextTexture {
    return new CanvasTexture(this.stage.txMemManager, textureSource);
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

  getParsedColor(color: number, isRGBA: boolean = false) {
    let out = this.parsedColorCache.get(color);
    if (out !== undefined) {
      return out;
    }
    if (isRGBA) {
      out = parseToRgbaString(color);
    } else {
      out = parseToAbgrString(color);
    }
    this.parsedColorCache.set(color, out);
    return out;
  }

  /**
   * Updates the clear color of the canvas renderer.
   *
   * @param color - The color to set as the clear color.
   */
  updateClearColor(color: number) {
    this.clearColor = this.getParsedColor(color);
  }

  override getDefaultShaderNode() {
    return null;
  }
}
