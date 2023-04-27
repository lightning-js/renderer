import type { INode, INodeWritableProps } from '../core/INode.js';

export interface IRenderDriver {
  init(canvas: HTMLCanvasElement): Promise<void>;
  createNode(props?: Partial<INodeWritableProps>): INode;
  destroyNode(node: INode): void;
  getRootNode(): INode;

  onCreateNode(primitive: INode): void;
  onDestroyNode(primitive: INode): void;
}
