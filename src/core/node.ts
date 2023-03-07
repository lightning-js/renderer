import { mat4, vec3 } from './lib/glm/index.js';
import { getTexture } from './gpu/webgl/textureManager.js';
import { normalizeARGB } from './lib/utils.js';

const rnd = Math.random;

/**
 *
 * - init
 * - created
 * - updated
 * - active
 * - destroy
 * @param config
 * @return {*}
 */

let nodeId = 0;
let nodes = new Map();

class Node {
  private _localMatrix;
  private _worldMatrix;
  private _children: any = [];
  private _parent: any = null;
  private _x: any;
  private _y: any;
  private _w: any;
  private _h: any;
  private _localAlpha: any = 1;
  private _worldAlpha: any = 1;
  private _color: any;
  private _texture: any = null;
  private _rotation: any = 0;
  private _scale: any = 1;
  private _hasUpdates: any = false;
  private _matrixDirty: any = false;
  private _events: any;
  private _id: any;
  private _elementId: any;
  private _src: any;
  private _imageBitmap: any;

  constructor(
    config = {
      x: 0,
      y: 0,
      w: 0,
      h: 0,
      color: 0xffffffff,
      events: [],
      elementId: 0,
      src: null,
    },
  ) {
    this._localMatrix = mat4.create();
    this._worldMatrix = mat4.create();
    this._x = config.x;
    this._y = config.y;
    this._w = config.w;
    this._h = config.h;
    this.color = config.color || 0xffffffff;

    this._events = config.events;
    this._id = ++nodeId;
    this._elementId = config.elementId;

    if (config.src) {
      this.src = config.src;
    } else {
      this.rect = true;
    }
    this.updateTranslate();
    nodes.set(config.elementId, this);
  }

  get parent() {
    return this._parent;
  }

  set parent(p) {
    // detach node from current parent
    if (this.parent) {
      const idx = this.parent.children.indexOf(this);
      if (idx) {
        this.parent.children.splice(idx, 1);
      }
    }

    if (p) {
      p.children.push(this);
      this._onParentChange(p);
    }

    this._parent = p;
  }

  add(n) {
    n.parent = this;
  }

  updateWorldMatrix(pwMatrix) {
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

  _onParentChange(parent) {
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

  updateRotation(v) {
    mat4.rotateX(this._localMatrix, this._localMatrix, 0.4);
    mat4.rotateY(this._localMatrix, this._localMatrix, 0.9);
    this.updateTranslate();
  }

  getTranslate() {
    return mat4.getTranslation(vec3.create(), this._worldMatrix);
  }

  find(elementId) {
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

  set src(imageSource) {
    this._src = imageSource;
    getTexture({
      type: 'image',
      id: imageSource,
      src: imageSource,
    }).then((texture) => {
      this._texture = texture;
    });
  }

  set imageBitmap(source) {
    this._imageBitmap = source;
    getTexture({
      type: 'imageBitmap',
      id: `id_${this._elementId}_${~~(Math.random() * 200) + 1}`,
      src: source,
    }).then((texture) => {
      this._texture = texture;
    });
  }

  set rect(v) {
    getTexture({
      type: 'rectangle',
      id: 'rectangle',
    }).then((texture) => {
      this._texture = texture;
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

  get color() {
    return this._color;
  }

  set color(v) {
    (v = 0xffffffff + v + 1), (this._color = normalizeARGB(v));
  }

  set rotation(v) {
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
}

export default (config) => {
  return new Node(config);
};
