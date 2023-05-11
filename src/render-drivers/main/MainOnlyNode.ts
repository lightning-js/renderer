import type { IEventEmitter } from '@lightningjs/threadx';
import type { INodeWritableProps } from '../../core/INode.js';
import type { IRenderableNode } from '../../core/IRenderableNode.js';
import { createWhitePixelTexture } from '../../core/gpu/webgl/texture.js';
import { getTexture } from '../../core/gpu/webgl/textureManager.js';
import { mat4, vec3 } from '../../core/lib/glm/index.js';
import type { Stage } from '../../core/stage.js';
import { assertTruthy } from '../../utils.js';

let nextId = 1;

export class MainOnlyNode implements IRenderableNode, IEventEmitter {
  private _localMatrix = mat4.create();
  private _worldMatrix = mat4.create();
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

    this.stage
      .ready()
      .then(() => {
        const gl = this.stage.getGlContext();
        assertTruthy(gl);
        const texture = createWhitePixelTexture(gl);
        assertTruthy(texture);
        this.texture = texture;
      })
      .catch(console.error);

    this.updateTranslate();
  }

  texture: WebGLTexture | null = null;

  getTranslate(): vec3.Vec3 {
    return mat4.getTranslation(vec3.create(), this._worldMatrix);
  }

  get x(): number {
    return this.props.x;
  }

  set x(value: number) {
    this.props.x = value;
    this.updateTranslate();
  }

  get y(): number {
    return this.props.y;
  }

  set y(value: number) {
    this.props.y = value;
    this.updateTranslate();
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
    this.updateTranslate();
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

  set src(imageUrl: string) {
    this.props.src = imageUrl;
    this.loadImage(imageUrl).catch(console.error);
  }

  private async loadImage(imageUrl: string): Promise<void> {
    getTexture({
      type: 'image',
      id: imageUrl,
      src: imageUrl,
    })
      .then((texture: WebGLTexture | null) => {
        this.texture = texture;
      })
      .catch(console.error);
    this.emit('imageLoaded', { src: imageUrl });
  }

  updateWorldMatrix(pwMatrix: any) {
    if (pwMatrix) {
      // if parent world matrix is provided
      // we multiply times local matrix
      mat4.multiply(this._worldMatrix, pwMatrix, this._localMatrix);
    } else {
      mat4.copy(this._worldMatrix, this._localMatrix);
    }

    const world = this._worldMatrix;

    this.children.forEach((c) => {
      const rendererNode = c;
      rendererNode.updateWorldMatrix(world);
    });
  }

  _onParentChange(parent: MainOnlyNode) {
    this.updateWorldMatrix(parent._worldMatrix);
  }

  updateTranslate() {
    mat4.fromTranslation(this._localMatrix, vec3.fromValues(this.x, this.y, 1));
    if (this.parent) {
      this.updateWorldMatrix(this.parent._worldMatrix);
    }
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

  update(delta: number): void {
    // TODO: implement
  }

  render(ctx: WebGLRenderingContext | WebGL2RenderingContext): void {
    // TODO: implement
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
