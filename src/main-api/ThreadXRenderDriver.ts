import { BufferStruct } from '../__threadx/BufferStruct.js';
import { ThreadX } from '../__threadx/ThreadX.js';
import { NodeBufferStruct } from '../core/NodeBufferStruct.js';
import type { IRenderDriver } from './IRenderDriver.js';
import { MainNode } from './MainNode.js';

export interface ThreadXRendererSettings {
  RendererWorker: new () => Worker;
}

export class ThreadXRenderDriver implements IRenderDriver {
  private settings: ThreadXRendererSettings;
  private threadx: ThreadX;

  constructor(settings: ThreadXRendererSettings) {
    this.settings = settings;
    this.threadx = ThreadX.init({
      threadId: 1,
      threadName: 'main',
      sharedObjectFactory(buffer) {
        const typeId = BufferStruct.extractTypeId(buffer);
        if (typeId === NodeBufferStruct.typeId) {
          const nodeStruct = new NodeBufferStruct(buffer);
          return nodeStruct.lock(() => {
            return new MainNode(nodeStruct);
          });
        }
        return null;
      },
    });
    this.threadx.registerThread('renderer', new this.settings.RendererWorker());
  }

  async init(canvas: HTMLCanvasElement): Promise<void> {
    const offscreenCanvas = canvas.transferControlToOffscreen();
    const rootNode = new MainNode(new NodeBufferStruct());
    await this.threadx.sendMessageAsync(
      'renderer',
      {
        type: 'init',
        canvas: offscreenCanvas,
        rootNodeId: rootNode.id,
      },
      [offscreenCanvas],
    );
    this.createPrimitiveRaw(rootNode);
  }

  createPrimitiveRaw(primitive: MainNode): void {
    this.threadx.shareObjects('renderer', [primitive]).catch(console.error);
    this.onCreatePrimitive(primitive);
  }

  mutatePrimitiveRaw(primitive: MainNode, mutations: Partial<any>): void {
    // Obsolete?
  }

  destroyPrimitiveRaw(primitive: MainNode): void {
    this.onDestroyPrimitive(primitive);
    this.threadx.forgetObjects('renderer', [primitive]).catch(console.error);
    primitive.destroy();
  }

  onCreatePrimitive(primitive: MainNode): void {
    return;
  }
  onDestroyPrimitive(primitive: MainNode): void {
    return;
  }
}
