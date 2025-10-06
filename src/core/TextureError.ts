export const TextureErrorCode = {
  MEMORY_THRESHOLD_EXCEEDED: 'MEMORY_THRESHOLD_EXCEEDED',
  TEXTURE_DATA_NULL: 'TEXTURE_DATA_NULL',
  TEXTURE_TYPE_NOT_REGISTERED: 'TEXTURE_TYPE_NOT_REGISTERED',
} as const;

type TextureErrorCode =
  (typeof TextureErrorCode)[keyof typeof TextureErrorCode];

export class TextureError extends Error {
  code?: TextureErrorCode;

  constructor(message: string, code?: TextureErrorCode) {
    super(message);

    this.name = new.target.name;

    if (code) {
      this.code = code;
    }
  }
}
