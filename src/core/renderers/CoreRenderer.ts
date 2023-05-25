import type { Texture } from '../textures/Texture.js';
import { CoreContextTexture } from './CoreContextTexture.js';
import type { CoreTextureManager } from './CoreTextureManager.js';

export abstract class CoreRenderer {
  abstract readonly textureManager: CoreTextureManager;

  abstract reset(): void;
  abstract render(surface: 'screen' | CoreContextTexture): void;
  abstract addQuad(
    x: number,
    y: number,
    w: number,
    h: number,
    color: number,
    texture: Texture | null,
  ): void;
}
