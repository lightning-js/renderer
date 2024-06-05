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
import type { CoreShaderManager } from '../CoreShaderManager.js';
import type {
  CoreTextureManager,
  TextureOptions,
} from '../CoreTextureManager.js';
import type { Stage } from '../Stage.js';
import type { TextureMemoryManager } from '../TextureMemoryManager.js';
import type { ContextSpy } from '../lib/ContextSpy.js';
import type { RenderCoords } from '../lib/RenderCoords.js';
import type { RectWithValid } from '../lib/utils.js';
import { ColorTexture } from '../textures/ColorTexture.js';
import type { Texture } from '../textures/Texture.js';
import { CoreContextTexture } from './CoreContextTexture.js';
import type { CoreShader } from './CoreShader.js';

export interface QuadOptions {
  width: number;
  height: number;
  colorTl: number;
  colorTr: number;
  colorBl: number;
  colorBr: number;
  texture: Texture | null;
  textureOptions: TextureOptions | null;
  zIndex: number;
  shader: CoreShader | null;
  shaderProps: Record<string, unknown> | null;
  alpha: number;
  clippingRect: RectWithValid;
  tx: number;
  ty: number;
  ta: number;
  tb: number;
  tc: number;
  td: number;
  renderCoords: RenderCoords;
  rtt?: boolean;
  parentHasRenderTexture?: boolean;
  framebufferDimensions?: Dimensions;
}

export interface CoreRendererOptions {
  stage: Stage;
  canvas: HTMLCanvasElement | OffscreenCanvas;
  pixelRatio: number;
  txManager: CoreTextureManager;
  txMemManager: TextureMemoryManager;
  shManager: CoreShaderManager;
  clearColor: number;
  bufferMemory: number;
  contextSpy: ContextSpy | null;
}

export abstract class CoreRenderer {
  public options: CoreRendererOptions;
  public mode: 'webgl' | 'canvas' | undefined;

  protected stage: Stage;

  //// Core Managers
  txManager: CoreTextureManager;
  txMemManager: TextureMemoryManager;
  shManager: CoreShaderManager;
  rttNodes: CoreNode[] = [];

  constructor(options: CoreRendererOptions) {
    this.options = options;
    this.stage = options.stage;
    this.txManager = options.txManager;
    this.txMemManager = options.txMemManager;
    this.shManager = options.shManager;
  }

  abstract reset(): void;
  abstract render(surface?: 'screen' | CoreContextTexture): void;
  abstract addQuad(quad: QuadOptions): void;
  abstract createCtxTexture(textureSource: Texture): CoreContextTexture;
  abstract getShaderManager(): CoreShaderManager;
  abstract get renderToTextureActive(): boolean;
  abstract get activeRttNode(): CoreNode | null;
  abstract renderRTTNodes(): void;
  abstract removeRTTNode(node: CoreNode): void;
  abstract renderToTexture(node: CoreNode): void;
}
