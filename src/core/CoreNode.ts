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

import { assertTruthy, getImageAspectRatio } from '../utils.js';
import type { ShaderMap } from './CoreShaderManager.js';
import type {
  ExtractProps,
  TextureMap,
  TextureOptions,
} from './CoreTextureManager.js';
import { Matrix2DContext } from './Matrix2DContext.js';
import type { CoreRenderer } from './renderers/CoreRenderer.js';
import type { CoreShader } from './renderers/CoreShader.js';
import type { Stage } from './Stage.js';
import type { Texture } from './textures/Texture.js';
import type {
  Dimensions,
  TextureFailedEventHandler,
  TextureLoadedEventHandler,
} from '../common/CommonTypes.js';
import { EventEmitter } from '../common/EventEmitter.js';
import type { Rect } from './lib/utils.js';

export interface CoreNodeProps {
  id: number;
  // External facing properties whose defaults are determined by
  // RendererMain's resolveNodeDefaults() method
  x: number;
  y: number;
  width: number;
  height: number;
  alpha: number;
  autosize: boolean;
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
  scale: number;
  mount: number;
  mountX: number;
  mountY: number;
  pivot: number;
  pivotX: number;
  pivotY: number;
  rotation: number;
  worldX?: number;
  worldY?: number;

  // Internal properties that are resolved in CoreNode constructor (see below)
  ta?: number;
  tb?: number;
  tc?: number;
  td?: number;
}

type ICoreNode = Omit<
  CoreNodeProps,
  'texture' | 'textureOptions' | 'shader' | 'shaderProps'
>;

export class CoreNode extends EventEmitter implements ICoreNode {
  readonly children: CoreNode[] = [];
  protected props: Required<CoreNodeProps>;

  /**
   * Recalculation type
   * 0 - no recalculation
   * 1 - alpha recalculation
   * 2 - translate recalculation
   * 4 - transform recalculation
   */
  public recalculationType = 6;
  public hasUpdates = true;
  public worldContext: Matrix2DContext = new Matrix2DContext();

  // local translation / transform updates
  // derived from x, y, w, h, scale, pivot, rotation
  public localPx = 0;
  public localPy = 0;

  private isComplex = false;

  constructor(protected stage: Stage, props: CoreNodeProps) {
    super();
    this.props = {
      ...props,
      parent: null,
      ta: props.ta ?? 1,
      tb: props.tb ?? 0,
      tc: props.tc ?? 0,
      td: props.td ?? 1,
      worldX: props.worldX ?? 0,
      worldY: props.worldY ?? 0,
    };
    // Allow for parent to be processed appropriately
    this.parent = props.parent;
    this.updateLocalTransform();
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

  autosizeNode(dimensions: Dimensions) {
    if (this.autosize && dimensions.width && dimensions.height) {
      if (
        (isNaN(this.width) && isNaN(this.height)) ||
        (this.width === 0 && this.height === 0)
      ) {
        this.width = dimensions.width;
        this.height = dimensions.height;
      } else {
        const imageAspectRatio = getImageAspectRatio(
          dimensions.width,
          dimensions.height,
        );

        if (isNaN(this.width) || this.width === 0) {
          this.width = this.height * imageAspectRatio;
        } else if (isNaN(this.height) || this.height === 0) {
          this.height = this.width / imageAspectRatio;
        }
      }
    }
  }

  private onTextureLoaded: TextureLoadedEventHandler = (target, dimensions) => {
    if (target.props.src) {
      this.autosizeNode(dimensions);
    }

    this.emit('txLoaded', dimensions);
  };

  private onTextureFailed: TextureFailedEventHandler = (target, error) => {
    this.emit('txFailed', error);
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
    if (!this.props.alpha) {
      return;
    }
    this.hasUpdates = true;
    let p = this?.props.parent;

    while (p) {
      p.hasUpdates = true;
      p = p?.props.parent;
    }
  }

  /**
   * 1 - alpha recalculation
   * 2 - translate recalculation
   * 4 - transform recalculation
   * @param type
   */
  setRecalculationType(type: number): void {
    this.recalculationType |= type;
    this.setHasUpdates();
  }

  updateLocalTransform() {
    // if rotation is equal to previous render pass, we only need
    // to use sin and cosine of rotation to calculate new position
    if (this.props.rotation !== 0 && this.props.rotation % (Math.PI * 2)) {
      const sineRotation = Math.sin(this.props.rotation);
      const cosineRotation = Math.cos(this.props.rotation);

      this.setLocalTransform(
        cosineRotation * this.props.scale,
        -sineRotation * this.props.scale,
        sineRotation * this.props.scale,
        cosineRotation * this.props.scale,
      );
    } else {
      this.setLocalTransform(this.props.scale, 0, 0, this.props.scale);
    }
    // do transformations when matrix is implemented
    this.updateLocalTranslate();
  }

  // update 2x2 matrix
  setLocalTransform(a: number, b: number, c: number, d: number) {
    this.setRecalculationType(4);
    this.props.ta = a;
    this.props.tb = b;
    this.props.tc = c;
    this.props.td = d;

    // test if there is scaling or shearing in transformation ( b !== 0 || c !== 0 )
    // test if there is flipping or reflection in transformation ( a < 0 || d < 0 )
    this.isComplex = b !== 0 || c !== 0 || a < 0 || d < 0;
  }

  updateLocalTranslate() {
    this.setRecalculationType(2);
    const pivotXMultiplier = this.props.pivotX * this.props.width;
    const pivotYMultiplier = this.props.pivotY * this.props.height;

    let px =
      this.props.x -
      (pivotXMultiplier * this.props.ta + pivotYMultiplier * this.props.tb) +
      pivotXMultiplier;
    let py =
      this.props.y -
      (pivotXMultiplier * this.props.tc + pivotYMultiplier * this.props.td) +
      pivotYMultiplier;

    px -= this.props.mountX * this.props.width;
    py -= this.props.mountY * this.props.height;

    this.localPx = px;
    this.localPy = py;
  }

  /**
   * @todo: test for correct calculation flag
   * @param delta
   */
  update(delta: number): void {
    const parentWorldContext = this.props.parent?.worldContext;
    const worldContext = this.worldContext;

    worldContext.px =
      (parentWorldContext?.px || 0) +
      this.localPx * (parentWorldContext?.ta || 1);
    worldContext.py =
      (parentWorldContext?.py || 0) +
      this.localPy * (parentWorldContext?.td || 1);

    if (parentWorldContext?.tb !== 0) {
      worldContext.px += this.localPy * (parentWorldContext?.tb || 0);
    }

    if (parentWorldContext?.tc !== 0) {
      worldContext.py += this.localPx * (parentWorldContext?.tc || 0);
    }

    worldContext.ta = this.props.ta * (parentWorldContext?.ta || 1);
    worldContext.tb = this.props.td * (parentWorldContext?.tb || 0);
    worldContext.tc = this.props.ta * (parentWorldContext?.tc || 0);
    worldContext.td = this.props.td * (parentWorldContext?.td || 1);

    if (this.isComplex) {
      worldContext.ta += this.props.tc * (parentWorldContext?.tb || 0);
      worldContext.tb += this.props.tb * (parentWorldContext?.ta || 1);
      worldContext.tc += this.props.tc * (parentWorldContext?.td || 1);
      worldContext.td += this.props.tb * (parentWorldContext?.tc || 0);
    }

    this.worldX = worldContext.px;
    this.worldY = worldContext.py;

    if (this.children.length) {
      this.children.forEach((child) => {
        child.update(delta);
      });
    }

    // reset update flag
    this.hasUpdates = false;

    // reset recalculation type
    this.recalculationType = 0;
  }

  renderQuads(renderer: CoreRenderer, clippingRect: Rect | null): void {
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
      scale,
    } = this.props;
    const { zIndex, alpha, worldScale } = this;

    // add to list of renderables to be sorted before rendering
    renderer.addRenderable({
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
      alpha,
      scale,
      clippingRect,
      wpx: this.worldContext.px,
      wpy: this.worldContext.py,
      worldScale,
      ta: this.worldContext.ta,
      tb: this.worldContext.tb,
      tc: this.worldContext.tc,
      td: this.worldContext.td,
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
      this.updateLocalTranslate();
    }
  }

  get worldX(): number {
    return this.props.worldX || 0;
  }

  set worldX(value: number) {
    this.props.worldX = value;
  }

  get worldY(): number {
    return this.props.worldY || 0;
  }

  set worldY(value: number) {
    this.props.worldY = value;
  }

  get absX(): number {
    return (
      this.props.x +
      (this.props.parent?.absX || this.props.parent?.worldContext.px || 0)
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
      this.updateLocalTranslate();
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
    return this.props.scale;
  }

  // @todo: implement scaleX and scaleY
  set scale(value: number) {
    if (this.props.scale !== value) {
      this.props.scale = value;
      this.updateLocalTransform();
    }
  }

  get worldScale(): number {
    return (
      this.props.scale * (this.props.parent?.worldScale ?? 1) ||
      this.props.scale
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
    this.updateLocalTranslate();
    // }
  }

  get mountX(): number {
    return this.props.mountX;
  }

  set mountX(value: number) {
    this.props.mountX = value;
    this.updateLocalTranslate();
  }

  get mountY(): number {
    return this.props.mountY;
  }

  set mountY(value: number) {
    this.props.mountY = value;
    this.updateLocalTranslate();
  }

  get pivot(): number {
    return this.props.pivot;
  }

  set pivot(value: number) {
    if (this.props.pivotX !== value || this.props.pivotY !== value) {
      this.props.pivotX = value;
      this.props.pivotY = value;
      this.updateLocalTranslate();
    }
  }

  get pivotX(): number {
    return this.props.pivotX;
  }

  set pivotX(value: number) {
    this.props.pivotX = value;
    this.updateLocalTranslate();
  }

  get pivotY(): number {
    return this.props.pivotY;
  }

  set pivotY(value: number) {
    this.props.pivotY = value;
    this.updateLocalTranslate();
  }

  get rotation(): number {
    return this.props.rotation;
  }

  set rotation(value: number) {
    if (this.props.rotation !== value) {
      this.props.rotation = value;
      this.updateLocalTransform();
    }
  }

  get alpha(): number {
    const props = this.props;
    const parent = props.parent;

    // root always visible
    if (!parent) {
      return 1;
    }

    return props.alpha * parent.alpha;
  }

  set alpha(value: number) {
    this.props.alpha = value;
  }

  get autosize(): boolean {
    return this.props.autosize;
  }

  set autosize(value: boolean) {
    this.props.autosize = value;
  }

  get clipping(): boolean {
    return this.props.clipping;
  }

  set clipping(value: boolean) {
    this.props.clipping = value;
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
  }

  get colorTl(): number {
    return this.props.colorTl;
  }

  set colorTl(value: number) {
    this.props.colorTl = value;
  }

  get colorTr(): number {
    return this.props.colorTr;
  }

  set colorTr(value: number) {
    this.props.colorTr = value;
  }

  get colorBl(): number {
    return this.props.colorBl;
  }

  set colorBl(value: number) {
    this.props.colorBl = value;
  }

  get colorBr(): number {
    return this.props.colorBr;
  }

  set colorBr(value: number) {
    this.props.colorBr = value;
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
    }
    this.updateLocalTransform();
  }
  //#endregion Properties
}
