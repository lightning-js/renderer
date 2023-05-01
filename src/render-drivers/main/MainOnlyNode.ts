import type { IEventEmitter } from '../../__threadx/IEventEmitter.js';
import { assertTruthy } from '../../__threadx/utils.js';
import type { INodeWritableProps } from '../../core/INode.js';
import type { IRenderableNode } from '../../core/IRenderableNode.js';
import { createWhitePixelTexture } from '../../core/gpu/webgl/texture.js';
import type { Stage } from '../../core/stage.js';

let nextId = 1;

export class MainOnlyNode implements IRenderableNode, IEventEmitter {
  readonly typeId;
  readonly id;
  private props: INodeWritableProps;

  constructor(private stage: Stage) {
    this.typeId = 0; // Irrelevant for main-only nodes
    this.id = nextId++;
    this.props = {
      x: 0,
      y: 0,
      w: 0,
      h: 0,
      alpha: 1,
      color: 0,
      parent: null,
      zIndex: 0,
      text: '',
      src: '',
    };
    const gl = this.stage.getGlContext();
    assertTruthy(gl);
    const texture = createWhitePixelTexture(gl);
    assertTruthy(texture);
    this.texture = texture;
  }

  texture: WebGLTexture;
  getTranslate(): [number, number, number] {
    throw new Error('Method not implemented.');
  }

  get x(): number {
    return this.props.x;
  }

  set x(value: number) {
    this.props.x = value;
  }

  get y(): number {
    return this.props.y;
  }

  set y(value: number) {
    this.props.y = value;
  }

  get w(): number {
    return this.props.w;
  }

  set w(value: number) {
    this.props.w = value;
  }

  get h(): number {
    return this.props.h;
  }

  set h(value: number) {
    this.props.h = value;
  }

  get alpha(): number {
    return this.props.alpha;
  }

  set alpha(value: number) {
    this.props.alpha = value;
  }

  get color(): number {
    return this.props.color;
  }

  set color(value: number) {
    this.props.color = value;
  }

  // private _parent: IRenderableNode | null = null;

  // get parent(): IRenderableNode | null {
  //   return this._parent;
  // }

  // set parent(value: IRenderableNode | null) {
  //   assertTruthy(
  //     value instanceof MainOnlyNode,
  //     'parent must be a MainOnlyNode',
  //   );
  //   this._parent = value;
  // }

  private _parent: MainOnlyNode | null = null;

  get parent(): MainOnlyNode | null {
    return this._parent;
  }

  set parent(newParent: MainOnlyNode | null) {
    const oldParent = this._parent;
    this._parent = newParent;
    if (oldParent) {
      const index = oldParent.children.indexOf(this);
      assertTruthy(
        index !== -1,
        "MainOnlyNode.parent: Node not found in old parent's children!",
      );
      oldParent.children.splice(index, 1);
    }
    if (newParent) {
      newParent.children.push(this);
    }
  }

  protected _children: MainOnlyNode[] = [];

  get children(): MainOnlyNode[] {
    return this._children;
  }

  get zIndex(): number {
    return this.props.zIndex;
  }

  set zIndex(value: number) {
    this.props.zIndex = value;
  }

  get text(): string {
    return this.props.text;
  }

  set text(value: string) {
    this.props.text = value;
  }

  get src(): string {
    return this.props.src;
  }

  set src(value: string) {
    this.props.src = value;
  }

  imageBitmap: ImageBitmap | null = null;

  private async loadImage(imageURL: string): Promise<void> {
    // Load image from src url
    const response = await fetch(imageURL);

    // Once the file has been fetched, we'll convert it to a `Blob`
    const blob = await response.blob();

    const imageBitmap = await createImageBitmap(blob, {
      premultiplyAlpha: 'none',
      colorSpaceConversion: 'none',
    });
    this.imageBitmap = imageBitmap;
    this.emit('imageLoaded', { src: imageURL });
  }

  flush(): void {
    // No-op
  }

  //#region EventEmitter
  private eventListeners: { [eventName: string]: any } = {};

  on(event: string, listener: (target: any, data: any) => void): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    let listeners = this.eventListeners[event];
    if (!listeners) {
      listeners = [];
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    listeners.push(listener);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.eventListeners[event] = listeners;
  }

  off(event: string, listener: (target: any, data: any) => void): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const listeners = this.eventListeners[event];
    if (!listeners) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const index = listeners.indexOf(listener);
    if (index >= 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      listeners.splice(index, 1);
    }
  }

  once(event: string, listener: (target: any, data: any) => void): void {
    const onceListener = (target: any, data: any) => {
      this.off(event, onceListener);
      listener(target, data);
    };
    this.on(event, onceListener);
  }

  emit(event: string, data: Record<string, unknown>): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const listeners = this.eventListeners[event];
    if (!listeners) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    [...listeners].forEach((listener) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      listener(this, data);
    });
  }
  //#endregion EventEmitter
}
