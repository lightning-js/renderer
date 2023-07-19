import type { Dimensions } from '../utils.js';
import type { CoreRenderOp } from './CoreRenderOp.js';

export abstract class CoreShader {
  // abstract draw(): void;
  static makeCacheKey(
    props: Record<string, unknown>,
    dimensions: Dimensions,
  ): string | false {
    return false;
  }

  static resolveDefaults(
    props: Record<string, unknown>,
  ): Record<string, unknown> {
    return {};
  }

  abstract bindRenderOp(renderOp: CoreRenderOp): void;
  abstract bindProps(props: Record<string, unknown>): void;
  abstract attach(): void;
  abstract detach(): void;
}
