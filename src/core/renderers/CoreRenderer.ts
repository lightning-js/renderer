import { CoreTexture } from './CoreTexture.js';
import type { CoreTextureManager } from './CoreTextureManager.js';

export abstract class CoreRenderer {
  abstract readonly textureManager: CoreTextureManager;

  abstract reset(): void;
  abstract render(surface: 'screen' | CoreTexture): void;
  abstract addQuad(
    x: number,
    y: number,
    w: number,
    h: number,
    color: number,
    texture: CoreTexture | null,
  ): void;
}
