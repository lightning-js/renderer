import type { CoreShaderManager } from '../CoreShaderManager.js';
import type { CoreRenderOp } from './CoreRenderOp.js';
import type { CoreShader } from './CoreShader.js';

let shOpId = 0;
export class CoreShaderOp {
  readonly id = shOpId++;
  constructor(
    readonly shManager: CoreShaderManager,
    readonly shader: CoreShader,
    readonly shaderProps: Record<string, unknown>,
  ) {}

  draw(renderOp: CoreRenderOp): void {
    const { shManager, shaderProps } = this;
    const shader = this.shader;
    shManager.useShader(shader);
    shader.bindRenderOp(renderOp);
    shader.bindProps(shaderProps);
  }
}
