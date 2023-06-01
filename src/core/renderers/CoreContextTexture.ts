import type { Texture } from '../textures/Texture.js';

export abstract class CoreContextTexture {
  readonly textureSource: Texture | null = null;

  constructor(textureSource: Texture | null) {
    this.textureSource = textureSource;
  }

  abstract load(): void;
}
