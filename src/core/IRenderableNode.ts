import type { INode } from './INode.js';
import type { vec3 } from './lib/glm/index.js';

export interface IRenderableNode extends INode {
  readonly children: IRenderableNode[];

  texture: WebGLTexture | null;
  getTranslate(): vec3.Vec3;

  update(delta: number): void;

  render(ctx: WebGLRenderingContext | WebGL2RenderingContext): void;
}
