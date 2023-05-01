import { BufferStruct } from '../../__threadx/BufferStruct.js';
import { ThreadX } from '../../__threadx/ThreadX.js';
import { assertTruthy } from '../../__threadx/utils.js';
import type { INode, INodeWritableProps } from '../../core/INode.js';
import { NodeStruct } from './NodeStruct.js';
import type { IRenderDriver } from '../../main-api/IRenderDriver.js';
import { MainNode } from './MainNode.js';

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
      threadId: 1,
      threadName: 'main',
      sharedObjectFactory(buffer) {
        const typeId = BufferStruct.extractTypeId(buffer);
        if (typeId === NodeStruct.typeId) {
          const nodeStruct = new NodeStruct(buffer);
          return nodeStruct.lock(() => {
            return new MainNode(nodeStruct);
          });
        }
        return null;
      },
    });
    this.threadx.registerWorker('renderer', new this.settings.RendererWorker());
  }

  async init(canvas: HTMLCanvasElement): Promise<void> {
    const offscreenCanvas = canvas.transferControlToOffscreen();
    await this.threadx.sendMessageAsync(
      'renderer',
      {
        type: 'init',
        canvas: offscreenCanvas,
      },
      [offscreenCanvas],
    );
    this.root = this.createNode();
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
    bufferStruct.parentId = props.parent ? props.parent.id : this.root?.id || 0;
    bufferStruct.color = props.color || 0xff00ffff;
    bufferStruct.alpha = props.alpha || 1;
    const node = new MainNode(bufferStruct);
    this.threadx.shareObjects('renderer', [node]).catch(console.error);
    this.onCreateNode(node);
    return node;
  }

  destroyNode(node: INode): void {
    assertTruthy(node instanceof MainNode, 'Expected node to be a MainNode');
    this.onDestroyNode(node);
    this.threadx.forgetObjects([node]).catch(console.error);
    node.destroy();
  }

  onCreateNode(node: INode): void {
    return;
  }

  onDestroyNode(node: INode): void {
    return;
  }
}
