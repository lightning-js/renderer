/**
 * Texture sources that are used to populate a CoreContextTexture
 */
export type TextureData = ImageBitmap | null;

export abstract class Texture {
  abstract getTextureData(): Promise<TextureData>;
}
