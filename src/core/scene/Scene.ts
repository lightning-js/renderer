import createNode, { type Node, type NodeConfig } from './Node.js';

export type NodeTypes = Node;

export class Scene {
  /**
   * Root node of the scene
   *
   * @type {Node}
   * @memberof Scene
   */
  public root: Node;

  constructor() {
    this.root = createNode({});
  }

  /**
   * Get all nodes of a specific type
   * @param type
   * @returns
   */
  public getNodeByType(type: string): Node[] {
    return [];
  }

  /**
   * Find a node by id
   * @param id
   * @returns
   */
  public getNodeById(id: string): Node | null {
    return null;
  }

  /**
   * Create a new node
   * @param parent
   * @returns
   */
  public createNode(settings: Partial<NodeConfig> = {}): NodeTypes {
    return createNode(settings);
  }

  /**
   * create a new RectangleNode
   * @param w
   * @param h
   * @param parent
   * @returns
   */
  public rectangle(w: number, h: number, parent: NodeTypes | null = null) {
    // TODO: Fix this
    // return this.create(new RectangleNode(w, h), parent);
  }

  /**
   * Create a new CircleNode
   * @param r
   * @param parent
   * @returns
   */
  public circle(r: number, parent: NodeTypes | null = null) {
    // TODO: Fix this
    // return this.create(new CircleNode(r), parent);
  }

  /**
   * Create a new TextNode
   * @param text
   * @param parent
   * @returns
   */
  public text(text = '', parent: NodeTypes | null = null) {
    // TODO: Fix this
    // return this.create(new TextNode(text), parent);
  }

  /**
   * Setup and attaching Node
   * @param node
   * @param parent
   * @returns
   */
  private create(node: NodeTypes, parent: NodeTypes | null = null): NodeTypes {
    if (!parent) {
      parent = this.root;
    }

    node.parent = parent;
    return node;
  }

  /**
   * Update the scene
   * @param delta
   */
  public update(delta: number) {
    this.root.update(delta);
  }

  /**
   * Render the scene
   * @param ctx
   */
  public render(ctx: WebGLRenderingContext | WebGL2RenderingContext) {
    this.root.render(ctx);
  }
}
