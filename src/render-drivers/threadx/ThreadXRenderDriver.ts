import { ThreadX, BufferStruct } from '@lightningjs/threadx';
import type { INode, INodeWritableProps } from '../../core/INode.js';
import { NodeStruct } from './NodeStruct.js';
import type { IRenderDriver } from '../../main-api/IRenderDriver.js';
import { ThreadXMainNode } from './ThreadXMainNode.js';
import { assertTruthy } from '../../utils.js';

export interface ThreadXRendererSettings {
  RendererWorker: new () => Worker;
}

export class ThreadXRenderDriver implements IRenderDriver {
  private settings: ThreadXRendererSettings;
  private threadx: ThreadX;
  private root: INode | null = null;

  constructor(settings: ThreadXRendererSettings) {
    this.settings = settings;
    this.threadx = ThreadX.init({
      workerId: 1,
      workerName: 'main',
      sharedObjectFactory(buffer) {
        const typeId = BufferStruct.extractTypeId(buffer);
        if (typeId === NodeStruct.typeId) {
          const nodeStruct = new NodeStruct(buffer);
          return nodeStruct.lock(() => {
            return new ThreadXMainNode(nodeStruct);
          });
        }
        return null;
      },
    });
    this.threadx.registerWorker('renderer', new this.settings.RendererWorker());
  }

  async init(canvas: HTMLCanvasElement): Promise<void> {
    const offscreenCanvas = canvas.transferControlToOffscreen();
    const rootNodeId = (await this.threadx.sendMessageAsync(
      'renderer',
      {
        type: 'init',
        canvas: offscreenCanvas,
      },
      [offscreenCanvas],
    )) as number;
    // The Render worker shares the root node with this worker during the
    // 'init' call above. That call returns the ID of the root node, which
    // we can use to retrieve it from the shared object store.
    const rootNode = this.threadx.getSharedObjectById(rootNodeId);
    assertTruthy(
      rootNode instanceof ThreadXMainNode,
      'Unexpected root node type',
    );
    this.root = rootNode;
  }

  getRootNode(): INode {
    assertTruthy(this.root, 'Driver not initialized');
    return this.root;
  }

  createNode(props: Partial<INodeWritableProps> = {}): INode {
    const bufferStruct = new NodeStruct();
    bufferStruct.x = props.x || 0;
    bufferStruct.y = props.y || 0;
    bufferStruct.w = props.w || 0;
    bufferStruct.h = props.h || 0;
    bufferStruct.parentId = props.parent ? props.parent.id : 0;
    bufferStruct.color = props.color || 0xffffffff;
    bufferStruct.alpha = props.alpha || 1;
    bufferStruct.src = props.src || '';
    const node = new ThreadXMainNode(bufferStruct);
    node.once('beforeDestroy', this.onBeforeDestroyNode.bind(this, node));
    this.threadx.shareObjects('renderer', [node]).catch(console.error);
    this.onCreateNode(node);
    return node;
  }

  // TODO: Remove?
  destroyNode(node: INode): void {
    node.destroy();
  }

  onCreateNode(node: INode): void {
    return;
  }

  onBeforeDestroyNode(node: INode): void {
    return;
  }
}
