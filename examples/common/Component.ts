import type {
  INode,
  INodeWritableProps,
  RendererMain,
} from '@lightningjs/renderer';

export class Component {
  readonly node: INode;

  constructor(
    readonly renderer: RendererMain,
    nodeProps: Partial<INodeWritableProps>,
  ) {
    this.node = renderer.createNode({
      ...nodeProps,
    });
  }

  get x() {
    return this.node.x;
  }

  set x(x: number) {
    this.node.x = x;
  }

  get y() {
    return this.node.y;
  }

  set y(y: number) {
    this.node.y = y;
  }

  get width() {
    return this.node.width;
  }

  set width(width: number) {
    this.node.width = width;
  }

  get height() {
    return this.node.height;
  }

  set height(height: number) {
    this.node.height = height;
  }
}
