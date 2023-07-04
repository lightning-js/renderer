import type { CoreShaderManager } from '../CoreShaderManager.js';
import type { TextureOptions } from '../CoreTextureManager.js';
import type { Stage } from '../stage.js';
import type { Texture } from '../textures/Texture.js';
import { CoreContextTexture } from './CoreContextTexture.js';
import type { CoreShaderOp } from './CoreShaderOp.js';

export abstract class CoreRenderer {
  protected stage: Stage;

  constructor(stage: Stage) {
    this.stage = stage;
  }

  abstract reset(): void;
  abstract render(surface: 'screen' | CoreContextTexture): void;
  abstract addQuad(
    x: number,
    y: number,
    w: number,
    h: number,
    color: number,
    texture: Texture | null,
    textureOptions: TextureOptions | null,
    shaderOp: CoreShaderOp | null,
  ): void;
  abstract createCtxTexture(textureSource: Texture): CoreContextTexture;
  abstract getShaderManager(): CoreShaderManager;
}
