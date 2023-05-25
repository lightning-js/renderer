import { ThreadX, BufferStruct } from '@lightningjs/threadx';
import application, { type Application } from '../../../core/application.js';
import { createWebGLContext } from '../../../utils.js';
import { NodeStruct } from '../NodeStruct.js';
import { ThreadXRendererNode } from './ThreadXRendererNode.js';
import type { IRenderableNode } from '../../../core/IRenderableNode.js';
import stage, { type Stage } from '../../../core/stage.js';

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
      app = application({
        createRootNode(stage: Stage) {
          const nodeStruct = new NodeStruct();
          return new ThreadXRendererNode(stage, nodeStruct);
        },
        w: 1920,
        h: 1080,
        canvas,
      });
      // Share the root node that was created by the Stage with the main worker.
      rootNode = app.root as ThreadXRendererNode;
      await threadx.shareObjects('parent', [rootNode]);

      // Return its ID so the main worker can retrieve it from the shared object
      // store.
      return rootNode.id;
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
