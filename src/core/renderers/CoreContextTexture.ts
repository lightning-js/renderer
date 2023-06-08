import type { Texture } from '../textures/Texture.js';

export abstract class CoreContextTexture {
  readonly textureSource: Texture;

  constructor(textureSource: Texture) {
    this.textureSource = textureSource;
  }

  abstract load(): void;
}
