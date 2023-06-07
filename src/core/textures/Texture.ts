/**
 * Texture sources that are used to populate a CoreContextTexture
 */
export type TextureData = ImageBitmap | null;

export abstract class Texture {
  abstract getTextureData(): Promise<TextureData>;

  static makeCacheKey(props: Record<string, unknown>): string | false {
    return false;
  }

  static resolveDefaults(
    props: Record<string, unknown>,
  ): Record<string, unknown> {
    return {};
  }
}
