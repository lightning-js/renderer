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

import { assertTruthy } from '../utils.js';
import type { ShaderMap } from './CoreShaderManager.js';
import type {
  ExtractProps,
  TextureMap,
  TextureOptions,
} from './CoreTextureManager.js';
import type { CoreRenderer } from './renderers/CoreRenderer.js';
import type { CoreShader } from './renderers/CoreShader.js';
import type { Stage } from './Stage.js';
import type {
  Texture,
  TextureFailedEventHandler,
  TextureLoadedEventHandler,
} from './textures/Texture.js';
import type {
  NodeTextureFailedPayload,
  NodeTextureLoadedPayload,
} from '../common/CommonTypes.js';
import { EventEmitter } from '../common/EventEmitter.js';
import { intersectRect, type Rect } from './lib/utils.js';
import { Matrix3d } from './lib/Matrix3d.js';

export interface CoreNodeProps {
  id: number;
  // External facing properties whose defaults are determined by
  // RendererMain's resolveNodeDefaults() method
  x: number;
  y: number;
  width: number;
  height: number;
  alpha: number;
  clipping: boolean;
  color: number;
  colorTop: number;
  colorBottom: number;
  colorLeft: number;
  colorRight: number;
  colorTl: number;
  colorTr: number;
  colorBl: number;
  colorBr: number;
  parent: CoreNode | null;
  zIndex: number;
  texture: Texture | null;
  textureOptions: TextureOptions | null;
  shader: CoreShader | null;
  shaderProps: Record<string, unknown> | null;
  zIndexLocked: number;
  scaleX: number;
  scaleY: number;
  mount: number;
  mountX: number;
  mountY: number;
  pivot: number;
  pivotX: number;
  pivotY: number;
  rotation: number;
}

type ICoreNode = Omit<
  CoreNodeProps,
  'texture' | 'textureOptions' | 'shader' | 'shaderProps'
>;

export class CoreNode extends EventEmitter implements ICoreNode {
  readonly children: CoreNode[] = [];
  protected props: Required<CoreNodeProps>;

  public recalculationType = 0;
  public hasUpdates = true;
  public globalTransform?: Matrix3d;
  public scaleRotateTransform?: Matrix3d;
  public localTransform?: Matrix3d;
  public clippingRect: Rect | null = null;
  private parentClippingRect: Rect | null = null;

  private isComplex = false;

  constructor(protected stage: Stage, props: CoreNodeProps) {
    super();
    this.props = {
      ...props,
      parent: null,
    };
    // Allow for parent to be processed appropriately
    this.parent = props.parent;
    this.updateScaleRotateTransform();
  }

  //#region Textures
  loadTexture<Type extends keyof TextureMap>(
    textureType: Type,
    props: ExtractProps<TextureMap[Type]>,
    options: TextureOptions | null = null,
  ): void {
    // First unload any existing texture
    if (this.props.texture) {
      this.unloadTexture();
    }
    const { txManager } = this.stage;
    const texture = txManager.loadTexture(textureType, props, options);

    this.props.texture = texture;
    this.props.textureOptions = options;

    // If texture is already loaded / failed, trigger loaded event manually
    // so that users get a consistent event experience.
    // We do this in a microtask to allow listeners to be attached in the same
    // synchronous task after calling loadTexture()
    queueMicrotask(() => {
      if (texture.state === 'loaded') {
        this.onTextureLoaded(texture, texture.dimensions!);
      } else if (texture.state === 'failed') {
        this.onTextureFailed(texture, texture.error!);
      }
      texture.on('loaded', this.onTextureLoaded);
      texture.on('failed', this.onTextureFailed);
    });
  }

  unloadTexture(): void {
    if (this.props.texture) {
      this.props.texture.off('loaded', this.onTextureLoaded);
      this.props.texture.off('failed', this.onTextureFailed);
    }
    this.props.texture = null;
    this.props.textureOptions = null;
  }

  private onTextureLoaded: TextureLoadedEventHandler = (target, dimensions) => {
    this.emit('loaded', {
      type: 'texture',
      dimensions,
    } satisfies NodeTextureLoadedPayload);
  };

  private onTextureFailed: TextureFailedEventHandler = (target, error) => {
    this.emit('failed', {
      type: 'texture',
      error,
    } satisfies NodeTextureFailedPayload);
  };
  //#endregion Textures

  loadShader<Type extends keyof ShaderMap>(
    shaderType: Type,
    props: ExtractProps<ShaderMap[Type]>,
  ): void {
    const shManager = this.stage.renderer.getShaderManager();
    assertTruthy(shManager);
    const { shader, props: p } = shManager.loadShader(shaderType, props);
    this.props.shader = shader;
    this.props.shaderProps = p;
  }

  setHasUpdates(): void {
    this.hasUpdates = true;
  }

  setChildrenHasUpdates(): void {
    this.children.forEach((child) => {
      child.setRecalculationType(2);
    });
  }

  setParentHasUpdates(): void {
    if (!this.props.parent) {
      return;
    }

    this.props.parent.setRecalculationType(1);
  }

  /**
   * Change types types is used to determine the scope of the changes being applied
   * 1 - alpha recalculation
   * 2 - translate recalculation
   * 4 - transform recalculation
   * 8 - z-index recalculation
   *
   * @param type
   */
  setRecalculationType(type: number): void {
    this.recalculationType |= type;
    this.setHasUpdates();

    // always forcing parent updates so the root will have an hasUpdates flag
    this.setParentHasUpdates();

    if (type & 4) {
      this.setChildrenHasUpdates();
    }
  }

  sortChildren() {
    this.children.sort((a, b) => a.zIndex - b.zIndex);
  }

  updateScaleRotateTransform() {
    this.setRecalculationType(4);

    this.scaleRotateTransform = Matrix3d.rotate(
      this.props.rotation,
      this.scaleRotateTransform,
    ).scale(this.props.scaleX, this.props.scaleY);

    // do transformations when matrix is implemented
    this.updateLocalTransform();
  }

  updateLocalTransform() {
    assertTruthy(this.scaleRotateTransform);
    this.setRecalculationType(2);
    const pivotTranslateX = this.props.pivotX * this.props.width;
    const pivotTranslateY = this.props.pivotY * this.props.height;
    const mountTranslateX = this.props.mountX * this.props.width;
    const mountTranslateY = this.props.mountY * this.props.height;

    this.localTransform = Matrix3d.translate(
      pivotTranslateX - mountTranslateX + this.props.x,
      pivotTranslateY - mountTranslateY + this.props.y,
      this.localTransform,
    )
      .multiply(this.scaleRotateTransform)
      .translate(-pivotTranslateX, -pivotTranslateY);
  }

  /**
   * @todo: test for correct calculation flag
   * @param delta
   */
  update(delta: number, parentClippingRect: Rect | null = null): void {
    assertTruthy(this.localTransform);
    const parentGlobalTransform = this.parent?.globalTransform;
    if (parentGlobalTransform) {
      this.globalTransform = Matrix3d.copy(
        parentGlobalTransform,
        this.globalTransform,
      ).multiply(this.localTransform);
    } else {
      this.globalTransform = Matrix3d.copy(
        this.localTransform,
        this.globalTransform,
      );
    }

    this.calculateClippingRect(parentClippingRect);

    if (this.children.length) {
      this.children.forEach((child) => {
        child.update(delta, this.clippingRect);
      });
    }

    if (this.recalculationType & 8) {
      // reorder z-index
      this.sortChildren();
    }

    // reset update flag
    this.hasUpdates = false;

    // reset recalculation type
    this.recalculationType = 0;
  }

  /**
   * This function calculates the clipping rectangle for a node.
   *
   * If the node's globalTransform is not set, the function returns immediately.
   * If the node's props do not require clipping and there is no parent clipping rectangle, the node's clipping rectangle is set to null.
   * If the parent clipping rectangle has not changed and the node's clipping rectangle is already set, the function returns immediately.
   *
   * The function then checks if the node is rotated. If the node requires clipping and is not rotated, a new clipping rectangle is created based on the node's global transform and dimensions.
   * If a parent clipping rectangle exists, it is intersected with the node's clipping rectangle (if it exists), or replaces the node's clipping rectangle.
   *
   * Finally, the node's parentClippingRect and clippingRect properties are updated.
   */
  calculateClippingRect(parentClippingRect: Rect | null = null) {
    if (!this.globalTransform) {
      return;
    }

    if (!this.props.clipping && !parentClippingRect) {
      this.clippingRect = null;
      return;
    }

    if (this.parentClippingRect === parentClippingRect && this.clippingRect) {
      return;
    }

    const gt = this.globalTransform;
    const isRotated = gt.tb !== 0 || gt.tc !== 0;

    let clippingRect: Rect | null =
      this.props.clipping && !isRotated
        ? {
            x: gt.tx,
            y: gt.ty,
            width: this.width * gt.ta,
            height: this.height * gt.td,
          }
        : null;
    if (parentClippingRect && clippingRect) {
      clippingRect = intersectRect(parentClippingRect, clippingRect);
    } else if (parentClippingRect) {
      clippingRect = parentClippingRect;
    }

    this.parentClippingRect = parentClippingRect;
    this.clippingRect = clippingRect;
  }

  renderQuads(renderer: CoreRenderer): void {
    const {
      width,
      height,
      colorTl,
      colorTr,
      colorBl,
      colorBr,
      texture,
      textureOptions,
      shader,
      shaderProps,
    } = this.props;
    const { zIndex, worldAlpha, globalTransform: gt, clippingRect } = this;

    assertTruthy(gt);

    // add to list of renderables to be sorted before rendering
    renderer.addQuad({
      width,
      height,
      colorTl,
      colorTr,
      colorBl,
      colorBr,
      texture,
      textureOptions,
      zIndex,
      shader,
      shaderProps,
      alpha: worldAlpha,
      clippingRect,
      tx: gt.tx,
      ty: gt.ty,
      ta: gt.ta,
      tb: gt.tb,
      tc: gt.tc,
      td: gt.td,
    });

    // Calculate absolute X and Y based on all ancestors
    // renderer.addQuad(absX, absY, w, h, color, texture, textureOptions, zIndex);
  }

  //#region Properties
  get id(): number {
    return this.props.id;
  }

  get x(): number {
    return this.props.x;
  }

  set x(value: number) {
    if (this.props.x !== value) {
      this.props.x = value;
      this.updateLocalTransform();
    }
  }

  get absX(): number {
    return (
      this.props.x +
      (this.props.parent?.absX || this.props.parent?.globalTransform?.tx || 0)
    );
  }

  get absY(): number {
    return this.props.y + (this.props.parent?.absY ?? 0);
  }

  get y(): number {
    return this.props.y;
  }

  set y(value: number) {
    if (this.props.y !== value) {
      this.props.y = value;
      this.updateLocalTransform();
    }
  }

  get width(): number {
    return this.props.width;
  }

  set width(value: number) {
    if (this.props.width !== value) {
      this.props.width = value;
      this.updateLocalTransform();
    }
  }

  get height(): number {
    return this.props.height;
  }

  set height(value: number) {
    if (this.props.height !== value) {
      this.props.height = value;
      this.updateLocalTransform();
    }
  }

  get scale(): number {
    // The CoreNode `scale` property is only used by Animations.
    // Unlike INode, `null` should never be possibility for Animations.
    return this.scaleX;
  }

  set scale(value: number) {
    // The CoreNode `scale` property is only used by Animations.
    // Unlike INode, `null` should never be possibility for Animations.
    this.scaleX = value;
    this.scaleY = value;
  }

  get scaleX(): number {
    return this.props.scaleX;
  }

  set scaleX(value: number) {
    if (this.props.scaleX !== value) {
      this.props.scaleX = value;
      this.updateScaleRotateTransform();
    }
  }

  get scaleY(): number {
    return this.props.scaleY;
  }

  set scaleY(value: number) {
    if (this.props.scaleY !== value) {
      this.props.scaleY = value;
      this.updateScaleRotateTransform();
    }
  }

  get worldScaleX(): number {
    return (
      this.props.scaleX * (this.props.parent?.worldScaleX ?? 1) ||
      this.props.scaleX
    );
  }

  get worldScaleY(): number {
    return (
      this.props.scaleY * (this.props.parent?.worldScaleY ?? 1) ||
      this.props.scaleY
    );
  }

  get mount(): number {
    return this.props.mount;
  }

  set mount(value: number) {
    // if (this.props.mountX !== value || this.props.mountY !== value) {
    this.props.mountX = value;
    this.props.mountY = value;
    this.props.mount = value;
    this.updateLocalTransform();
    // }
  }

  get mountX(): number {
    return this.props.mountX;
  }

  set mountX(value: number) {
    this.props.mountX = value;
    this.updateLocalTransform();
  }

  get mountY(): number {
    return this.props.mountY;
  }

  set mountY(value: number) {
    this.props.mountY = value;
    this.updateLocalTransform();
  }

  get pivot(): number {
    return this.props.pivot;
  }

  set pivot(value: number) {
    if (this.props.pivotX !== value || this.props.pivotY !== value) {
      this.props.pivotX = value;
      this.props.pivotY = value;
      this.updateLocalTransform();
    }
  }

  get pivotX(): number {
    return this.props.pivotX;
  }

  set pivotX(value: number) {
    this.props.pivotX = value;
    this.updateLocalTransform();
  }

  get pivotY(): number {
    return this.props.pivotY;
  }

  set pivotY(value: number) {
    this.props.pivotY = value;
    this.updateLocalTransform();
  }

  get rotation(): number {
    return this.props.rotation;
  }

  set rotation(value: number) {
    if (this.props.rotation !== value) {
      this.props.rotation = value;
      this.updateScaleRotateTransform();
    }
  }

  get alpha(): number {
    return this.props.alpha;
  }

  set alpha(value: number) {
    this.props.alpha = value;
    this.setRecalculationType(1);
  }

  get worldAlpha(): number {
    const props = this.props;
    const parent = props.parent;

    return props.alpha * (parent?.worldAlpha || 1);
  }

  get clipping(): boolean {
    return this.props.clipping;
  }

  set clipping(value: boolean) {
    this.props.clipping = value;
    this.clippingRect = null;
    this.setRecalculationType(4);
  }

  get color(): number {
    return this.props.color;
  }

  set color(value: number) {
    if (
      this.props.colorTl !== value ||
      this.props.colorTr !== value ||
      this.props.colorBl !== value ||
      this.props.colorBr !== value
    ) {
      this.colorTl = value;
      this.colorTr = value;
      this.colorBl = value;
      this.colorBr = value;
    }
    this.props.color = value;

    this.setRecalculationType(2);
  }

  get colorTop(): number {
    return this.props.colorTop;
  }

  set colorTop(value: number) {
    if (this.props.colorTl !== value || this.props.colorTr !== value) {
      this.colorTl = value;
      this.colorTr = value;
    }
    this.props.colorTop = value;
    this.setRecalculationType(2);
  }

  get colorBottom(): number {
    return this.props.colorBottom;
  }

  set colorBottom(value: number) {
    if (this.props.colorBl !== value || this.props.colorBr !== value) {
      this.colorBl = value;
      this.colorBr = value;
    }
    this.props.colorBottom = value;
    this.setRecalculationType(2);
  }

  get colorLeft(): number {
    return this.props.colorLeft;
  }

  set colorLeft(value: number) {
    if (this.props.colorTl !== value || this.props.colorBl !== value) {
      this.colorTl = value;
      this.colorBl = value;
    }
    this.props.colorLeft = value;
    this.setRecalculationType(2);
  }

  get colorRight(): number {
    return this.props.colorRight;
  }

  set colorRight(value: number) {
    if (this.props.colorTr !== value || this.props.colorBr !== value) {
      this.colorTr = value;
      this.colorBr = value;
    }
    this.props.colorRight = value;
    this.setRecalculationType(2);
  }

  get colorTl(): number {
    return this.props.colorTl;
  }

  set colorTl(value: number) {
    this.props.colorTl = value;
    this.setRecalculationType(2);
  }

  get colorTr(): number {
    return this.props.colorTr;
  }

  set colorTr(value: number) {
    this.props.colorTr = value;
    this.setRecalculationType(2);
  }

  get colorBl(): number {
    return this.props.colorBl;
  }

  set colorBl(value: number) {
    this.props.colorBl = value;
    this.setRecalculationType(2);
  }

  get colorBr(): number {
    return this.props.colorBr;
  }

  set colorBr(value: number) {
    this.props.colorBr = value;
    this.setRecalculationType(2);
  }

  // we're only interested in parent zIndex to test
  // if we should use node zIndex is higher then parent zIndex
  get zIndexLocked(): number {
    return this.props.zIndexLocked || 0;
  }

  set zIndexLocked(value: number) {
    this.props.zIndexLocked = value;
  }

  get zIndex(): number {
    const props = this.props;
    const z = props.zIndex || 0;
    const p = props.parent?.zIndex || 0;

    if (props.parent?.zIndexLocked) {
      return z < p ? z : p;
    }
    return z;
  }

  set zIndex(value: number) {
    this.props.zIndex = value;
    this.props.parent?.setRecalculationType(8);
  }

  get parent(): CoreNode | null {
    return this.props.parent;
  }

  set parent(newParent: CoreNode | null) {
    const oldParent = this.props.parent;
    if (oldParent === newParent) {
      return;
    }
    this.props.parent = newParent;
    if (oldParent) {
      const index = oldParent.children.indexOf(this);
      assertTruthy(
        index !== -1,
        "CoreNode.parent: Node not found in old parent's children!",
      );
      oldParent.children.splice(index, 1);
    }
    if (newParent) {
      newParent.children.push(this);
      // force parent to recalculate z-index for its children
      newParent.setRecalculationType(8);
    }

    this.updateScaleRotateTransform();
  }
  //#endregion Properties
}
