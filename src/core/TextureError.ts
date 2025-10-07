export enum TextureErrorCode {
  MEMORY_THRESHOLD_EXCEEDED = 'MEMORY_THRESHOLD_EXCEEDED',
  TEXTURE_DATA_NULL = 'TEXTURE_DATA_NULL',
  TEXTURE_TYPE_NOT_REGISTERED = 'TEXTURE_TYPE_NOT_REGISTERED',
}

const defaultMessages: Record<TextureErrorCode, string> = {
  [TextureErrorCode.MEMORY_THRESHOLD_EXCEEDED]: 'Memory threshold exceeded',
  [TextureErrorCode.TEXTURE_DATA_NULL]: 'Texture data is null',
  [TextureErrorCode.TEXTURE_TYPE_NOT_REGISTERED]:
    'Texture type is not registered',
};

export class TextureError extends Error {
  code?: TextureErrorCode;

  constructor(message: string);
  constructor(code: TextureErrorCode, message?: string);
  constructor(codeOrMessage: TextureErrorCode | string, maybeMessage?: string) {
    const isCode = Object.values(TextureErrorCode).includes(
      codeOrMessage as TextureErrorCode,
    );

    const code = isCode ? (codeOrMessage as TextureErrorCode) : undefined;
    let message: string;
    if (isCode && code) {
      message = maybeMessage ?? defaultMessages[code];
    } else {
      message = String(codeOrMessage);
    }

    super(message);
    this.name = new.target.name;
    if (code) this.code = code;
  }
}

export function isTextureError(err: unknown): err is TextureError {
  return (
    err instanceof TextureError ||
    (typeof err === 'object' &&
      err !== null &&
      (err as { name?: unknown }).name === 'TextureError' &&
      typeof (err as { code?: unknown }).code === 'string')
  );
}
