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

import type { Dimensions } from '../../common/CommonTypes.js';
import type { CoreNode } from '../CoreNode.js';
import type { TextureOptions } from '../CoreTextureManager.js';
import type { Stage } from '../Stage.js';
import type { ContextSpy } from '../lib/ContextSpy.js';
import type { RenderCoords } from '../lib/RenderCoords.js';
import type { RectWithValid } from '../lib/utils.js';
import type { CoreShaderProgram } from './CoreShaderProgram.js';
import type { Texture, TextureCoords } from '../textures/Texture.js';
import { CoreContextTexture } from './CoreContextTexture.js';
import type { CoreShaderType, CoreShaderNode } from './CoreShaderNode.js';

export interface QuadOptions {
  width: number;
  height: number;
  colorTl: number;
  colorTr: number;
  colorBl: number;
  colorBr: number;
  texture: Texture | null;
  textureOptions: TextureOptions | null;
  textureCoords: TextureCoords | undefined;
  zIndex: number;
  shader: CoreShaderNode | null;
  alpha: number;
  clippingRect: RectWithValid;
  tx: number;
  ty: number;
  ta: number;
  tb: number;
  tc: number;
  td: number;
  renderCoords?: RenderCoords;
  rtt: boolean;
  parentHasRenderTexture: boolean;
  framebufferDimensions: Dimensions | null;
  time?: number | null;
}

export interface CoreRendererOptions {
  stage: Stage;
  canvas: HTMLCanvasElement | OffscreenCanvas;
  contextSpy: ContextSpy | null;
  forceWebGL2: boolean;
}

export interface BufferInfo {
  totalUsed: number;
  totalAvailable: number;
}

export abstract class CoreRenderer {
  public options: CoreRendererOptions;
  public mode: 'webgl' | 'canvas' | undefined;
  defaultTextureCoords: TextureCoords | undefined = undefined;
  readonly stage: Stage;

  //// Core Managers
  rttNodes: CoreNode[] = [];

  constructor(options: CoreRendererOptions) {
    this.options = options;
    this.stage = options.stage;
  }

  abstract reset(): void;
  abstract render(surface?: 'screen' | CoreContextTexture): void;
  abstract addQuad(quad: QuadOptions): void;
  abstract createCtxTexture(textureSource: Texture): CoreContextTexture;
  abstract createShaderProgram(
    shaderConfig: Readonly<CoreShaderType>,
    props?: Record<string, unknown>,
  ): CoreShaderProgram | null;
  abstract createShaderNode(
    shaderKey: string,
    shaderType: Readonly<CoreShaderType>,
    props?: Record<string, unknown>,
    program?: CoreShaderProgram,
  ): CoreShaderNode;
  abstract supportsShaderType(shaderType: Readonly<CoreShaderType>): boolean;
  abstract getDefaultShaderNode(): CoreShaderNode | null;
  abstract get renderToTextureActive(): boolean;
  abstract get activeRttNode(): CoreNode | null;
  abstract renderRTTNodes(): void;
  abstract removeRTTNode(node: CoreNode): void;
  abstract renderToTexture(node: CoreNode): void;
  abstract getBufferInfo(): BufferInfo | null;
  abstract getQuadCount(): number | null;
  abstract updateViewport(): void;
  abstract updateClearColor(color: number): void;
  getTextureCoords?(node: CoreNode): TextureCoords | undefined;
}
