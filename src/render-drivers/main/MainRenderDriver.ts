import application, { type Application } from '../../core/application.js';
import { assert, createWebGLContext } from '../../utils.js';
import type { IRenderDriver } from '../../main-api/IRenderDriver.js';
import type { INode, INodeWritableProps } from '../../core/INode.js';
import { MainOnlyNode } from './MainOnlyNode.js';
import stage from '../../core/stage.js';

export class MainRenderDriver implements IRenderDriver {
  private root: MainOnlyNode | null = null;
  private app: Application | null = null;
  private nodes: Map<number, INode> = new Map();

  async init(canvas: HTMLCanvasElement): Promise<void> {
    const gl = createWebGLContext(canvas);
    if (!gl) {
      throw new Error('Unable to create WebGL context');
    }
    this.root = this.createNode() as MainOnlyNode;
    this.app = application({
      rootNode: this.root,
      w: 1920,
      h: 1080,
      context: gl,
    });
    assert(this.app.root);
    this.nodes.set(this.root.id, this.app.root);
  }

  createNode(props: Partial<INodeWritableProps> = {}): INode {
    const { nodes } = this;
    const node = new MainOnlyNode(stage);
    nodes.set(node.id, node);
    this.onCreateNode(node);
    return node;
  }

  destroyNode(primitive: INode): void {
    const { nodes } = this;
    const id = primitive.id;
    this.onDestroyNode(primitive);
    const node = nodes.get(id);
    if (node) {
      // Detach from parent and remove from nodes list
      node.parent = null;
      nodes.delete(id);
    }
  }

  getRootNode(): INode {
    assert(this.root);
    return this.root;
  }

  onCreateNode(node: INode): void {
    throw new Error('Method not implemented.');
  }

  onDestroyNode(node: INode): void {
    throw new Error('Method not implemented.');
  }
}
