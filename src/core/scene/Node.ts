import { mat4, vec3 } from '../lib/glm/index.js';
import { getTexture } from '../gpu/webgl/textureManager.js';
import { normalizeARGB, type RGBA } from '../lib/utils.js';

let nodeId = 0;
const nodes: Map<number, Node> = new Map();

export interface NodeConfig {
  x: number;
  y: number;
  w: number;
  h: number;
  color: number;
  events: unknown;
  elementId: number;
  src: string | null;
}

class Node {
  private _localMatrix;
  private _worldMatrix;
  private _children: Node[] = [];
  private _parent: Node | null = null;
  private _x: number;
  private _y: number;
  private _w: number;
  private _h: number;
  private _localAlpha = 1;
  private _worldAlpha = 1;
  private _color: RGBA = [0, 0, 0, 1];
  private _texture: any = null;
  private _rotation = 0;
  private _scale = 1;
  private _hasUpdates = false;
  private _matrixDirty = false;
  private _events: unknown;
  private _id: number;
  private _elementId: number;
  private _src: string | null = null;
  private _imageBitmap: string | ImageBitmap | null = null;

  constructor(config: Partial<NodeConfig> = {}) {
    this._localMatrix = mat4.create();
    this._worldMatrix = mat4.create();
    this._x = config.x ?? 0;
    this._y = config.y ?? 0;
    this._w = config.w ?? 0;
    this._h = config.h ?? 0;
    this.color = config.color ?? 0xffffffff;

    this._events = config.events;
    this._id = ++nodeId;
    this._elementId = config.elementId ?? 0;

    if (config.src) {
      this.src = config.src;
    } else {
      this.rect = true;
    }
    this.updateTranslate();
    nodes.set(this._elementId, this);
  }

  get parent() {
    return this._parent;
  }

  set parent(p) {
    // detach node from current parent
    if (this.parent) {
      const idx = this.parent.children.indexOf(this);
      if (idx !== -1) {
        this.parent.children.splice(idx, 1);
      }
    }

    if (p) {
      p.children.push(this);
      this._onParentChange(p);
    }

    this._parent = p;
  }

  add(n: Node) {
    n.parent = this;
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
      c.updateWorldMatrix(world);
    });
  }

  _onParentChange(parent: Node) {
    this.updateWorldMatrix(parent.worldMatrix);
  }

  updateTranslate() {
    mat4.fromTranslation(
      this._localMatrix,
      vec3.fromValues(this._x, this._y, 1),
    );
    if (this._parent) {
      this.updateWorldMatrix(this._parent.worldMatrix);
    }
  }

  updateRotation(v: number) {
    mat4.rotate(this._localMatrix, this._localMatrix, v, [0, 0, 1]);
    this.updateTranslate();
  }

  getTranslate() {
    return mat4.getTranslation(vec3.create(), this._worldMatrix);
  }

  find(elementId: number) {
    if (nodes.has(elementId)) {
      return nodes.get(elementId);
    }
  }

  get children() {
    return this._children;
  }

  set alpha(v) {
    this._localAlpha = v / 100;
  }

  get alpha() {
    return this._localAlpha;
  }

  set src(imageSource: string) {
    this._src = imageSource;
    getTexture({
      type: 'image',
      id: imageSource,
      src: imageSource,
    })
      .then((texture) => {
        this._texture = texture;
      })
      .catch((e) => {
        // TOOD: Handle this error better
        console.log(e);
      });
  }

  set imageBitmap(source: string | ImageBitmap) {
    this._imageBitmap = source;
    getTexture({
      type: 'imageBitmap',
      id: `id_${this._elementId}_${~~(Math.random() * 200) + 1}`,
      src: source,
    })
      .then((texture) => {
        this._texture = texture;
      })
      .catch((e) => {
        // TOOD: Handle this error better
        console.log(e);
      });
  }

  set rect(v: boolean) {
    getTexture({
      type: 'rectangle',
      id: 'rectangle',
    })
      .then((texture) => {
        this._texture = texture;
      })
      .catch((e) => {
        // TOOD: Handle this error better
        console.log(e);
      });
  }

  get x() {
    return this._x;
  }

  set x(v) {
    this._x = v;
    this.updateTranslate();
  }

  get y() {
    return this._y;
  }

  set y(v) {
    this._y = v;
    this.updateTranslate();
  }

  get w() {
    return this._w;
  }

  set w(v) {
    this._w = v;
  }

  get h() {
    return this._h;
  }

  set h(v) {
    this._h = v;
  }

  get color(): RGBA {
    return this._color;
  }

  set color(v: number | RGBA) {
    if (typeof v === 'number') {
      v = 0xffffffff + v + 1;
      this._color = normalizeARGB(v);
    } else {
      this._color = v;
    }
  }

  set rotation(v: number) {
    this.updateRotation(v);
  }

  get worldMatrix() {
    return this._worldMatrix;
  }

  get localMatrix() {
    return this._localMatrix;
  }

  get id() {
    return this._id;
  }

  get elementId() {
    return this._elementId;
  }

  set elementId(v) {
    //
  }

  get texture() {
    return this._texture;
  }

  /**
   * Update children
   * @param dt - Delta time
   */
  public update(dt: number): void {
    for (const child of this.children) {
      child.update(dt);
    }
  }

  /**
   * Render the node
   */
  public render(ctx: WebGLRenderingContext): void {
    this._render(ctx);

    for (const child of this.children) {
      child.render(ctx);
    }
  }

  /**
   * Render the node
   * @param ctx
   */
  protected _render(ctx: WebGLRenderingContext): void {
    // render the node
  }
}

export default (config: Partial<NodeConfig>) => {
  return new Node(config);
};

// Export only the type since we don't want to expose the class constructor directly (I think -Frank)
export type { Node };
