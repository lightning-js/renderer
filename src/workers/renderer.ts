import { ThreadX } from '../__threadx/ThreadX.js';
import application, { type Application } from '../core/application.js';
import createNode, { type Node } from '../core/node.js';
import { createWebGLContext } from '../utils.js';
import { NodeBufferStruct } from '../core/NodeBufferStruct.js';
import { BufferStruct } from '../__threadx/BufferStruct.js';
import { RendererNode } from './RendererNode.js';

let gl = null;
let app: Application | null = null;
let rootNode: Node | null = null;
const legacyNodes: Map<number, Node> = new Map();
ThreadX.init({
  threadId: 2,
  threadName: 'renderer',
  sharedObjectFactory(buffer) {
    const typeId = BufferStruct.extractTypeId(buffer);
    if (typeId === NodeBufferStruct.typeId) {
      const nodeStruct = new NodeBufferStruct(buffer);
      let legacyNode: Node;
      if (nodeStruct.id === rootNode?.elementId) {
        legacyNode = rootNode;
      } else {
        nodeStruct.parentId = nodeStruct.parentId || rootNode?.elementId || 0;
        legacyNode = createNode(nodeStruct);
        const parent = legacyNodes.get(nodeStruct.parentId);
        if (parent) {
          legacyNode.parent = parent;
        }
      }
      legacyNodes.set(nodeStruct.id, legacyNode);
      return nodeStruct.lock(() => {
        return new RendererNode(nodeStruct, legacyNode);
      });
    }
    return null;
  },
  async onMessage(message) {
    if (message.type === 'init') {
      const canvas = message.canvas as OffscreenCanvas;
      const rootNodeId = message.rootNodeId as number;
      gl = createWebGLContext(canvas);
      if (!gl) {
        throw new Error('WebGL context is not available');
      }
      app = application({
        elementId: rootNodeId,
        w: 1920,
        h: 1080,
        context: gl,
      });
      rootNode = app.root!;
      legacyNodes.set(rootNodeId, rootNode);
    }
  },
  onObjectShared(object) {
    // if (object instanceof RendererNode) {
    //   const node = createNode(object);
    //   legacyNodes.set(object.id, node);
    // }
  },
  onObjectForgotten(object) {
    if (object instanceof RendererNode) {
      const node = legacyNodes.get(object.id);
      if (node) {
        // Detach from parent and remove from nodes list
        node.parent = null;
        legacyNodes.delete(object.id);
      }
    }
  },
});
console.log('render worker');
