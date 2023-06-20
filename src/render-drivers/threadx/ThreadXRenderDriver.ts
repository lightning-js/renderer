import { ThreadX, BufferStruct } from '@lightningjs/threadx';
import type { INode, INodeWritableProps } from '../../main-api/INode.js';
import { NodeStruct } from './NodeStruct.js';
import type { IRenderDriver } from '../../main-api/IRenderDriver.js';
import { ThreadXMainNode } from './ThreadXMainNode.js';
import { assertTruthy } from '../../utils.js';
import type {
  RendererMain,
  RendererMainSettings,
} from '../../main-api/RendererMain.js';
import type {
  ThreadXRendererInitMessage,
  ThreadXRendererReleaseTextureMessage,
} from './ThreadXRendererMessage.js';

export interface ThreadXRendererSettings {
  RendererWorker: new () => Worker;
}

export class ThreadXRenderDriver implements IRenderDriver {
  private settings: ThreadXRendererSettings;
  private threadx: ThreadX;
  private rendererMain: RendererMain | null = null;
  private root: INode | null = null;

  constructor(settings: ThreadXRendererSettings) {
    this.settings = settings;
    this.threadx = ThreadX.init({
      workerId: 1,
      workerName: 'main',
      sharedObjectFactory: (buffer) => {
        const typeId = BufferStruct.extractTypeId(buffer);
        if (typeId === NodeStruct.typeId) {
          const nodeStruct = new NodeStruct(buffer);
          const rendererMain = this.rendererMain;
          assertTruthy(rendererMain);
          return nodeStruct.lock(() => {
            return new ThreadXMainNode(rendererMain, nodeStruct);
          });
        }
        return null;
      },
    });
    this.threadx.registerWorker('renderer', new this.settings.RendererWorker());
  }

  async init(
    rendererMain: RendererMain,
    rendererSettings: Required<RendererMainSettings>,
    canvas: HTMLCanvasElement,
  ): Promise<void> {
    this.rendererMain = rendererMain;
    const offscreenCanvas = canvas.transferControlToOffscreen();
    const rootNodeId = (await this.threadx.sendMessageAsync(
      'renderer',
      {
        type: 'init',
        canvas: offscreenCanvas,
        deviceLogicalPixelRatio: rendererSettings.deviceLogicalPixelRatio,
        devicePhysicalPixelRatio: rendererSettings.devicePhysicalPixelRatio,
      } satisfies ThreadXRendererInitMessage,
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
    const rendererMain = this.rendererMain;
    assertTruthy(rendererMain);
    const bufferStruct = new NodeStruct();
    bufferStruct.x = props.x || 0;
    bufferStruct.y = props.y || 0;
    bufferStruct.w = props.w || 0;
    bufferStruct.h = props.h || 0;
    bufferStruct.parentId = props.parent ? props.parent.id : 0;
    bufferStruct.color = props.color ?? 0xffffffff;
    bufferStruct.alpha = props.alpha ?? 1;
    const node = new ThreadXMainNode(rendererMain, bufferStruct);
    node.once('beforeDestroy', this.onBeforeDestroyNode.bind(this, node));
    this.threadx.shareObjects('renderer', [node]).catch(console.error);
    node.texture = props.texture || null;
    node.src = props.src || '';
    this.onCreateNode(node);
    return node;
  }

  // TODO: Remove?
  destroyNode(node: INode): void {
    node.destroy();
  }

  releaseTexture(textureDescId: number): void {
    this.threadx.sendMessage('renderer', {
      type: 'releaseTexture',
      textureDescId,
    } satisfies ThreadXRendererReleaseTextureMessage);
  }

  onCreateNode(node: INode): void {
    return;
  }

  onBeforeDestroyNode(node: INode): void {
    return;
  }
}
