import application, { type Application } from '../core/application.js';
import { assert, createWebGLContext, loadImage } from '../utils.js';
import type { IRenderDriver } from './IRenderDriver.js';
import type { Primitive } from './Primitive.js';
import createNode, { type Node } from '../core/scene/Node.js';
import type { RenderProps } from '../renderProperties.js';
import { SpecialElementId } from './SpecialElementId.js';

export class MainRenderDriver implements IRenderDriver {
  private app: Application | undefined;
  private nodes: Map<number, Node> = new Map();

  async init(canvas: HTMLCanvasElement): Promise<void> {
    const gl = createWebGLContext(canvas);
    if (!gl) {
      throw new Error('Unable to create WebGL context');
    }
    const rootElementId = SpecialElementId.Root;
    this.app = application({
      elementId: rootElementId,
      w: 1920,
      h: 1080,
      context: gl,
    });
    assert(this.app.root);
    this.nodes.set(rootElementId, this.app.root);
  }

  createPrimitiveRaw(primitive: Primitive): void {
    const { elementId, parentId } = primitive.props;
    const { nodes } = this;
    const node = createNode(primitive.props);
    const parent = nodes.get(parentId);
    if (parent) {
      node.parent = parent;
    } else {
      node.parent = null;
    }
    nodes.set(elementId, node);
    this.onCreatePrimitive(primitive);
  }

  mutatePrimitiveRaw(
    primitive: Primitive,
    mutations: Partial<RenderProps>,
  ): void {
    const { nodes } = this;
    const props = primitive.props;
    const node = nodes.get(props.elementId);
    if (node) {
      const keys = Object.keys(mutations);
      keys.forEach((key) => {
        if (key === 'parentId') {
          const parent = nodes.get(props.parentId);
          if (parent) {
            node.parent = parent;
          } else {
            node.parent = null;
          }
        } else if (props[key as keyof RenderProps]) {
          // @ts-expect-error Ask TS to trust us on this assignment
          node[key] = props[key as keyof RenderProps];
        }
      });
    }
  }

  destroyPrimitiveRaw(primitive: Primitive): void {
    const { nodes } = this;
    const { elementId } = primitive.props;
    this.onDestroyPrimitive(primitive);
    const node = nodes.get(elementId);
    if (node) {
      // Detach from parent and remove from nodes list
      node.parent = null;
      nodes.delete(elementId);
    }
  }

  onCreatePrimitive(primitive: Primitive): void {
    return;
  }

  onDestroyPrimitive(primitive: Primitive): void {
    return;
  }
}
