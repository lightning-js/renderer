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

import {
  assertTruthy,
  mergeColorAlphaPremultiplied,
  getImageAspectRatio,
} from '../utils.js';
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
  TextureFreedEventHandler,
  TextureLoadedEventHandler,
} from './textures/Texture.js';
import { RenderTexture } from './textures/RenderTexture.js';
import type {
  Dimensions,
  NodeTextureFailedPayload,
  NodeTextureFreedPayload,
  NodeTextureLoadedPayload,
} from '../common/CommonTypes.js';
import { EventEmitter } from '../common/EventEmitter.js';
import {
  copyRect,
  intersectRect,
  type Bound,
  type RectWithValid,
  createBound,
  boundInsideBound,
} from './lib/utils.js';
import { Matrix3d } from './lib/Matrix3d.js';
import { RenderCoords } from './lib/RenderCoords.js';

export enum CoreNodeRenderState {
  Init = 0,
  OutOfBounds = 2,
  InBounds = 4,
  InViewport = 8,
}

const CoreNodeRenderStateMap: Map<CoreNodeRenderState, string> = new Map();
CoreNodeRenderStateMap.set(CoreNodeRenderState.Init, 'init');
CoreNodeRenderStateMap.set(CoreNodeRenderState.OutOfBounds, 'outOfBounds');
CoreNodeRenderStateMap.set(CoreNodeRenderState.InBounds, 'inBounds');
CoreNodeRenderStateMap.set(CoreNodeRenderState.InViewport, 'inViewport');

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
  scaleX: number;
  scaleY: number;
  mount: number;
  mountX: number;
  mountY: number;
  pivot: number;
  pivotX: number;
  pivotY: number;
  rotation: number;
  rtt: boolean;
}

type ICoreNode = Omit<
  CoreNodeProps,
  'texture' | 'textureOptions' | 'shader' | 'shaderProps'
>;

export enum UpdateType {
  /**
   * Child updates
   */
  Children = 1,

  /**
   * Scale/Rotate transform update
   *
   * @remarks
   * CoreNode Properties Updated:
   * - `scaleRotateTransform`
   */
  ScaleRotate = 2,

  /**
   * Translate transform update (x/y/width/height/pivot/mount)
   *
   * @remarks
   * CoreNode Properties Updated:
   * - `localTransform`
   */
  Local = 4,

  /**
   * Global Transform update
   *
   * @remarks
   * CoreNode Properties Updated:
   * - `globalTransform`
   * - `renderCoords`
   * - `renderBound`
   */
  Global = 8,

  /**
   * Clipping rect update
   *
   * @remarks
   * CoreNode Properties Updated:
   * - `clippingRect`
   */
  Clipping = 16,

  /**
   * Calculated ZIndex update
   *
   * @remarks
   * CoreNode Properties Updated:
   * - `calcZIndex`
   */
  CalculatedZIndex = 32,

  /**
   * Z-Index Sorted Children update
   *
   * @remarks
   * CoreNode Properties Updated:
   * - `children` (sorts children by their `calcZIndex`)
   */
  ZIndexSortedChildren = 64,

  /**
   * Premultiplied Colors update
   *
   * @remarks
   * CoreNode Properties Updated:
   * - `premultipliedColorTl`
   * - `premultipliedColorTr`
   * - `premultipliedColorBl`
   * - `premultipliedColorBr`
   */
  PremultipliedColors = 128,

  /**
   * World Alpha update
   *
   * @remarks
   * CoreNode Properties Updated:
   * - `worldAlpha` = `parent.worldAlpha` * `alpha`
   */
  WorldAlpha = 256,

  /**
   * Render State update
   *
   * @remarks
   * CoreNode Properties Updated:
   * - `renderState`
   */
  RenderState = 512,

  /**
   * Is Renderable update
   *
   * @remarks
   * CoreNode Properties Updated:
   * - `isRenderable`
   */
  IsRenderable = 1024,

  /**
   * Render Texture update
   */
  RenderTexture = 2048,

  /**
   * Track if parent has render texture
   */
  ParentRenderTexture = 4096,

  /**
   * None
   */
  None = 0,

  /**
   * All
   */
  All = 8191,
}

export class CoreNode extends EventEmitter implements ICoreNode {
  readonly children: CoreNode[] = [];
  protected props: Required<CoreNodeProps>;

  public updateType = UpdateType.All;

  public globalTransform?: Matrix3d;
  public scaleRotateTransform?: Matrix3d;
  public localTransform?: Matrix3d;
  public renderCoords?: RenderCoords;
  public renderBound?: Bound;
  public strictBound?: Bound;
  public preloadBound?: Bound;
  public clippingRect: RectWithValid = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    valid: false,
  };
  public isRenderable = false;
  public renderState: CoreNodeRenderState = CoreNodeRenderState.Init;

  public worldAlpha = 1;
  public premultipliedColorTl = 0;
  public premultipliedColorTr = 0;
  public premultipliedColorBl = 0;
  public premultipliedColorBr = 0;
  public calcZIndex = 0;
  public hasRTTupdates = false;
  public parentHasRenderTexture = false;

  constructor(protected stage: Stage, props: CoreNodeProps) {
    super();
    this.props = {
      ...props,
      parent: null,
    };
    // Allow for parent to be processed appropriately
    this.parent = props.parent;

    // Allow for Render Texture to be processed appropriately
    this.rtt = props.rtt;

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
    this.setUpdateType(UpdateType.IsRenderable);

    // If texture is already loaded / failed, trigger loaded event manually
    // so that users get a consistent event experience.
    // We do this in a microtask to allow listeners to be attached in the same
    // synchronous task after calling loadTexture()
    queueMicrotask(() => {
      if (texture.state === 'loaded') {
        this.onTextureLoaded(texture, texture.dimensions!);
      } else if (texture.state === 'failed') {
        this.onTextureFailed(texture, texture.error!);
      } else if (texture.state === 'freed') {
        this.onTextureFreed(texture);
      }
      texture.on('loaded', this.onTextureLoaded);
      texture.on('failed', this.onTextureFailed);
      texture.on('freed', this.onTextureFreed);
    });
  }

  unloadTexture(): void {
    if (this.props.texture) {
      const { texture } = this.props;
      texture.off('loaded', this.onTextureLoaded);
      texture.off('failed', this.onTextureFailed);
      texture.off('freed', this.onTextureFreed);
      texture.setRenderableOwner(this, false);
    }
    this.props.texture = null;
    this.props.textureOptions = null;
    this.setUpdateType(UpdateType.IsRenderable);
  }

  autosizeNode(dimensions: Dimensions) {
    if (this.autosize) {
      this.width = dimensions.width;
      this.height = dimensions.height;
    }
  }

  private onTextureLoaded: TextureLoadedEventHandler = (target, dimensions) => {
    this.autosizeNode(dimensions);

    // Texture was loaded. In case the RAF loop has already stopped, we request
    // a render to ensure the texture is rendered.
    this.stage.requestRender();

    // If parent has a render texture, flag that we need to update
    // @todo: Reserve type for RTT updates
    if (this.parentHasRenderTexture) {
      this.setRTTUpdates(1);
    }

    this.emit('loaded', {
      type: 'texture',
      dimensions,
    } satisfies NodeTextureLoadedPayload);

    // Trigger a local update if the texture is loaded and the resizeMode is 'contain'
    if (this.props.textureOptions?.resizeMode?.type === 'contain') {
      this.setUpdateType(UpdateType.Local);
    }
  };

  private onTextureFailed: TextureFailedEventHandler = (target, error) => {
    this.emit('failed', {
      type: 'texture',
      error,
    } satisfies NodeTextureFailedPayload);
  };

  private onTextureFreed: TextureFreedEventHandler = (target: Texture) => {
    this.emit('freed', {
      type: 'texture',
    } satisfies NodeTextureFreedPayload);
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
    this.setUpdateType(UpdateType.IsRenderable);
  }

  /**
   * Change types types is used to determine the scope of the changes being applied
   *
   * @remarks
   * See {@link UpdateType} for more information on each type
   *
   * @param type
   */
  setUpdateType(type: UpdateType): void {
    this.updateType |= type;

    // If we're updating this node at all, we need to inform the parent
    // (and all ancestors) that their children need updating as well
    const parent = this.props.parent;
    if (parent && !(parent.updateType & UpdateType.Children)) {
      parent.setUpdateType(UpdateType.Children);
    }
    // If node is part of RTT texture
    // Flag that we need to update
    if (this.parentHasRenderTexture) {
      this.setRTTUpdates(type);
    }
  }

  sortChildren() {
    this.children.sort((a, b) => a.calcZIndex - b.calcZIndex);
  }

  updateScaleRotateTransform() {
    this.scaleRotateTransform = Matrix3d.rotate(
      this.props.rotation,
      this.scaleRotateTransform,
    ).scale(this.props.scaleX, this.props.scaleY);
  }

  updateLocalTransform() {
    assertTruthy(this.scaleRotateTransform);
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

    // Handle 'contain' resize mode
    const { width, height } = this.props;
    const texture = this.props.texture;
    if (
      texture &&
      texture.dimensions &&
      this.props.textureOptions?.resizeMode?.type === 'contain'
    ) {
      let resizeModeScaleX = 1;
      let resizeModeScaleY = 1;
      let extraX = 0;
      let extraY = 0;
      const { width: tw, height: th } = texture.dimensions;
      const txAspectRatio = tw / th;
      const nodeAspectRatio = width / height;
      if (txAspectRatio > nodeAspectRatio) {
        // Texture is wider than node
        // Center the node vertically (shift down by extraY)
        // Scale the node vertically to maintain original aspect ratio
        const scaleX = width / tw;
        const scaledTxHeight = th * scaleX;
        extraY = (height - scaledTxHeight) / 2;
        resizeModeScaleY = scaledTxHeight / height;
      } else {
        // Texture is taller than node (or equal)
        // Center the node horizontally (shift right by extraX)
        // Scale the node horizontally to maintain original aspect ratio
        const scaleY = height / th;
        const scaledTxWidth = tw * scaleY;
        extraX = (width - scaledTxWidth) / 2;
        resizeModeScaleX = scaledTxWidth / width;
      }

      // Apply the extra translation and scale to the local transform
      this.localTransform
        .translate(extraX, extraY)
        .scale(resizeModeScaleX, resizeModeScaleY);
    }

    this.setUpdateType(UpdateType.Global);
  }

  /**
   * @todo: test for correct calculation flag
   * @param delta
   */
  update(delta: number, parentClippingRect: RectWithValid): void {
    if (this.updateType & UpdateType.ScaleRotate) {
      this.updateScaleRotateTransform();
      this.setUpdateType(UpdateType.Local);
    }

    if (this.updateType & UpdateType.Local) {
      this.updateLocalTransform();
      this.setUpdateType(UpdateType.Global);
    }

    const parent = this.props.parent;
    let childUpdateType = UpdateType.None;

    if (this.updateType & UpdateType.ParentRenderTexture) {
      let p = this.parent;
      while (p) {
        if (p.rtt) {
          this.parentHasRenderTexture = true;
        }
        p = p.parent;
      }
    }

    // If we have render texture updates and not already running a full update
    if (
      this.updateType ^ UpdateType.All &&
      this.updateType & UpdateType.RenderTexture
    ) {
      this.children.forEach((child) => {
        child.setUpdateType(UpdateType.All);
      });
    }

    if (this.updateType & UpdateType.Global) {
      assertTruthy(this.localTransform);

      this.globalTransform = Matrix3d.copy(
        parent?.globalTransform || this.localTransform,
        this.globalTransform,
      );

      if (this.parentHasRenderTexture && this.props.parent?.rtt) {
        this.globalTransform = Matrix3d.identity();
      }

      if (parent) {
        this.globalTransform.multiply(this.localTransform);
      }

      this.calculateRenderCoords();
      this.updateBoundingRect();
      this.setUpdateType(
        UpdateType.Clipping | UpdateType.RenderState | UpdateType.Children,
      );
      childUpdateType |= UpdateType.Global;
    }

    if (this.updateType & UpdateType.Clipping) {
      this.calculateClippingRect(parentClippingRect);
      this.setUpdateType(UpdateType.Children);
      childUpdateType |= UpdateType.Clipping;
    }

    if (this.updateType & UpdateType.WorldAlpha) {
      if (parent) {
        this.worldAlpha = parent.worldAlpha * this.props.alpha;
      } else {
        this.worldAlpha = this.props.alpha;
      }
      this.setUpdateType(
        UpdateType.Children |
          UpdateType.PremultipliedColors |
          UpdateType.IsRenderable,
      );
      childUpdateType |= UpdateType.WorldAlpha;
    }

    if (this.updateType & UpdateType.PremultipliedColors) {
      this.premultipliedColorTl = mergeColorAlphaPremultiplied(
        this.props.colorTl,
        this.worldAlpha,
        true,
      );

      // If all the colors are the same just sent them all to the same value
      if (
        this.props.colorTl === this.props.colorTr &&
        this.props.colorBl === this.props.colorBr &&
        this.props.colorTl === this.props.colorBl
      ) {
        this.premultipliedColorTr =
          this.premultipliedColorBl =
          this.premultipliedColorBr =
            this.premultipliedColorTl;
      } else {
        this.premultipliedColorTr = mergeColorAlphaPremultiplied(
          this.props.colorTr,
          this.worldAlpha,
          true,
        );
        this.premultipliedColorBl = mergeColorAlphaPremultiplied(
          this.props.colorBl,
          this.worldAlpha,
          true,
        );
        this.premultipliedColorBr = mergeColorAlphaPremultiplied(
          this.props.colorBr,
          this.worldAlpha,
          true,
        );
      }
    }

    if (this.updateType & UpdateType.RenderState) {
      this.updateRenderState(parentClippingRect);
      this.setUpdateType(UpdateType.IsRenderable);
    }

    if (this.updateType & UpdateType.IsRenderable) {
      this.updateIsRenderable();
    }

    // No need to update zIndex if there is no parent
    if (parent && this.updateType & UpdateType.CalculatedZIndex) {
      this.calculateZIndex();
      // Tell parent to re-sort children
      parent.setUpdateType(UpdateType.ZIndexSortedChildren);
    }

    if (
      this.updateType & UpdateType.Children &&
      this.children.length &&
      !this.rtt
    ) {
      this.children.forEach((child) => {
        // Trigger the depenedent update types on the child
        child.setUpdateType(childUpdateType);
        // If child has no updates, skip
        if (child.updateType === 0) {
          return;
        }
        child.update(delta, this.clippingRect);
      });
    }

    // Sorting children MUST happen after children have been updated so
    // that they have the oppotunity to update their calculated zIndex.
    if (this.updateType & UpdateType.ZIndexSortedChildren) {
      // reorder z-index
      this.sortChildren();
    }

    // reset update type
    this.updateType = 0;
  }

  //check if CoreNode is renderable based on props
  checkRenderProps(): boolean {
    if (this.props.texture) {
      return true;
    }

    if (!this.props.width || !this.props.height) {
      return false;
    }

    if (this.props.shader) {
      return true;
    }

    if (this.props.clipping) {
      return true;
    }

    if (this.props.color !== 0) {
      return true;
    }

    // Consider removing these checks and just using the color property check above.
    // Maybe add a forceRender prop for nodes that should always render.
    if (this.props.colorTop !== 0) {
      return true;
    }

    if (this.props.colorBottom !== 0) {
      return true;
    }

    if (this.props.colorLeft !== 0) {
      return true;
    }

    if (this.props.colorRight !== 0) {
      return true;
    }

    if (this.props.colorTl !== 0) {
      return true;
    }

    if (this.props.colorTr !== 0) {
      return true;
    }

    if (this.props.colorBl !== 0) {
      return true;
    }

    if (this.props.colorBr !== 0) {
      return true;
    }
    return false;
  }

  checkRenderBounds(parentClippingRect: RectWithValid): CoreNodeRenderState {
    assertTruthy(this.renderBound);
    const rectW = parentClippingRect.width || this.stage.root.width;
    const rectH = parentClippingRect.height || this.stage.root.height;
    this.strictBound = createBound(
      parentClippingRect.x,
      parentClippingRect.y,
      parentClippingRect.x + rectW,
      parentClippingRect.y + rectH,
      this.strictBound,
    );

    const renderM = this.stage.boundsMargin;
    this.preloadBound = createBound(
      parentClippingRect.x - renderM[3],
      parentClippingRect.y - renderM[0],
      parentClippingRect.x + rectW + renderM[1],
      parentClippingRect.y + rectH + renderM[2],
      this.preloadBound,
    );

    if (boundInsideBound(this.renderBound, this.strictBound)) {
      return CoreNodeRenderState.InViewport;
    }

    if (boundInsideBound(this.renderBound, this.preloadBound)) {
      return CoreNodeRenderState.InBounds;
    }
    return CoreNodeRenderState.OutOfBounds;
  }

  updateRenderState(parentClippingRect: RectWithValid) {
    const renderState = this.checkRenderBounds(parentClippingRect);
    if (renderState !== this.renderState) {
      let previous = this.renderState;
      this.renderState = renderState;
      if (previous === CoreNodeRenderState.InViewport) {
        this.emit('outOfViewport', {
          previous,
          current: renderState,
        });
      }
      if (
        previous < CoreNodeRenderState.InBounds &&
        renderState === CoreNodeRenderState.InViewport
      ) {
        this.emit(CoreNodeRenderStateMap.get(CoreNodeRenderState.InBounds)!, {
          previous,
          current: renderState,
        });
        previous = CoreNodeRenderState.InBounds;
      } else if (
        previous > CoreNodeRenderState.InBounds &&
        renderState === CoreNodeRenderState.OutOfBounds
      ) {
        this.emit(CoreNodeRenderStateMap.get(CoreNodeRenderState.InBounds)!, {
          previous,
          current: renderState,
        });
        previous = CoreNodeRenderState.InBounds;
      }
      const event = CoreNodeRenderStateMap.get(renderState);
      assertTruthy(event);
      this.emit(event, {
        previous,
        current: renderState,
      });
    }
  }

  setRenderState(state: CoreNodeRenderState) {
    if (state !== this.renderState) {
      this.renderState = state;
      this.emit(CoreNodeRenderState[state]);
    }
  }

  /**
   * This function updates the `isRenderable` property based on certain conditions.
   *
   * @returns
   */
  updateIsRenderable() {
    let newIsRenderable;
    if (this.worldAlpha === 0 || !this.checkRenderProps()) {
      newIsRenderable = false;
    } else {
      newIsRenderable = this.renderState > CoreNodeRenderState.OutOfBounds;
    }
    if (this.isRenderable !== newIsRenderable) {
      this.isRenderable = newIsRenderable;
      this.onChangeIsRenderable(newIsRenderable);
    }
  }

  onChangeIsRenderable(isRenderable: boolean) {
    this.props.texture?.setRenderableOwner(this, isRenderable);
  }

  calculateRenderCoords() {
    const { width, height, globalTransform: transform } = this;
    assertTruthy(transform);
    const { tx, ty, ta, tb, tc, td } = transform;
    if (tb === 0 && tc === 0) {
      const minX = tx;
      const maxX = tx + width * ta;

      const minY = ty;
      const maxY = ty + height * td;
      this.renderCoords = RenderCoords.translate(
        //top-left
        minX,
        minY,
        //top-right
        maxX,
        minY,
        //bottom-right
        maxX,
        maxY,
        //bottom-left
        minX,
        maxY,
        this.renderCoords,
      );
    } else {
      this.renderCoords = RenderCoords.translate(
        //top-left
        tx,
        ty,
        //top-right
        tx + width * ta,
        ty + width * tc,
        //bottom-right
        tx + width * ta + height * tb,
        ty + width * tc + height * td,
        //bottom-left
        tx + height * tb,
        ty + height * td,
        this.renderCoords,
      );
    }
  }

  updateBoundingRect() {
    const { renderCoords, globalTransform: transform } = this;
    assertTruthy(transform);
    assertTruthy(renderCoords);

    const { tb, tc } = transform;
    const { x1, y1, x3, y3 } = renderCoords;
    if (tb === 0 || tc === 0) {
      this.renderBound = createBound(x1, y1, x3, y3, this.renderBound);
    } else {
      const { x2, x4, y2, y4 } = renderCoords;
      this.renderBound = createBound(
        Math.min(x1, x2, x3, x4),
        Math.min(y1, y2, y3, y4),
        Math.max(x1, x2, x3, x4),
        Math.max(y1, y2, y3, y4),
        this.renderBound,
      );
    }
  }
  /**
   * This function calculates the clipping rectangle for a node.
   *
   * The function then checks if the node is rotated. If the node requires clipping and is not rotated, a new clipping rectangle is created based on the node's global transform and dimensions.
   * If a parent clipping rectangle exists, it is intersected with the node's clipping rectangle (if it exists), or replaces the node's clipping rectangle.
   *
   * Finally, the node's parentClippingRect and clippingRect properties are updated.
   */
  calculateClippingRect(parentClippingRect: RectWithValid) {
    assertTruthy(this.globalTransform);
    const { clippingRect, props, globalTransform: gt } = this;
    const { clipping } = props;

    const isRotated = gt.tb !== 0 || gt.tc !== 0;

    if (clipping && !isRotated) {
      clippingRect.x = gt.tx;
      clippingRect.y = gt.ty;
      clippingRect.width = this.width * gt.ta;
      clippingRect.height = this.height * gt.td;
      clippingRect.valid = true;
    } else {
      clippingRect.valid = false;
    }

    if (parentClippingRect.valid && clippingRect.valid) {
      // Intersect parent clipping rect with node clipping rect
      intersectRect(parentClippingRect, clippingRect, clippingRect);
    } else if (parentClippingRect.valid) {
      // Copy parent clipping rect
      copyRect(parentClippingRect, clippingRect);
      clippingRect.valid = true;
    }
  }

  calculateZIndex(): void {
    const props = this.props;
    const z = props.zIndex || 0;
    const p = props.parent?.zIndex || 0;

    let zIndex = z;
    if (props.parent?.zIndexLocked) {
      zIndex = z < p ? z : p;
    }
    this.calcZIndex = zIndex;
  }

  /**
   * Destroy the node and cleanup all resources
   */
  destroy(): void {
    this.unloadTexture();

    this.clippingRect.valid = false;

    this.isRenderable = false;

    delete this.renderCoords;
    delete this.renderBound;
    delete this.strictBound;
    delete this.preloadBound;
    delete this.globalTransform;
    delete this.scaleRotateTransform;
    delete this.localTransform;

    this.props.texture = null;
    this.props.shader = null;

    if (this.rtt) {
      this.stage.renderer.removeRTTNode(this);
    }

    this.removeAllListeners();
    this.parent = null;
  }

  renderQuads(renderer: CoreRenderer): void {
    const { width, height, texture, textureOptions, shader, shaderProps, rtt } =
      this.props;

    // Prevent quad rendering if parent has a render texture
    // and renderer is not currently rendering to a texture
    if (this.parentHasRenderTexture) {
      if (!renderer.renderToTextureActive) {
        return;
      }
      // Prevent quad rendering if parent render texture is not the active render texture
      if (this.parentRenderTexture !== renderer.activeRttNode) {
        return;
      }
    }

    const {
      premultipliedColorTl,
      premultipliedColorTr,
      premultipliedColorBl,
      premultipliedColorBr,
    } = this;

    const { zIndex, worldAlpha, globalTransform: gt, clippingRect } = this;

    assertTruthy(gt);

    // add to list of renderables to be sorted before rendering
    renderer.addQuad({
      width,
      height,
      colorTl: premultipliedColorTl,
      colorTr: premultipliedColorTr,
      colorBl: premultipliedColorBl,
      colorBr: premultipliedColorBr,
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
      rtt,
      parentHasRenderTexture: this.parentHasRenderTexture,
      framebufferDimensions: this.framebufferDimensions,
    });
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
      this.setUpdateType(UpdateType.Local);
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
      this.setUpdateType(UpdateType.Local);
    }
  }

  get width(): number {
    return this.props.width;
  }

  set width(value: number) {
    if (this.props.width !== value) {
      this.props.width = value;
      this.setUpdateType(UpdateType.Local);

      if (this.props.rtt) {
        this.setUpdateType(UpdateType.RenderTexture);
      }
    }
  }

  get height(): number {
    return this.props.height;
  }

  set height(value: number) {
    if (this.props.height !== value) {
      this.props.height = value;
      this.setUpdateType(UpdateType.Local);

      if (this.props.rtt) {
        this.setUpdateType(UpdateType.RenderTexture);
      }
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
      this.setUpdateType(UpdateType.ScaleRotate);
    }
  }

  get scaleY(): number {
    return this.props.scaleY;
  }

  set scaleY(value: number) {
    if (this.props.scaleY !== value) {
      this.props.scaleY = value;
      this.setUpdateType(UpdateType.ScaleRotate);
    }
  }

  get mount(): number {
    return this.props.mount;
  }

  set mount(value: number) {
    if (this.props.mountX !== value || this.props.mountY !== value) {
      this.props.mountX = value;
      this.props.mountY = value;
      this.props.mount = value;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get mountX(): number {
    return this.props.mountX;
  }

  set mountX(value: number) {
    if (this.props.mountX !== value) {
      this.props.mountX = value;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get mountY(): number {
    return this.props.mountY;
  }

  set mountY(value: number) {
    if (this.props.mountY !== value) {
      this.props.mountY = value;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get pivot(): number {
    return this.props.pivot;
  }

  set pivot(value: number) {
    if (this.props.pivotX !== value || this.props.pivotY !== value) {
      this.props.pivotX = value;
      this.props.pivotY = value;
      this.props.pivot = value;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get pivotX(): number {
    return this.props.pivotX;
  }

  set pivotX(value: number) {
    if (this.props.pivotX !== value) {
      this.props.pivotX = value;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get pivotY(): number {
    return this.props.pivotY;
  }

  set pivotY(value: number) {
    if (this.props.pivotY !== value) {
      this.props.pivotY = value;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get rotation(): number {
    return this.props.rotation;
  }

  set rotation(value: number) {
    if (this.props.rotation !== value) {
      this.props.rotation = value;
      this.setUpdateType(UpdateType.ScaleRotate);
    }
  }

  get alpha(): number {
    return this.props.alpha;
  }

  set alpha(value: number) {
    this.props.alpha = value;
    this.setUpdateType(UpdateType.PremultipliedColors | UpdateType.WorldAlpha);

    if (this.props.rtt) {
      this.setUpdateType(UpdateType.RenderTexture);
    }
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
    this.setUpdateType(UpdateType.Clipping);
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

    this.setUpdateType(UpdateType.PremultipliedColors);
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
    this.setUpdateType(UpdateType.PremultipliedColors);
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
    this.setUpdateType(UpdateType.PremultipliedColors);
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
    this.setUpdateType(UpdateType.PremultipliedColors);
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
    this.setUpdateType(UpdateType.PremultipliedColors);
  }

  get colorTl(): number {
    return this.props.colorTl;
  }

  set colorTl(value: number) {
    this.props.colorTl = value;
    this.setUpdateType(UpdateType.PremultipliedColors);
  }

  get colorTr(): number {
    return this.props.colorTr;
  }

  set colorTr(value: number) {
    this.props.colorTr = value;
    this.setUpdateType(UpdateType.PremultipliedColors);
  }

  get colorBl(): number {
    return this.props.colorBl;
  }

  set colorBl(value: number) {
    this.props.colorBl = value;
    this.setUpdateType(UpdateType.PremultipliedColors);
  }

  get colorBr(): number {
    return this.props.colorBr;
  }

  set colorBr(value: number) {
    this.props.colorBr = value;
    this.setUpdateType(UpdateType.PremultipliedColors);
  }

  // we're only interested in parent zIndex to test
  // if we should use node zIndex is higher then parent zIndex
  get zIndexLocked(): number {
    return this.props.zIndexLocked || 0;
  }

  set zIndexLocked(value: number) {
    this.props.zIndexLocked = value;
    this.setUpdateType(UpdateType.CalculatedZIndex | UpdateType.Children);
    this.children.forEach((child) => {
      child.setUpdateType(UpdateType.CalculatedZIndex);
    });
  }

  get zIndex(): number {
    return this.props.zIndex;
  }

  set zIndex(value: number) {
    this.props.zIndex = value;
    this.setUpdateType(UpdateType.CalculatedZIndex | UpdateType.Children);
    this.children.forEach((child) => {
      child.setUpdateType(UpdateType.CalculatedZIndex);
    });
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
      oldParent.setUpdateType(
        UpdateType.Children | UpdateType.ZIndexSortedChildren,
      );
    }
    if (newParent) {
      newParent.children.push(this);
      // Since this node has a new parent, to be safe, have it do a full update.
      this.setUpdateType(UpdateType.All);
      // Tell parent that it's children need to be updated and sorted.
      newParent.setUpdateType(
        UpdateType.Children | UpdateType.ZIndexSortedChildren,
      );

      if (newParent.rtt || newParent.parentHasRenderTexture) {
        this.setRTTUpdates(UpdateType.All);
      }
    }
    this.updateScaleRotateTransform();
  }

  get rtt(): boolean {
    return this.props.rtt;
  }

  set rtt(value: boolean) {
    if (!value) {
      if (this.props.rtt) {
        this.props.rtt = false;
        this.unloadTexture();
        this.setUpdateType(UpdateType.All);

        this.children.forEach((child) => {
          child.parentHasRenderTexture = false;
        });

        this.stage.renderer?.removeRTTNode(this);
      }
      return;
    }

    this.props.rtt = true;
    this.hasRTTupdates = true;
    this.setUpdateType(UpdateType.All);

    this.children.forEach((child) => {
      child.setUpdateType(UpdateType.All);
    });

    // Store RTT nodes in a separate list
    this.stage.renderer?.renderToTexture(this);
  }

  /**
   * Returns the framebuffer dimensions of the node.
   * If the node has a render texture, the dimensions are the same as the node's dimensions.
   * If the node does not have a render texture, the dimensions are inherited from the parent.
   * If the node parent has a render texture and the node is a render texture, the nodes dimensions are used.
   */
  get framebufferDimensions(): Dimensions {
    if (this.parentHasRenderTexture && !this.rtt && this.parent) {
      return this.parent.framebufferDimensions;
    }
    return { width: this.width, height: this.height };
  }

  /**
   * Returns the parent render texture node if it exists.
   */
  get parentRenderTexture(): CoreNode | null {
    let parent = this.parent;
    while (parent) {
      if (parent.rtt) {
        return parent;
      }
      parent = parent.parent;
    }
    return null;
  }

  get texture(): Texture | null {
    return this.props.texture;
  }

  setRTTUpdates(type: number) {
    this.hasRTTupdates = true;
    this.parent?.setRTTUpdates(type);
  }
  //#endregion Properties
}
