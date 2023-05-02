import threadx from '@lightningjs/threadx';
import application, { type Application } from '../core/application.js';
import createNode, { type Node } from '../core/scene/Node.js';
import { SpecialElementId } from '../main-api/SpecialElementId.js';
import { createWebGLContext } from '../utils.js';
import type { RenderProps } from '../renderProperties.js';

let canvas = null;
let gl = null;
let app: Application | null = null;
const nodes: Map<number, Node> = new Map();

self.addEventListener('message', ({ data: { event, payload } }) => {
  if (event === 'canvas') {
    canvas = payload.offscreenCanvas;
    gl = createWebGLContext(canvas);
    if (!gl) {
      throw new Error('WebGL context is not available');
    }
    const rootElementId = SpecialElementId.Root;
    app = application({
      elementId: rootElementId,
      w: 1920,
      h: 1080,
      context: gl,
    });
    nodes.set(rootElementId, app.root!);
    ready();
  } else if (event === 'destroy') {
    const node = nodes.get(payload.elementId);
    if (node) {
      // Detach from parent and remove from nodes list
      node.parent = null;
      nodes.delete(payload.elementId);
    }
  }
});

const ready = () => {
  const mutationsQueue: Record<number, RenderProps[]> = {};

  threadx.listen('mutations', (data: RenderProps[]) => {
    data &&
      data.forEach((el) => {
        const node = nodes.get(el.elementId);
        if (node) {
          const keys = Object.keys(el);
          keys.forEach((key) => {
            if (key === 'parentId' && el[key] !== 0) {
              const parent = nodes.get(el[key]);
              if (parent) {
                node.parent = parent;
              } else {
                node.parent = null;
              }
            } else if (el[key as keyof RenderProps] !== 0) {
              // @ts-expect-error Ask TS to trust us on this assignment
              node[key as keyof RenderProps] = el[key as keyof RenderProps];
            }
          });
        } else {
          mutationsQueue[el.elementId] = mutationsQueue[el.elementId] || [];
          mutationsQueue[el.elementId]!.push(el);
        }
      });
  });

  const imagesQueue: Record<number, any> = {};

  threadx.listen('images', (el: any) => {
    const node = nodes.get(el.id);

    if (node && el.text) {
      node.src = el.text;
    } else {
      imagesQueue[el.id] = imagesQueue[el.id] || [];
      imagesQueue[el.id].push(el);
    }
  });

  threadx.listen('bolt', (data: RenderProps[]) => {
    data &&
      data.forEach((el) => {
        const { elementId, parentId } = el;
        const node = createNode(el);
        const elMutationQueue = mutationsQueue[elementId];
        if (elMutationQueue) {
          elMutationQueue.forEach((el) => {
            const keys = Object.keys(el);
            keys.forEach((key) => {
              if (el[key as keyof RenderProps] !== 0 && key !== 'elementId') {
                // @ts-expect-error Ask TS to trust us on this assignment
                node[key] = el[key as keyof RenderProps];
              }
            });
          });
          delete mutationsQueue[elementId];
        }

        if (imagesQueue[elementId]) {
          imagesQueue[elementId].forEach((el: { text: string }) => {
            node.src = el.text;
          });
          delete imagesQueue[elementId];
        }

        if (nodes.has(parentId)) {
          node.parent = nodes.get(parentId) ?? null;
        }
        // look up
        nodes.set(elementId, node);
      });
  });

  globalThis.postMessage({ event: 'ready' });
};
