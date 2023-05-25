import application, { type Application } from '../../core/application.js';
import { assertTruthy, createWebGLContext } from '../../utils.js';
import type { IRenderDriver } from '../../main-api/IRenderDriver.js';
import type { INode, INodeWritableProps } from '../../core/INode.js';
import { MainOnlyNode } from './MainOnlyNode.js';
import stage, { type Stage } from '../../core/stage.js';
import type { IRenderableNode } from '../../core/IRenderableNode.js';

export class MainRenderDriver implements IRenderDriver {
  private root: MainOnlyNode | null = null;
  private app: Application | null = null;

  async init(canvas: HTMLCanvasElement): Promise<void> {
    this.app = application({
      createRootNode: (stage: Stage) => {
        const node = new MainOnlyNode(stage);
        node.once('beforeDestroy', this.onBeforeDestroyNode.bind(this, node));
        this.onCreateNode(node);
        return node;
      },
      w: 1920,
      h: 1080,
      canvas,
    });
    this.root = this.app.root as MainOnlyNode;
    assertTruthy(this.app.root);
  }

  createNode(props: Partial<INodeWritableProps> = {}): INode & IRenderableNode {
    const node = new MainOnlyNode(stage);
    node.once('beforeDestroy', this.onBeforeDestroyNode.bind(this, node));
    node.x = props.x || 0;
    node.y = props.y || 0;
    node.w = props.w || 0;
    node.h = props.h || 0;
    node.parent = (props.parent as MainOnlyNode) || null;
    node.color = props.color || 0xffffffff;
    node.alpha = props.alpha || 1;
    node.src = props.src || '';
    this.onCreateNode(node);
    return node;
  }

  // TODO: Remove?
  destroyNode(node: INode): void {
    node.destroy();
  }

  getRootNode(): INode {
    assertTruthy(this.root);
    return this.root;
  }

  onCreateNode(node: INode): void {
    throw new Error('Method not implemented.');
  }

  onBeforeDestroyNode(node: INode): void {
    throw new Error('Method not implemented.');
  }
}
