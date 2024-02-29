/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2023 Comcast Cable Communications Management, LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type {
  CustomDataMap,
  INode,
  INodeAnimatableProps,
  INodeWritableProps,
} from '../../main-api/INode.js';
import type { Stage } from '../../core/Stage.js';
import { assertTruthy } from '../../utils.js';
import type { IAnimationController } from '../../common/IAnimationController.js';
import { CoreAnimation } from '../../core/animations/CoreAnimation.js';
import { CoreAnimationController } from '../../core/animations/CoreAnimationController.js';
import { CoreNode } from '../../core/CoreNode.js';
import type {
  RendererMain,
  ShaderRef,
  TextureRef,
} from '../../main-api/RendererMain.js';
import type { AnimationSettings } from '../../core/animations/CoreAnimation.js';
import { EventEmitter } from '../../common/EventEmitter.js';
import type {
  NodeLoadedEventHandler,
  NodeFailedEventHandler,
} from '../../common/CommonTypes.js';
import { santizeCustomDataMap } from '../utils.js';

let nextId = 1;

export function getNewId(): number {
  return nextId++;
}

export class MainOnlyNode extends EventEmitter implements INode {
  readonly id;
  protected coreNode: CoreNode;

  // Prop stores
  protected _children: MainOnlyNode[] = [];
  protected _src = '';
  protected _parent: MainOnlyNode | null = null;
  protected _texture: TextureRef | null = null;
  protected _shader: ShaderRef | null = null;
  protected _data: CustomDataMap | undefined = {};

  constructor(
    props: INodeWritableProps,
    private rendererMain: RendererMain,
    private stage: Stage,
    coreNode?: CoreNode,
  ) {
    super();
    this.id = coreNode?.id ?? getNewId();
    this.coreNode =
      coreNode ||
      new CoreNode(this.stage, {
        id: this.id,
        x: props.x,
        y: props.y,
        width: props.width,
        height: props.height,
        alpha: props.alpha,
        clipping: props.clipping,
        color: props.color,
        colorTop: props.colorTop,
        colorBottom: props.colorBottom,
        colorLeft: props.colorLeft,
        colorRight: props.colorRight,
        colorTl: props.colorTl,
        colorTr: props.colorTr,
        colorBl: props.colorBl,
        colorBr: props.colorBr,
        zIndex: props.zIndex,
        zIndexLocked: props.zIndexLocked,
        scaleX: props.scaleX,
        scaleY: props.scaleY,
        mountX: props.mountX,
        mountY: props.mountY,
        mount: props.mount,
        pivot: props.pivot,
        pivotX: props.pivotX,
        pivotY: props.pivotY,
        rotation: props.rotation,
        parent: null,
        shader: null,
        shaderProps: null,
        texture: null,
        textureOptions: null,
      });
    // Forward loaded/failed events
    this.coreNode.on('loaded', this.onTextureLoaded);
    this.coreNode.on('failed', this.onTextureFailed);

    // Assign properties to this object
    this.parent = props.parent as MainOnlyNode;
    this.shader = props.shader;
    this.texture = props.texture;
    this.src = props.src;
    this._data = props.data;
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

  get width(): number {
    return this.coreNode.width;
  }

  set width(value: number) {
    this.coreNode.width = value;
  }

  get height(): number {
    return this.coreNode.height;
  }

  set height(value: number) {
    this.coreNode.height = value;
  }

  get alpha(): number {
    return this.coreNode.alpha;
  }

  set alpha(value: number) {
    this.coreNode.alpha = value;
  }

  get clipping(): boolean {
    return this.coreNode.clipping;
  }

  set clipping(value: boolean) {
    this.coreNode.clipping = value;
  }

  get color(): number {
    return this.coreNode.color;
  }

  set color(value: number) {
    this.coreNode.color = value;
  }

  get colorTop(): number {
    return this.coreNode.colorTop;
  }

  set colorTop(value: number) {
    this.coreNode.colorTop = value;
  }

  get colorBottom(): number {
    return this.coreNode.colorBottom;
  }

  set colorBottom(value: number) {
    this.coreNode.colorBottom = value;
  }

  get colorLeft(): number {
    return this.coreNode.colorLeft;
  }

  set colorLeft(value: number) {
    this.coreNode.colorLeft = value;
  }

  get colorRight(): number {
    return this.coreNode.colorRight;
  }

  set colorRight(value: number) {
    this.coreNode.colorRight = value;
  }

  get colorTl(): number {
    return this.coreNode.colorTl;
  }

  set colorTl(value: number) {
    this.coreNode.colorTl = value;
  }

  get colorTr(): number {
    return this.coreNode.colorTr;
  }

  set colorTr(value: number) {
    this.coreNode.colorTr = value;
  }

  get colorBl(): number {
    return this.coreNode.colorBl;
  }

  set colorBl(value: number) {
    this.coreNode.colorBl = value;
  }

  get colorBr(): number {
    return this.coreNode.colorBr;
  }

  set colorBr(value: number) {
    this.coreNode.colorBr = value;
  }

  get scale(): number | null {
    if (this.scaleX !== this.scaleY) {
      return null;
    }
    return this.coreNode.scaleX;
  }

  set scale(value: number | null) {
    // We ignore `null` when it's set.
    if (value === null) {
      return;
    }
    this.coreNode.scaleX = value;
    this.coreNode.scaleY = value;
  }

  get scaleX(): number {
    return this.coreNode.scaleX;
  }

  set scaleX(value: number) {
    this.coreNode.scaleX = value;
  }

  get scaleY(): number {
    return this.coreNode.scaleY;
  }

  set scaleY(value: number) {
    this.coreNode.scaleY = value;
  }

  get mount(): number {
    return this.coreNode.mount;
  }

  set mount(value: number) {
    this.coreNode.mount = value;
  }

  get mountX(): number {
    return this.coreNode.mountX;
  }

  set mountX(value: number) {
    this.coreNode.mountX = value;
  }

  get mountY(): number {
    return this.coreNode.mountY;
  }

  set mountY(value: number) {
    this.coreNode.mountY = value;
  }

  get pivot(): number {
    return this.coreNode.pivot;
  }

  set pivot(value: number) {
    this.coreNode.pivot = value;
  }

  get pivotX(): number {
    return this.coreNode.pivotX;
  }

  set pivotX(value: number) {
    this.coreNode.pivotX = value;
  }

  get pivotY(): number {
    return this.coreNode.pivotY;
  }

  set pivotY(value: number) {
    this.coreNode.pivotY = value;
  }

  get rotation(): number {
    return this.coreNode.rotation;
  }

  set rotation(value: number) {
    this.coreNode.rotation = value;
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

  get zIndexLocked(): number {
    return this.coreNode.zIndexLocked;
  }

  set zIndexLocked(value: number) {
    this.coreNode.zIndexLocked = value;
  }

  get src(): string {
    return this._src;
  }

  set src(imageUrl: string) {
    if (this._src === imageUrl) {
      return;
    }
    this._src = imageUrl;
    if (!imageUrl) {
      this.texture = null;
      return;
    }
    this.texture = this.rendererMain.createTexture('ImageTexture', {
      src: imageUrl,
    });
  }

  //#region Texture
  get texture(): TextureRef | null {
    return this._texture;
  }

  set texture(texture: TextureRef | null) {
    if (this._texture === texture) {
      return;
    }
    if (this._texture) {
      this.rendererMain.textureTracker.decrementTextureRefCount(this._texture);
    }
    if (texture) {
      this.rendererMain.textureTracker.incrementTextureRefCount(texture);
    }
    this._texture = texture;
    if (texture) {
      this.coreNode.loadTexture(texture.txType, texture.props, texture.options);
    } else {
      this.coreNode.unloadTexture();
    }
  }

  private onTextureLoaded: NodeLoadedEventHandler = (target, payload) => {
    this.emit('loaded', payload);
  };

  private onTextureFailed: NodeFailedEventHandler = (target, payload) => {
    this.emit('failed', payload);
  };
  //#endregion Texture

  get shader(): ShaderRef | null {
    return this._shader;
  }

  set shader(shader: ShaderRef | null) {
    if (this._shader === shader) {
      return;
    }
    this._shader = shader;
    if (shader) {
      this.coreNode.loadShader(shader.shType, shader.props);
    }
  }

  get data(): CustomDataMap | undefined {
    return this._data;
  }

  set data(d: CustomDataMap) {
    this._data = santizeCustomDataMap(d);
  }

  destroy(): void {
    this.emit('beforeDestroy', {});
    this.coreNode.destroy();
    this.parent = null;
    this.texture = null;
    this.emit('afterDestroy', {});
    this.removeAllListeners();
  }

  flush(): void {
    // No-op
  }

  animate(
    props: Partial<INodeAnimatableProps>,
    settings: Partial<AnimationSettings>,
  ): IAnimationController {
    const animation = new CoreAnimation(this.coreNode, props, settings);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const controller = new CoreAnimationController(
      this.stage.animationManager,
      animation,
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return controller;
  }
}
