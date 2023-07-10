import type { INode, INodeWritableProps } from './INode.js';
import type { RendererMain, RendererMainSettings } from './RendererMain.js';
export interface IRenderDriver {
  init(
    rendererMain: RendererMain,
    rendererSettings: Required<RendererMainSettings>,
    canvas: HTMLCanvasElement,
  ): Promise<void>;
  createNode(props?: Partial<INodeWritableProps>): INode;
  // TODO: Nodes can be destroyed from the INode directly. Do we need this method
  // on this interface? All it does is call the destroy() method on the node.
  destroyNode(node: INode): void;
  getRootNode(): INode;

  releaseTexture(textureDescId: number): void;

  onCreateNode(node: INode): void;
  onBeforeDestroyNode(node: INode): void;
}
