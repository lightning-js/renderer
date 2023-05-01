import { ThreadX } from '../../../__threadx/ThreadX.js';
import application, { type Application } from '../../../core/application.js';
import { createWebGLContext } from '../../../utils.js';
import { NodeStruct } from '../NodeStruct.js';
import { BufferStruct } from '../../../__threadx/BufferStruct.js';
import { ThreadXRendererNode } from './ThreadXRendererNode.js';
import type { IRenderableNode } from '../../../core/IRenderableNode.js';
import stage from '../../../core/stage.js';

let gl: WebGLRenderingContext | null = null;
let app: Application | null = null;
let rootNode: IRenderableNode | null = null;
ThreadX.init({
  threadId: 2,
  threadName: 'renderer',
  sharedObjectFactory(buffer) {
    const typeId = BufferStruct.extractTypeId(buffer);
    if (typeId === NodeStruct.typeId) {
      const nodeStruct = new NodeStruct(buffer);
      nodeStruct.parentId = nodeStruct.parentId || rootNode?.id || 0;
      const node = nodeStruct.lock(() => {
        return new ThreadXRendererNode(stage, nodeStruct);
      });
      if (gl && rootNode === null) {
        app = application({
          rootNode: node,
          w: 1920,
          h: 1080,
          context: gl,
        });
        rootNode = node;
      }
      return node;
    }
    return null;
  },
  async onMessage(message) {
    if (message.type === 'init') {
      const canvas = message.canvas as OffscreenCanvas;
      // const rootNodeId = message.rootNodeId as number;
      gl = createWebGLContext(canvas);
      if (!gl) {
        throw new Error('WebGL context is not available');
      }
    }
  },
  onObjectShared(object) {
    // TBD
  },
  onBeforeSharedObjectForgotten(object) {
    if (object instanceof ThreadXRendererNode) {
      object.parent = null;
      object.destroy();
    }
  },
});
console.log('render worker');
