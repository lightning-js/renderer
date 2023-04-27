import type { IEventEmitter } from '../../__threadx/IEventEmitter.js';
import { assertTruthy } from '../../__threadx/utils.js';
import type { IRenderableNode } from '../../core/IRenderableNode.js';
import { getArgbNumber } from '../../core/lib/utils.js';
import type { Node } from '../../core/node.js';

export class MainOnlyNode implements IRenderableNode, IEventEmitter {
  readonly typeId;
  readonly id;

  constructor(private legacyNode: Node) {
    this.typeId = 0; // Irrelevant for main-only nodes
    this.id = legacyNode.id;
  }

  get x(): number {
    return this.legacyNode.x;
  }

  set x(value: number) {
    this.legacyNode.x = value;
  }

  get y(): number {
    return this.legacyNode.y;
  }

  set y(value: number) {
    this.legacyNode.y = value;
  }

  get w(): number {
    return this.legacyNode.w;
  }

  set w(value: number) {
    this.legacyNode.w = value;
  }

  get h(): number {
    return this.legacyNode.h;
  }

  set h(value: number) {
    this.legacyNode.h = value;
  }

  get color(): number {
    return getArgbNumber(this.legacyNode.color);
  }

  set color(value: number) {
    this.legacyNode.color = value;
  }

  private _parent: IRenderableNode | null = null;

  get parent(): IRenderableNode | null {
    return this._parent;
  }

  set parent(value: IRenderableNode | null) {
    assertTruthy(
      value instanceof MainOnlyNode,
      'parent must be a MainOnlyNode',
    );
    this.legacyNode.parent = value.legacyNode;
    this.parent = value;
  }

  get zIndex(): number {
    // TODO: Implement
    return 0;
    // return this.legacyNode.zIndex;
  }

  set zIndex(value: number) {
    // TODO: Implement
    // this.legacyNode. = value;
  }

  get text(): string {
    // TODO: Implement
    return '';
    // return this.legacyNode.text;
  }

  set text(value: string) {
    // TODO: Implement
    // this.legacyNode.text = value;
  }

  get src(): string {
    return this.legacyNode.src;
  }

  set src(value: string) {
    this.legacyNode.src = value;
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
