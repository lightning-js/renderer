import { ThreadX, BufferStruct } from '@lightningjs/threadx';
import application, { type Application } from '../../../core/application.js';
import { NodeStruct } from '../NodeStruct.js';
import { ThreadXRendererNode } from './ThreadXRendererNode.js';
import stage from '../../../core/stage.js';
import { assertTruthy } from '../../../utils.js';

let canvas: OffscreenCanvas | null = null;
let app: Application | null = null;
let rootNode: ThreadXRendererNode | null = null;
const threadx = ThreadX.init({
  workerId: 2,
  workerName: 'renderer',
  sharedObjectFactory(buffer) {
    const typeId = BufferStruct.extractTypeId(buffer);
    if (typeId === NodeStruct.typeId) {
      const nodeStruct = new NodeStruct(buffer);
      nodeStruct.parentId = nodeStruct.parentId || rootNode?.id || 0;
      const node = nodeStruct.lock(() => {
        return new ThreadXRendererNode(stage, nodeStruct);
      });
      return node;
    }
    return null;
  },
  async onMessage(message) {
    if (message.type === 'init') {
      canvas = message.canvas as OffscreenCanvas;
      const nodeStruct = new NodeStruct();
      app = application({
        rootId: nodeStruct.id,
        w: 1920,
        h: 1080,
        canvas,
        debug: {
          monitorTextureCache: true,
        },
      });
      // Share the root node that was created by the Stage with the main worker.
      const coreRootNode = app.root;
      assertTruthy(coreRootNode);
      rootNode = new ThreadXRendererNode(stage, nodeStruct, coreRootNode);
      await threadx.shareObjects('parent', [rootNode]);

      // Return its ID so the main worker can retrieve it from the shared object
      // store.
      return rootNode.id;
    } else if (message.type === 'releaseTexture') {
      assertTruthy(app);
      const txManager = app.stage.getTextureManager();
      assertTruthy(txManager);
      txManager.removeTextureIdFromCache(message.textureDescId as number);
    }
  },
  onObjectShared(object) {
    // TBD
  },
  onBeforeObjectForgotten(object) {
    if (object instanceof ThreadXRendererNode) {
      object.parent = null;
      object.destroy();
    }
  },
});
