import type { IEventEmitter } from '@lightningjs/threadx';
import type { INode, INodeAnimatableProps } from '../../main-api/INode.js';
import type { Stage } from '../../core/stage.js';
import { assertTruthy } from '../../utils.js';
import type { IAnimationController } from '../../core/IAnimationController.js';
import { CoreAnimation } from '../../core/animations/CoreAnimation.js';
import { CoreAnimationController } from '../../core/animations/CoreAnimationController.js';
import { CoreNode } from '../../core/CoreNode.js';
import type { TextureDesc } from '../../main-api/RendererMain.js';

let nextId = 1;

export class MainOnlyNode implements IEventEmitter, INode {
  readonly id;
  private coreNode: CoreNode;

  // Prop stores
  protected _children: MainOnlyNode[] = [];
  protected _src = '';
  protected _text = '';
  protected _parent: MainOnlyNode | null = null;
  protected _texture: TextureDesc | null = null;

  constructor(private stage: Stage, coreNode?: CoreNode) {
    this.id = nextId++;
    this.coreNode =
      coreNode ||
      new CoreNode(this.stage, {
        id: this.id,
      });
  }

  get x(): number {
    return this.coreNode.x;
  }

  set x(value: number) {
    this.coreNode.x = value;
  }

  get y(): number {
    return this.coreNode.y;
  }

  set y(value: number) {
    this.coreNode.y = value;
  }

  get w(): number {
    return this.coreNode.w;
  }

  set w(value: number) {
    this.coreNode.w = value;
  }

  get h(): number {
    return this.coreNode.h;
  }

  set h(value: number) {
    this.coreNode.h = value;
  }

  get alpha(): number {
    return this.coreNode.alpha;
  }

  set alpha(value: number) {
    this.coreNode.alpha = value;
  }

  get color(): number {
    return this.coreNode.color;
  }

  set color(value: number) {
    this.coreNode.color = value;
  }

  get parent(): MainOnlyNode | null {
    return this._parent;
  }

  set parent(newParent: MainOnlyNode | null) {
    const oldParent = this._parent;
    this._parent = newParent;
    this.coreNode.parent = newParent?.coreNode ?? null;
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

  get children(): MainOnlyNode[] {
    return this._children;
  }

  get zIndex(): number {
    return this.coreNode.zIndex;
  }

  set zIndex(value: number) {
    this.coreNode.zIndex = value;
  }

  get text(): string {
    return this._text;
  }

  set text(value: string) {
    this._text = value;
  }

  get src(): string {
    return this._src;
  }

  set src(imageUrl: string) {
    if (this._src === imageUrl) {
      return;
    }
    this._src = imageUrl;
    this.loadImage(imageUrl).catch(console.error);
  }

  get texture(): TextureDesc | null {
    return this._texture;
  }

  set texture(texture: TextureDesc | null) {
    this._texture = texture;
    if (!texture) {
      return;
    }
    // TODO: Check for texture type validity
    this.coreNode.loadTexture(texture.txType, texture.props, texture.options);
  }

  private async loadImage(imageUrl: string): Promise<void> {
    this.coreNode.loadTexture('ImageTexture', {
      src: imageUrl,
    });
    this.emit('imageLoaded', { src: imageUrl });
  }

  destroy(): void {
    this.emit('beforeDestroy', {});
    this.parent = null;
    this.emit('afterDestroy', {});
    this.eventListeners = {};
  }

  flush(): void {
    // No-op
  }

  animate(
    props: Partial<INodeAnimatableProps>,
    duration: number,
  ): IAnimationController {
    const animation = new CoreAnimation(this.coreNode, props, duration);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const controller = new CoreAnimationController(
      this.stage.getAnimationManager(),
      animation,
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return controller;
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
