import type { INode } from './INode.js';
import type { CoreRenderer } from './renderers/CoreRenderer.js';
import type { CoreTexture } from './renderers/CoreTexture.js';
import type { vec3 } from './lib/glm/index.js';

export interface IRenderableNode extends INode {
  readonly children: IRenderableNode[];

  texture: CoreTexture | null;
  getTranslate(): vec3.Vec3;

  update(delta: number): void;
  renderQuads(renderer: CoreRenderer): void;
}
