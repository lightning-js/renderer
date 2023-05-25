import type { INode } from './INode.js';
import type { CoreRenderer } from './renderers/CoreRenderer.js';
import type { vec3 } from './lib/glm/index.js';
import type { Texture } from './textures/Texture.js';

export interface IRenderableNode extends INode {
  readonly children: IRenderableNode[];

  texture: Texture | null;
  getTranslate(): vec3.Vec3;

  update(delta: number): void;
  renderQuads(renderer: CoreRenderer): void;
}
