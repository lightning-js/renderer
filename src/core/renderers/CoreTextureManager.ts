import type { CoreTexture } from './CoreTexture.js';

export abstract class CoreTextureManager {
  abstract getWhitePixelTexture(): CoreTexture;
  abstract getImageTexture(imageUrl: string): Promise<CoreTexture>;
}
