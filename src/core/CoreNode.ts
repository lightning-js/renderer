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
  getNewId,
  mergeColorAlphaPremultiplied,
} from '../utils.js';
import type { TextureOptions } from './CoreTextureManager.js';
import type { CoreRenderer } from './renderers/CoreRenderer.js';
import type { Stage } from './Stage.js';
import {
  type Texture,
  type TextureCoords,
  type TextureFailedEventHandler,
  type TextureFreedEventHandler,
  type TextureLoadedEventHandler,
} from './textures/Texture.js';
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
  boundLargeThanBound,
  createPreloadBounds,
} from './lib/utils.js';
import { Matrix3d } from './lib/Matrix3d.js';
import { RenderCoords } from './lib/RenderCoords.js';
import type { AnimationSettings } from './animations/CoreAnimation.js';
import type { IAnimationController } from '../common/IAnimationController.js';
import { CoreAnimation } from './animations/CoreAnimation.js';
import { CoreAnimationController } from './animations/CoreAnimationController.js';
import type { CoreShaderNode } from './renderers/CoreShaderNode.js';

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

export enum UpdateType {
  /**
   * Child updates
   */
  Children = 1,

  /**
   * localTransform
   *
   * @remarks
   * CoreNode Properties Updated:
   * - `localTransform`
   */
  Local = 2,

  /**
   * globalTransform
   *
   * * @remarks
   * CoreNode Properties Updated:
   * - `globalTransform`
   * - `renderBounds`
   * - `renderCoords`
   */
  Global = 4,

  /**
   * Clipping rect update
   *
   * @remarks
   * CoreNode Properties Updated:
   * - `clippingRect`
   */
  Clipping = 8,

  /**
   * Calculated ZIndex update
   *
   * @remarks
   * CoreNode Properties Updated:
   * - `calcZIndex`
   */
  CalculatedZIndex = 16,

  /**
   * Z-Index Sorted Children update
   *
   * @remarks
   * CoreNode Properties Updated:
   * - `children` (sorts children by their `calcZIndex`)
   */
  ZIndexSortedChildren = 32,

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
  PremultipliedColors = 64,

  /**
   * World Alpha update
   *
   * @remarks
   * CoreNode Properties Updated:
   * - `worldAlpha` = `parent.worldAlpha` * `alpha`
   */
  WorldAlpha = 128,

  /**
   * Render State update
   *
   * @remarks
   * CoreNode Properties Updated:
   * - `renderState`
   */
  RenderState = 256,

  /**
   * Is Renderable update
   *
   * @remarks
   * CoreNode Properties Updated:
   * - `isRenderable`
   */
  IsRenderable = 512,

  /**
   * Render Texture update
   */
  RenderTexture = 1024,

  /**
   * Track if parent has render texture
   */
  ParentRenderTexture = 2048,

  /**
   * Render Bounds update
   */
  RenderBounds = 4096,

  /**
   * RecalcUniforms
   */
  RecalcUniforms = 8192,

  /**
   * None
   */
  None = 0,

  /**
   * All
   */
  All = 14335,
}

/**
 * A custom data map which can be stored on an CoreNode
 *
 * @remarks
 * This is a map of key-value pairs that can be stored on an INode. It is used
 * to store custom data that can be used by the application.
 * The data stored can only be of type string, number or boolean.
 */
export type CustomDataMap = {
  [key: string]: string | number | boolean | undefined;
};

/**
 * Writable properties of a Node.
 */
export interface CoreNodeProps {
  /**
   * The x coordinate of the Node's Mount Point.
   *
   * @remarks
   * See {@link mountX} and {@link mountY} for more information about setting
   * the Mount Point.
   *
   * @default `0`
   */
  x: number;
  /**
   * The y coordinate of the Node's Mount Point.
   *
   * @remarks
   * See {@link mountX} and {@link mountY} for more information about setting
   * the Mount Point.
   *
   * @default `0`
   */
  y: number;
  /**
   * The width of the Node.
   * @warning This will be deprecated in favor of `w` and `h` properties in the future.
   *
   * @default `0`
   */
  w: number;
  /**
   * The height of the Node.
   * @warning This will be deprecated in favor of `w` and `h` properties in the future.
   *
   * @default `0`
   */
  h: number;
  /**
   * The alpha opacity of the Node.
   *
   * @remarks
   * The alpha value is a number between 0 and 1, where 0 is fully transparent
   * and 1 is fully opaque.
   *
   * @default `1`
   */
  alpha: number;
  /**
   * Autosize mode
   *
   * @remarks
   * When enabled, when a texture is loaded into the Node, the Node will
   * automatically resize to the dimensions of the texture.
   *
   * Text Nodes are always autosized based on their text content regardless
   * of this mode setting.
   *
   * @default `false`
   */
  autosize: boolean;
  /**
   * Margin around the Node's bounds for preloading
   *
   * @default `null`
   */
  boundsMargin: number | [number, number, number, number] | null;
  /**
   * Clipping Mode
   *
   * @remarks
   * Enable Clipping Mode when you want to prevent the drawing of a Node and
   * its descendants from overflowing outside of the Node's x/y/width/height
   * bounds.
   *
   * For WebGL, clipping is implemented using the high-performance WebGL
   * operation scissor. As a consequence, clipping does not work for
   * non-rectangular areas. So, if the element is rotated
   * (by itself or by any of its ancestors), clipping will not work as intended.
   *
   * TODO: Add support for non-rectangular clipping either automatically or
   * via Render-To-Texture.
   *
   * @default `false`
   */
  clipping: boolean;
  /**
   * The color of the Node.
   *
   * @remarks
   * The color value is a number in the format 0xRRGGBBAA, where RR is the red
   * component, GG is the green component, BB is the blue component, and AA is
   * the alpha component.
   *
   * Gradient colors may be set by setting the different color sub-properties:
   * {@link colorTop}, {@link colorBottom}, {@link colorLeft}, {@link colorRight},
   * {@link colorTl}, {@link colorTr}, {@link colorBr}, {@link colorBl} accordingly.
   *
   * @default `0xffffffff` (opaque white)
   */
  color: number;
  /**
   * The color of the top edge of the Node for gradient rendering.
   *
   * @remarks
   * See {@link color} for more information about color values and gradient
   * rendering.
   */
  colorTop: number;
  /**
   * The color of the bottom edge of the Node for gradient rendering.
   *
   * @remarks
   * See {@link color} for more information about color values and gradient
   * rendering.
   */
  colorBottom: number;
  /**
   * The color of the left edge of the Node for gradient rendering.
   *
   * @remarks
   * See {@link color} for more information about color values and gradient
   * rendering.
   */
  colorLeft: number;
  /**
   * The color of the right edge of the Node for gradient rendering.
   *
   * @remarks
   * See {@link color} for more information about color values and gradient
   * rendering.
   */
  colorRight: number;
  /**
   * The color of the top-left corner of the Node for gradient rendering.
   *
   * @remarks
   * See {@link color} for more information about color values and gradient
   * rendering.
   */
  colorTl: number;
  /**
   * The color of the top-right corner of the Node for gradient rendering.
   *
   * @remarks
   * See {@link color} for more information about color values and gradient
   * rendering.
   */
  colorTr: number;
  /**
   * The color of the bottom-right corner of the Node for gradient rendering.
   *
   * @remarks
   * See {@link color} for more information about color values and gradient
   * rendering.
   */
  colorBr: number;
  /**
   * The color of the bottom-left corner of the Node for gradient rendering.
   *
   * @remarks
   * See {@link color} for more information about color values and gradient
   * rendering.
   */
  colorBl: number;
  /**
   * The Node's parent Node.
   *
   * @remarks
   * The value `null` indicates that the Node has no parent. This may either be
   * because the Node is the root Node of the scene graph, or because the Node
   * has been removed from the scene graph.
   *
   * In order to make sure that a Node can be rendered on the screen, it must
   * be added to the scene graph by setting it's parent property to a Node that
   * is already in the scene graph such as the root Node.
   *
   * @default `null`
   */
  parent: CoreNode | null;
  /**
   * The Node's z-index.
   *
   * @remarks
   * TBD
   */
  zIndex: number;
  /**
   * The Node's Texture.
   *
   * @remarks
   * The `texture` defines a rasterized image that is contained within the
   * {@link width} and {@link height} dimensions of the Node. If null, the
   * Node will use an opaque white {@link ColorTexture} when being drawn, which
   * essentially enables colors (including gradients) to be drawn.
   *
   * If set, by default, the texture will be drawn, as is, stretched to the
   * dimensions of the Node. This behavior can be modified by setting the TBD
   * and TBD properties.
   *
   * To create a Texture in order to set it on this property, call
   * {@link RendererMain.createTexture}.
   *
   * If the {@link src} is set on a Node, the Node will use the
   * {@link ImageTexture} by default and the Node will simply load the image at
   * the specified URL.
   *
   * Note: If this is a Text Node, the Texture will be managed by the Node's
   * {@link TextRenderer} and should not be set explicitly.
   */
  texture: Texture | null;

  /**
   * Options to associate with the Node's Texture
   */
  textureOptions: TextureOptions;

  /**
   * The Node's shader
   *
   * @remarks
   * The `shader` defines a {@link Shader} used to draw the Node. By default,
   * the Default Shader is used which simply draws the defined {@link texture}
   * or {@link color}(s) within the Node without any special effects.
   *
   * To create a Shader in order to set it on this property, call
   * {@link RendererMain.createShader}.
   *
   * Note: If this is a Text Node, the Shader will be managed by the Node's
   * {@link TextRenderer} and should not be set explicitly.
   */
  shader: CoreShaderNode<any> | null;
  /**
   * Image URL
   *
   * @remarks
   * When set, the Node's {@link texture} is automatically set to an
   * {@link ImageTexture} using the source image URL provided (with all other
   * settings being defaults)
   */
  src: string | null;
  zIndexLocked: number;
  /**
   * Scale to render the Node at
   *
   * @remarks
   * The scale value multiplies the provided {@link width} and {@link height}
   * of the Node around the Node's Pivot Point (defined by the {@link pivot}
   * props).
   *
   * Behind the scenes, setting this property sets both the {@link scaleX} and
   * {@link scaleY} props to the same value.
   *
   * NOTE: When the scaleX and scaleY props are explicitly set to different values,
   * this property returns `null`. Setting `null` on this property will have no
   * effect.
   *
   * @default 1.0
   */
  scale: number | null;
  /**
   * Scale to render the Node at (X-Axis)
   *
   * @remarks
   * The scaleX value multiplies the provided {@link width} of the Node around
   * the Node's Pivot Point (defined by the {@link pivot} props).
   *
   * @default 1.0
   */
  scaleX: number;
  /**
   * Scale to render the Node at (Y-Axis)
   *
   * @remarks
   * The scaleY value multiplies the provided {@link height} of the Node around
   * the Node's Pivot Point (defined by the {@link pivot} props).
   *
   * @default 1.0
   */
  scaleY: number;
  /**
   * Combined position of the Node's Mount Point
   *
   * @remarks
   * The value can be any number between `0.0` and `1.0`:
   * - `0.0` defines the Mount Point at the top-left corner of the Node.
   * - `0.5` defines it at the center of the Node.
   * - `1.0` defines it at the bottom-right corner of the node.
   *
   * Use the {@link mountX} and {@link mountY} props seperately for more control
   * of the Mount Point.
   *
   * When assigned, the same value is also passed to both the {@link mountX} and
   * {@link mountY} props.
   *
   * @default 0 (top-left)
   */
  mount: number;
  /**
   * X position of the Node's Mount Point
   *
   * @remarks
   * The value can be any number between `0.0` and `1.0`:
   * - `0.0` defines the Mount Point's X position as the left-most edge of the
   *   Node
   * - `0.5` defines it as the horizontal center of the Node
   * - `1.0` defines it as the right-most edge of the Node.
   *
   * The combination of {@link mountX} and {@link mountY} define the Mount Point
   *
   * @default 0 (left-most edge)
   */
  mountX: number;
  /**
   * Y position of the Node's Mount Point
   *
   * @remarks
   * The value can be any number between `0.0` and `1.0`:
   * - `0.0` defines the Mount Point's Y position as the top-most edge of the
   *   Node
   * - `0.5` defines it as the vertical center of the Node
   * - `1.0` defines it as the bottom-most edge of the Node.
   *
   * The combination of {@link mountX} and {@link mountY} define the Mount Point
   *
   * @default 0 (top-most edge)
   */
  mountY: number;
  /**
   * Combined position of the Node's Pivot Point
   *
   * @remarks
   * The value can be any number between `0.0` and `1.0`:
   * - `0.0` defines the Pivot Point at the top-left corner of the Node.
   * - `0.5` defines it at the center of the Node.
   * - `1.0` defines it at the bottom-right corner of the node.
   *
   * Use the {@link pivotX} and {@link pivotY} props seperately for more control
   * of the Pivot Point.
   *
   * When assigned, the same value is also passed to both the {@link pivotX} and
   * {@link pivotY} props.
   *
   * @default 0.5 (center)
   */
  pivot: number;
  /**
   * X position of the Node's Pivot Point
   *
   * @remarks
   * The value can be any number between `0.0` and `1.0`:
   * - `0.0` defines the Pivot Point's X position as the left-most edge of the
   *   Node
   * - `0.5` defines it as the horizontal center of the Node
   * - `1.0` defines it as the right-most edge of the Node.
   *
   * The combination of {@link pivotX} and {@link pivotY} define the Pivot Point
   *
   * @default 0.5 (centered on x-axis)
   */
  pivotX: number;
  /**
   * Y position of the Node's Pivot Point
   *
   * @remarks
   * The value can be any number between `0.0` and `1.0`:
   * - `0.0` defines the Pivot Point's Y position as the top-most edge of the
   *   Node
   * - `0.5` defines it as the vertical center of the Node
   * - `1.0` defines it as the bottom-most edge of the Node.
   *
   * The combination of {@link pivotX} and {@link pivotY} define the Pivot Point
   *
   * @default 0.5 (centered on y-axis)
   */
  pivotY: number;
  /**
   * Rotation of the Node (in Radians)
   *
   * @remarks
   * Sets the amount to rotate the Node by around it's Pivot Point (defined by
   * the {@link pivot} props). Positive values rotate the Node clockwise, while
   * negative values rotate it counter-clockwise.
   *
   * Example values:
   * - `-Math.PI / 2`: 90 degree rotation counter-clockwise
   * - `0`: No rotation
   * - `Math.PI / 2`: 90 degree rotation clockwise
   * - `Math.PI`: 180 degree rotation clockwise
   * - `3 * Math.PI / 2`: 270 degree rotation clockwise
   * - `2 * Math.PI`: 360 rotation clockwise
   */
  rotation: number;

  /**
   * Whether the Node is rendered to a texture
   *
   * @remarks
   * TBD
   *
   * @default false
   */
  rtt: boolean;

  /**
   * Node data element for custom data storage (optional)
   *
   * @remarks
   * This property is used to store custom data on the Node as a key/value data store.
   * Data values are limited to string, numbers, booleans. Strings will be truncated
   * to a 2048 character limit for performance reasons.
   *
   * This is not a data storage mechanism for large amounts of data please use a
   * dedicated data storage mechanism for that.
   *
   * The custom data will be reflected in the inspector as part of `data-*` attributes
   *
   * @default `undefined`
   */
  data?: CustomDataMap;

  /**
   * Image Type to explicitly set the image type that is being loaded
   *
   * @remarks
   * This property must be used with a `src` that points at an image. In some cases
   * the extension doesn't provide a reliable representation of the image type. In such
   * cases set the ImageType explicitly.
   *
   * `regular` is used for normal images such as png, jpg, etc
   * `compressed` is used for ETC1/ETC2 compressed images with a PVR or KTX container
   * `svg` is used for scalable vector graphics
   *
   * @default `undefined`
   */
  imageType?: 'regular' | 'compressed' | 'svg' | null;

  /**
   * She width of the rectangle from which the Image Texture will be extracted.
   * This value can be negative. If not provided, the image's source natural
   * width will be used.
   */
  srcWidth?: number;
  /**
   * The height of the rectangle from which the Image Texture will be extracted.
   * This value can be negative. If not provided, the image's source natural
   * height will be used.
   */
  srcHeight?: number;
  /**
   * The x coordinate of the reference point of the rectangle from which the Texture
   * will be extracted.  `width` and `height` are provided. And only works when
   * createImageBitmap is available. Only works when createImageBitmap is supported on the browser.
   */
  srcX?: number;
  /**
   * The y coordinate of the reference point of the rectangle from which the Texture
   * will be extracted. Only used when source `srcWidth` width and `srcHeight` height
   * are provided. Only works when createImageBitmap is supported on the browser.
   */
  srcY?: number;
  /**
   * Mark the node as interactive so we can perform hit tests on it
   * when pointer events are registered.
   * @default false
   */
  interactive?: boolean;
  /**
   * By enabling Strict bounds the renderer will not process & render child nodes of a node that is out of the visible area
   *
   * @remarks
   * When enabled out of bound nodes, i.e. nodes that are out of the visible area, will
   * **NOT** have their children processed and renderer anymore. This means the children of a out of bound
   * node will not receive update processing such as positioning updates and will not be drawn on screen.
   * As such the rest of the branch of the update tree that sits below this node will not be processed anymore
   *
   * This is a big performance gain but may be disabled in cases where the width of the parent node is
   * unknown and the render must process the child nodes regardless of the viewport status of the parent node
   *
   * @default true
   */
  strictBounds: boolean;
}

/**
 * Grab all the number properties of type T
 */
type NumberProps<T> = {
  [Key in keyof T as NonNullable<T[Key]> extends number ? Key : never]: number;
};

/**
 * Properties of a Node used by the animate() function
 */
export interface CoreNodeAnimateProps extends NumberProps<CoreNodeProps> {
  /**
   * Shader properties to animate
   */
  shaderProps: Record<string, number>;
  // TODO: textureProps: Record<string, number>;
}

/**
 * A visual Node in the Renderer scene graph.
 *
 * @remarks
 * CoreNode is an internally used class that represents a Renderer Node in the
 * scene graph. See INode.ts for the public APIs exposed to Renderer users
 * that include generic types for Shaders.
 */
export class CoreNode extends EventEmitter {
  readonly children: CoreNode[] = [];
  protected _id: number = getNewId();
  readonly props: CoreNodeProps;

  private hasShaderUpdater = false;
  public hasShaderTimeFn = false;
  private hasColorProps = false;
  public updateType = UpdateType.All;
  public childUpdateType = UpdateType.None;

  public globalTransform?: Matrix3d;
  public localTransform?: Matrix3d;
  public sceneGlobalTransform?: Matrix3d;
  public renderCoords?: RenderCoords;
  public sceneRenderCoords?: RenderCoords;
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
  public textureCoords?: TextureCoords;
  public updateTextureCoords?: boolean = false;
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
  public rttParent: CoreNode | null = null;
  /**
   * only used when rtt = true
   */
  public framebufferDimensions: Dimensions | null = null;

  public destroyed = false;

  constructor(readonly stage: Stage, props: CoreNodeProps) {
    super();

    const p = (this.props = {} as CoreNodeProps);

    // Fast-path assign only known keys
    p.x = props.x;
    p.y = props.y;
    p.w = props.w;
    p.h = props.h;
    p.alpha = props.alpha;
    p.autosize = props.autosize;
    p.clipping = props.clipping;
    p.color = props.color;

    p.colorTop = props.colorTop;
    p.colorBottom = props.colorBottom;
    p.colorLeft = props.colorLeft;
    p.colorRight = props.colorRight;
    p.colorTl = props.colorTl;
    p.colorTr = props.colorTr;
    p.colorBl = props.colorBl;
    p.colorBr = props.colorBr;

    p.scaleX = props.scaleX;
    p.scaleY = props.scaleY;
    p.rotation = props.rotation;
    p.pivotX = props.pivotX;
    p.pivotY = props.pivotY;
    p.mountX = props.mountX;
    p.mountY = props.mountY;
    p.mount = props.mount;
    p.pivot = props.pivot;
    p.strictBounds = props.strictBounds;

    p.zIndex = props.zIndex;
    p.zIndexLocked = props.zIndexLocked;
    p.textureOptions = props.textureOptions;

    p.data = props.data;
    p.imageType = props.imageType;
    p.srcX = props.srcX;
    p.srcY = props.srcY;
    p.srcWidth = props.srcWidth;
    p.srcHeight = props.srcHeight;

    p.parent = null;
    p.texture = null;
    p.shader = null;
    p.src = null;
    p.rtt = false;
    p.boundsMargin = null;

    // Assign props to instances
    this.parent = props.parent;
    this.texture = props.texture;
    this.shader = props.shader;
    this.src = props.src;
    this.rtt = props.rtt;
    this.boundsMargin = props.boundsMargin;
    this.interactive = props.interactive;

    this.setUpdateType(
      UpdateType.Local | UpdateType.RenderBounds | UpdateType.RenderState,
    );

    // if the default texture isn't loaded yet, wait for it to load
    // this only happens when the node is created before the stage is ready
    const dt = this.stage.defaultTexture;
    if (dt !== null && dt.state !== 'loaded') {
      dt.once('loaded', () => this.setUpdateType(UpdateType.IsRenderable));
    }
  }

  //#region Textures
  loadTexture(): void {
    const { texture } = this.props;
    if (!texture) {
      return;
    }

    // If texture is already loaded / failed, trigger loaded event manually
    // so that users get a consistent event experience.
    // We do this in a microtask to allow listeners to be attached in the same
    // synchronous task after calling loadTexture()
    queueMicrotask(() => {
      if (this.textureOptions.preload === true) {
        this.stage.txManager.loadTexture(texture);
      }

      texture.preventCleanup =
        this.props.textureOptions?.preventCleanup ?? false;
      texture.on('loaded', this.onTextureLoaded);
      texture.on('failed', this.onTextureFailed);
      texture.on('freed', this.onTextureFreed);

      // If the parent is a render texture, the initial texture status
      // will be set to freed until the texture is processed by the
      // Render RTT nodes. So we only need to listen fo changes and
      // no need to check the texture.state until we restructure how
      // textures are being processed.
      if (this.parentHasRenderTexture) {
        this.notifyParentRTTOfUpdate();
        return;
      }

      if (texture.state === 'loaded') {
        this.onTextureLoaded(texture, texture.dimensions!);
      } else if (texture.state === 'failed') {
        this.onTextureFailed(texture, texture.error!);
      } else if (texture.state === 'freed') {
        this.onTextureFreed(texture);
      }
    });
  }

  unloadTexture(): void {
    if (this.texture === null) {
      return;
    }

    const texture = this.texture;
    texture.off('loaded', this.onTextureLoaded);
    texture.off('failed', this.onTextureFailed);
    texture.off('freed', this.onTextureFreed);
    texture.setRenderableOwner(this, false);
  }

  protected onTextureLoaded: TextureLoadedEventHandler = (_, dimensions) => {
    if (this.autosize === true) {
      this.w = dimensions.w;
      this.h = dimensions.h;
    }

    this.setUpdateType(UpdateType.IsRenderable);

    // Texture was loaded. In case the RAF loop has already stopped, we request
    // a render to ensure the texture is rendered.
    this.stage.requestRender();

    // If parent has a render texture, flag that we need to update
    if (this.parentHasRenderTexture) {
      this.notifyParentRTTOfUpdate();
    }

    // ignore 1x1 pixel textures
    if (dimensions.w > 1 && dimensions.h > 1) {
      this.emit('loaded', {
        type: 'texture',
        dimensions,
      } satisfies NodeTextureLoadedPayload);
    }

    // Trigger a local update if the texture is loaded and the resizeMode is 'contain'
    if (this.props.textureOptions?.resizeMode?.type === 'contain') {
      this.setUpdateType(UpdateType.Local);
    }
  };

  private onTextureFailed: TextureFailedEventHandler = (_, error) => {
    // immediately set isRenderable to false, so that we handle the error
    // without waiting for the next frame loop
    this.isRenderable = false;
    this.setUpdateType(UpdateType.IsRenderable);

    // If parent has a render texture, flag that we need to update
    if (this.parentHasRenderTexture) {
      this.notifyParentRTTOfUpdate();
    }

    this.emit('failed', {
      type: 'texture',
      error,
    } satisfies NodeTextureFailedPayload);
  };

  private onTextureFreed: TextureFreedEventHandler = () => {
    // immediately set isRenderable to false, so that we handle the error
    // without waiting for the next frame loop
    this.isRenderable = false;
    this.setUpdateType(UpdateType.IsRenderable);

    // If parent has a render texture, flag that we need to update
    if (this.parentHasRenderTexture) {
      this.notifyParentRTTOfUpdate();
    }

    this.emit('freed', {
      type: 'texture',
    } satisfies NodeTextureFreedPayload);
  };
  //#endregion Textures

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

    const parent = this.props.parent;
    if (!parent) return;

    parent.setUpdateType(UpdateType.Children);
  }

  sortChildren() {
    this.children.sort((a, b) => a.calcZIndex - b.calcZIndex);
  }

  updateLocalTransform() {
    const p = this.props;
    const { x, y, w, h } = p;
    const mountTranslateX = p.mountX * w;
    const mountTranslateY = p.mountY * h;

    if (p.rotation !== 0 || p.scaleX !== 1 || p.scaleY !== 1) {
      const pivotTranslateX = p.pivotX * w;
      const pivotTranslateY = p.pivotY * h;

      this.localTransform = Matrix3d.translate(
        x - mountTranslateX + pivotTranslateX,
        y - mountTranslateY + pivotTranslateY,
        this.localTransform,
      )
        .rotate(p.rotation)
        .scale(p.scaleX, p.scaleY)
        .translate(-pivotTranslateX, -pivotTranslateY);
    } else {
      this.localTransform = Matrix3d.translate(
        x - mountTranslateX,
        y - mountTranslateY,
        this.localTransform,
      );
    }

    // Handle 'contain' resize mode
    const texture = p.texture;
    if (
      texture &&
      texture.dimensions &&
      p.textureOptions.resizeMode?.type === 'contain'
    ) {
      let resizeModeScaleX = 1;
      let resizeModeScaleY = 1;
      let extraX = 0;
      let extraY = 0;
      const { w: tw, h: th } = texture.dimensions;
      const txAspectRatio = tw / th;
      const nodeAspectRatio = w / h;
      if (txAspectRatio > nodeAspectRatio) {
        // Texture is wider than node
        // Center the node vertically (shift down by extraY)
        // Scale the node vertically to maintain original aspect ratio
        const scaleX = w / tw;
        const scaledTxHeight = th * scaleX;
        extraY = (h - scaledTxHeight) / 2;
        resizeModeScaleY = scaledTxHeight / h;
      } else {
        // Texture is taller than node (or equal)
        // Center the node horizontally (shift right by extraX)
        // Scale the node horizontally to maintain original aspect ratio
        const scaleY = h / th;
        const scaledTxWidth = tw * scaleY;
        extraX = (w - scaledTxWidth) / 2;
        resizeModeScaleX = scaledTxWidth / w;
      }

      // Apply the extra translation and scale to the local transform
      this.localTransform
        .translate(extraX, extraY)
        .scale(resizeModeScaleX, resizeModeScaleY);
    }
  }

  /**
   * @todo: test for correct calculation flag
   * @param delta
   */
  update(delta: number, parentClippingRect: RectWithValid): void {
    if (this.updateType === UpdateType.None) {
      return;
    }

    const props = this.props;
    const parent = props.parent;
    const parentHasRenderTexture = this.parentHasRenderTexture;
    const hasParent = props.parent !== null;

    let renderState: CoreNodeRenderState | null = null;

    let updateType = this.updateType;
    let childUpdateType = this.childUpdateType;
    let updateParent = false;

    if (updateType & UpdateType.Local) {
      this.updateLocalTransform();

      updateType |= UpdateType.Global;
      updateParent = hasParent;
    }

    // Handle specific RTT updates at this node level
    if (updateType & UpdateType.RenderTexture && this.rtt === true) {
      this.hasRTTupdates = true;
    }

    if (updateType & UpdateType.Global) {
      if (this.parentHasRenderTexture === true && parent?.rtt === true) {
        // we are at the start of the RTT chain, so we need to reset the globalTransform
        // for correct RTT rendering
        this.globalTransform = Matrix3d.identity();

        // Maintain a full scene global transform for bounds detection
        this.sceneGlobalTransform = Matrix3d.copy(
          parent?.globalTransform || Matrix3d.identity(),
        ).multiply(this.localTransform!);
      } else if (
        this.parentHasRenderTexture === true &&
        parent?.rtt === false
      ) {
        // we're part of an RTT chain but our parent is not the main RTT node
        // so we need to propogate the sceneGlobalTransform of the parent
        // to maintain a full scene global transform for bounds detection
        this.sceneGlobalTransform = Matrix3d.copy(
          parent?.sceneGlobalTransform || this.localTransform!,
        ).multiply(this.localTransform!);

        this.globalTransform = Matrix3d.copy(
          parent?.globalTransform || this.localTransform!,
          this.globalTransform,
        );
      } else {
        this.globalTransform = Matrix3d.copy(
          parent?.globalTransform || this.localTransform!,
          this.globalTransform,
        );
      }

      if (parent !== null) {
        this.globalTransform.multiply(this.localTransform!);
      }
      this.calculateRenderCoords();
      this.updateBoundingRect();

      updateType |=
        UpdateType.RenderState |
        UpdateType.Children |
        UpdateType.RecalcUniforms;
      updateParent = hasParent;
      childUpdateType |= UpdateType.Global;

      if (this.clipping === true) {
        updateType |= UpdateType.Clipping | UpdateType.RenderBounds;
        updateParent = hasParent;
        childUpdateType |= UpdateType.RenderBounds;
      }
    }

    if (updateType & UpdateType.RenderBounds) {
      this.createRenderBounds();

      updateType |= UpdateType.RenderState | UpdateType.Children;
      updateParent = hasParent;
      childUpdateType |= UpdateType.RenderBounds;
    }

    if (updateType & UpdateType.RenderState) {
      renderState = this.checkRenderBounds();

      updateType |= UpdateType.IsRenderable;
      updateParent = hasParent;

      // if we're not going out of bounds, update the render state
      // this is done so the update loop can finish before we mark a node
      // as out of bounds
      if (renderState !== CoreNodeRenderState.OutOfBounds) {
        this.updateRenderState(renderState);
      }
    }

    if (updateType & UpdateType.WorldAlpha) {
      this.worldAlpha = ((parent && parent.worldAlpha) || 1) * props.alpha;
      updateType |=
        UpdateType.PremultipliedColors |
        UpdateType.Children |
        UpdateType.IsRenderable;
      updateParent = hasParent;
      childUpdateType |= UpdateType.WorldAlpha;
    }

    if (updateType & UpdateType.IsRenderable) {
      this.updateIsRenderable();
    }

    if (updateType & UpdateType.Clipping) {
      this.calculateClippingRect(parentClippingRect);
      updateType |= UpdateType.Children;
      updateParent = hasParent;

      childUpdateType |= UpdateType.Clipping | UpdateType.RenderBounds;
    }

    if (updateType & UpdateType.PremultipliedColors) {
      const alpha = this.worldAlpha;

      const tl = props.colorTl;
      const tr = props.colorTr;
      const bl = props.colorBl;
      const br = props.colorBr;

      // Fast equality check (covers all 4 corners)
      const same = tl === tr && tl === bl && tl === br;

      const merged = mergeColorAlphaPremultiplied(tl, alpha, true);

      this.premultipliedColorTl = merged;

      if (same) {
        this.premultipliedColorTr =
          this.premultipliedColorBl =
          this.premultipliedColorBr =
            merged;
      } else {
        this.premultipliedColorTr = mergeColorAlphaPremultiplied(
          tr,
          alpha,
          true,
        );
        this.premultipliedColorBl = mergeColorAlphaPremultiplied(
          bl,
          alpha,
          true,
        );
        this.premultipliedColorBr = mergeColorAlphaPremultiplied(
          br,
          alpha,
          true,
        );
      }
    }

    if (updateParent === true) {
      parent!.setUpdateType(UpdateType.Children);
    }
    // No need to update zIndex if there is no parent
    if (updateType & UpdateType.CalculatedZIndex && parent !== null) {
      this.calculateZIndex();
      // Tell parent to re-sort children
      parent.setUpdateType(UpdateType.ZIndexSortedChildren);
    }

    if (
      props.strictBounds === true &&
      this.renderState === CoreNodeRenderState.OutOfBounds
    ) {
      updateType &= ~UpdateType.RenderBounds; // remove render bounds update
      return;
    }

    if (
      updateType & UpdateType.RecalcUniforms &&
      this.hasShaderUpdater === true
    ) {
      //this exists because the boolean hasShaderUpdater === true
      this.shader!.update!();
    }

    if (updateType & UpdateType.Children && this.children.length > 0) {
      for (let i = 0, length = this.children.length; i < length; i++) {
        const child = this.children[i] as CoreNode;

        child.setUpdateType(childUpdateType);

        if (child.updateType === 0) {
          continue;
        }

        let childClippingRect = this.clippingRect;
        if (this.rtt === true) {
          childClippingRect = {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            valid: false,
          };
        }

        child.update(delta, childClippingRect);
      }
    }

    // If the node has an RTT parent and requires a texture re-render, inform the RTT parent
    // if (this.parentHasRenderTexture && updateType & UpdateType.RenderTexture) {
    // @TODO have a more scoped down updateType for RTT updates
    if (parentHasRenderTexture === true) {
      this.notifyParentRTTOfUpdate();
    }

    // Sorting children MUST happen after children have been updated so
    // that they have the oppotunity to update their calculated zIndex.
    if (updateType & UpdateType.ZIndexSortedChildren) {
      // reorder z-index
      this.sortChildren();
    }

    if (this.updateTextureCoords === true) {
      this.updateTextureCoords = false;
      this.textureCoords = this.stage.renderer.getTextureCoords!(this);
    }

    // If we're out of bounds, apply the render state now
    // this is done so nodes can finish their entire update loop before
    // being marked as out of bounds
    if (renderState === CoreNodeRenderState.OutOfBounds) {
      this.updateRenderState(renderState);
      this.updateIsRenderable();

      if (
        this.rtt === true &&
        renderState === CoreNodeRenderState.OutOfBounds
      ) {
        // notify children that we are going out of bounds
        // we have to do this now before we stop processing the render tree
        this.notifyChildrenRTTOfUpdate(renderState);
      }
    }

    // reset update type
    this.updateType = 0;
    this.childUpdateType = 0;
  }

  private findParentRTTNode(): CoreNode | null {
    let rttNode: CoreNode | null = this.parent;
    while (rttNode && !rttNode.rtt) {
      rttNode = rttNode.parent;
    }
    return rttNode;
  }

  private notifyChildrenRTTOfUpdate(renderState: CoreNodeRenderState) {
    for (const child of this.children) {
      // force child to update render state
      child.updateRenderState(renderState);
      child.updateIsRenderable();
      child.notifyChildrenRTTOfUpdate(renderState);
    }
  }

  protected notifyParentRTTOfUpdate() {
    if (this.parent === null) {
      return;
    }

    const rttNode = this.rttParent || this.findParentRTTNode();
    if (!rttNode) {
      return;
    }

    // If an RTT node is found, mark it for re-rendering
    rttNode.hasRTTupdates = true;
    rttNode.setUpdateType(UpdateType.RenderTexture);

    // if rttNode is nested, also make it update its RTT parent
    if (rttNode.parentHasRenderTexture === true) {
      rttNode.notifyParentRTTOfUpdate();
    }
  }

  checkRenderBounds(): CoreNodeRenderState {
    if (boundInsideBound(this.renderBound!, this.strictBound!)) {
      return CoreNodeRenderState.InViewport;
    }

    if (boundInsideBound(this.renderBound!, this.preloadBound!)) {
      return CoreNodeRenderState.InBounds;
    }

    // check if we're larger then our parent, we're definitely in the viewport
    if (boundLargeThanBound(this.renderBound!, this.strictBound!)) {
      return CoreNodeRenderState.InViewport;
    }

    // check if we dont have dimensions, take our parent's render state
    if (this.parent !== null && (this.props.w === 0 || this.props.h === 0)) {
      return this.parent.renderState;
    }

    return CoreNodeRenderState.OutOfBounds;
  }

  updateBoundingRect() {
    const transform = (this.sceneGlobalTransform ||
      this.globalTransform) as Matrix3d;
    const renderCoords = (this.sceneRenderCoords ||
      this.renderCoords) as RenderCoords;

    if (transform.tb === 0 || transform.tc === 0) {
      this.renderBound = createBound(
        renderCoords.x1,
        renderCoords.y1,
        renderCoords.x3,
        renderCoords.y3,
        this.renderBound,
      );
    } else {
      const { x1, y1, x2, y2, x3, y3, x4, y4 } = renderCoords;
      this.renderBound = createBound(
        Math.min(x1, x2, x3, x4),
        Math.min(y1, y2, y3, y4),
        Math.max(x1, x2, x3, x4),
        Math.max(y1, y2, y3, y4),
        this.renderBound,
      );
    }
  }

  createRenderBounds(): void {
    if (this.parent !== null && this.parent.strictBound !== undefined) {
      // we have a parent with a valid bound, copy it
      const parentBound = this.parent.strictBound;
      this.strictBound = createBound(
        parentBound.x1,
        parentBound.y1,
        parentBound.x2,
        parentBound.y2,
      );

      this.preloadBound = createPreloadBounds(
        this.strictBound,
        this.boundsMargin as [number, number, number, number],
      );
    } else {
      // no parent or parent does not have a bound, take the stage boundaries
      this.strictBound = this.stage.strictBound;
      this.preloadBound = this.stage.preloadBound;
    }

    // if clipping is disabled, we're done
    if (this.props.clipping === false) {
      return;
    }

    // only create local clipping bounds if node itself is in bounds
    // this can only be done if we have a render bound already
    if (this.renderBound === undefined) {
      return;
    }

    // if we're out of bounds, we're done
    if (boundInsideBound(this.renderBound, this.strictBound) === false) {
      return;
    }

    // clipping is enabled and we are in bounds create our own bounds
    const { x, y, w, h } = this.props;

    // Pick the global transform if available, otherwise use the local transform
    // global transform is only available if the node in an RTT chain
    const { tx, ty } = this.sceneGlobalTransform || this.globalTransform || {};
    const _x = tx ?? x;
    const _y = ty ?? y;
    this.strictBound = createBound(_x, _y, _x + w, _y + h, this.strictBound);

    this.preloadBound = createPreloadBounds(
      this.strictBound,
      this.boundsMargin as [number, number, number, number],
    );
  }

  updateRenderState(renderState: CoreNodeRenderState) {
    if (renderState === this.renderState) {
      return;
    }

    const previous = this.renderState;
    this.renderState = renderState;
    const event = CoreNodeRenderStateMap.get(renderState);
    assertTruthy(event);
    this.emit(event, {
      previous,
      current: renderState,
    });
  }

  /**
   * Updates the `isRenderable` property based on various conditions.
   */
  updateIsRenderable() {
    let newIsRenderable = false;
    let needsTextureOwnership = false;

    // If the node is out of bounds or has an alpha of 0, it is not renderable
    if (
      this.worldAlpha === 0 ||
      this.renderState <= CoreNodeRenderState.OutOfBounds
    ) {
      this.updateTextureOwnership(false);
      this.setRenderable(false);
      return;
    }

    if (this.texture !== null) {
      needsTextureOwnership = true;

      // we're only renderable if the texture state is loaded
      newIsRenderable = this.texture.state === 'loaded';
    } else if (
      // check shader
      (this.props.shader !== null || this.hasColorProps === true) &&
      // check dimensions
      (this.props.w !== 0 && this.props.h !== 0) === true
    ) {
      // This mean we have dimensions and a color set, so we can render a ColorTexture
      if (
        this.stage.defaultTexture &&
        this.stage.defaultTexture.state === 'loaded'
      ) {
        newIsRenderable = true;
      }
    }

    this.updateTextureOwnership(needsTextureOwnership);
    this.setRenderable(newIsRenderable);
  }

  /**
   * Sets the renderable state and triggers changes if necessary.
   * @param isRenderable - The new renderable state
   */
  setRenderable(isRenderable: boolean) {
    this.isRenderable = isRenderable;
    if (
      isRenderable === true &&
      this.stage.calculateTextureCoord === true &&
      this.textureCoords === undefined
    ) {
      this.updateTextureCoords = true;
    }
  }

  /**
   * Changes the renderable state of the node.
   */
  updateTextureOwnership(isRenderable: boolean) {
    this.texture?.setRenderableOwner(this, isRenderable);
  }

  calculateRenderCoords() {
    const { w, h } = this.props;

    const g = this.globalTransform!;
    const tx = g.tx,
      ty = g.ty,
      ta = g.ta,
      tb = g.tb,
      tc = g.tc,
      td = g.td;
    if (tb === 0 && tc === 0) {
      const minX = tx;
      const maxX = tx + w * ta;
      const minY = ty;
      const maxY = ty + h * td;
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
        tx + w * ta,
        ty + w * tc,
        //bottom-right
        tx + w * ta + h * tb,
        ty + w * tc + h * td,
        //bottom-left
        tx + h * tb,
        ty + h * td,
        this.renderCoords,
      );
    }
    if (this.sceneGlobalTransform === undefined) {
      return;
    }

    const {
      tx: stx,
      ty: sty,
      ta: sta,
      tb: stb,
      tc: stc,
      td: std,
    } = this.sceneGlobalTransform;
    if (stb === 0 && stc === 0) {
      const minX = stx;
      const maxX = stx + w * sta;
      const minY = sty;
      const maxY = sty + h * std;
      this.sceneRenderCoords = RenderCoords.translate(
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
        this.sceneRenderCoords,
      );
    } else {
      this.sceneRenderCoords = RenderCoords.translate(
        //top-left
        stx,
        sty,
        //top-right
        stx + w * sta,
        sty + w * stc,
        //bottom-right
        stx + w * sta + h * stb,
        sty + w * stc + h * std,
        //bottom-left
        stx + h * stb,
        sty + h * std,
        this.sceneRenderCoords,
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
    const { clippingRect, props, globalTransform: gt } = this;
    const { clipping } = props;
    const isRotated = gt!.tb !== 0 || gt!.tc !== 0;

    if (clipping === true && isRotated === false) {
      clippingRect.x = gt!.tx;
      clippingRect.y = gt!.ty;
      clippingRect.width = this.props.w * gt!.ta;
      clippingRect.height = this.props.h * gt!.td;
      clippingRect.valid = true;
    } else {
      clippingRect.valid = false;
    }

    if (parentClippingRect.valid === true && clippingRect.valid === true) {
      // Intersect parent clipping rect with node clipping rect
      intersectRect(parentClippingRect, clippingRect, clippingRect);
    } else if (parentClippingRect.valid === true) {
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
    if (this.destroyed === true) {
      return;
    }

    this.removeAllListeners();

    this.destroyed = true;
    this.unloadTexture();
    this.isRenderable = false;
    if (this.hasShaderTimeFn === true) {
      this.stage.untrackTimedNode(this);
    }

    // Kill children
    while (this.children.length > 0) {
      this.children[0]!.destroy();
    }

    const parent = this.parent;
    if (parent !== null) {
      const index = parent.children.indexOf(this);
      parent.children.splice(index, 1);
      parent.setUpdateType(
        UpdateType.Children | UpdateType.ZIndexSortedChildren,
      );
    }

    this.props.parent = null;
    this.props.texture = null;

    if (this.rtt === true) {
      this.stage.renderer.removeRTTNode(this);
    }
  }

  renderQuads(renderer: CoreRenderer): void {
    if (this.parentHasRenderTexture === true) {
      const rtt = renderer.renderToTextureActive;
      if (rtt === false || this.parentRenderTexture !== renderer.activeRttNode)
        return;
    }

    const p = this.props;
    const t = this.globalTransform!;
    const coords = this.renderCoords;
    const texture = p.texture || this.stage.defaultTexture;

    renderer.addQuad({
      width: p.w,
      height: p.h,
      colorTl: this.premultipliedColorTl,
      colorTr: this.premultipliedColorTr,
      colorBl: this.premultipliedColorBl,
      colorBr: this.premultipliedColorBr,
      texture,
      textureOptions: p.textureOptions,
      textureCoords: this.textureCoords,
      shader: p.shader as CoreShaderNode<any>,
      alpha: this.worldAlpha,
      clippingRect: this.clippingRect,
      tx: t.tx,
      ty: t.ty,
      ta: t.ta,
      tb: t.tb,
      tc: t.tc,
      td: t.td,
      renderCoords: coords,
      rtt: p.rtt,
      zIndex: this.calcZIndex,
      parentHasRenderTexture: this.parentHasRenderTexture,
      framebufferDimensions: this.parentHasRenderTexture
        ? this.parentFramebufferDimensions
        : null,
      time: this.hasShaderTimeFn === true ? this.getTimerValue() : null,
    });
  }

  getTimerValue(): number {
    if (typeof this.shader!.time === 'function') {
      return this.shader!.time(this.stage);
    }
    return this.stage.elapsedTime;
  }

  //#region Properties
  get id(): number {
    return this._id;
  }

  get data(): CustomDataMap | undefined {
    return this.props.data;
  }

  set data(d: CustomDataMap | undefined) {
    this.props.data = d;
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
      -this.props.w * this.props.mountX +
      (this.props.parent?.absX || this.props.parent?.globalTransform?.tx || 0)
    );
  }

  get absY(): number {
    return (
      this.props.y +
      -this.props.h * this.props.mountY +
      (this.props.parent?.absY ?? 0)
    );
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

  get w(): number {
    return this.props.w;
  }

  set w(value: number) {
    if (this.props.w !== value) {
      this.textureCoords = undefined;
      this.props.w = value;
      this.setUpdateType(UpdateType.Local);

      if (this.props.rtt === true) {
        this.framebufferDimensions!.w = value;
        this.texture = this.stage.txManager.createTexture(
          'RenderTexture',
          this.framebufferDimensions!,
        );

        this.setUpdateType(UpdateType.RenderTexture);
      }
    }
  }

  get h(): number {
    return this.props.h;
  }

  set h(value: number) {
    if (this.props.h !== value) {
      this.textureCoords = undefined;
      this.props.h = value;
      this.setUpdateType(UpdateType.Local);

      if (this.props.rtt === true) {
        this.framebufferDimensions!.h = value;
        this.texture = this.stage.txManager.createTexture(
          'RenderTexture',
          this.framebufferDimensions!,
        );

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
      this.setUpdateType(UpdateType.Local);
    }
  }

  get scaleY(): number {
    return this.props.scaleY;
  }

  set scaleY(value: number) {
    if (this.props.scaleY !== value) {
      this.props.scaleY = value;
      this.setUpdateType(UpdateType.Local);
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
      this.setUpdateType(UpdateType.Local);
    }
  }

  get alpha(): number {
    return this.props.alpha;
  }

  set alpha(value: number) {
    this.props.alpha = value;
    this.setUpdateType(
      UpdateType.PremultipliedColors |
        UpdateType.WorldAlpha |
        UpdateType.Children |
        UpdateType.IsRenderable,
    );
    this.childUpdateType |= UpdateType.WorldAlpha;
  }

  get autosize(): boolean {
    return this.props.autosize;
  }

  set autosize(value: boolean) {
    this.props.autosize = value;
  }

  get boundsMargin(): number | [number, number, number, number] | null {
    const props = this.props;
    if (props.boundsMargin !== null) {
      return props.boundsMargin;
    }

    const parent = this.parent;
    if (parent !== null) {
      const margin = parent.boundsMargin;
      if (margin !== undefined) {
        return margin;
      }
    }

    return this.stage.boundsMargin;
  }

  set boundsMargin(value: number | [number, number, number, number] | null) {
    if (value === this.props.boundsMargin) {
      return;
    }

    if (value === null) {
      this.props.boundsMargin = value;
    } else {
      const bm: [number, number, number, number] = Array.isArray(value)
        ? value
        : [value, value, value, value];

      this.props.boundsMargin = bm;
    }
    this.setUpdateType(UpdateType.RenderBounds);
  }

  get clipping(): boolean {
    return this.props.clipping;
  }

  set clipping(value: boolean) {
    this.props.clipping = value;
    this.setUpdateType(
      UpdateType.Clipping | UpdateType.RenderBounds | UpdateType.Children,
    );
    this.childUpdateType |= UpdateType.Global | UpdateType.Clipping;
  }

  get color(): number {
    return this.props.color;
  }

  set color(value: number) {
    const p = this.props;
    if (p.color === value) return;

    p.color = value;

    const has = value > 0;
    this.hasColorProps = has;

    if (p.colorTop !== value) this.colorTop = value;
    if (p.colorBottom !== value) this.colorBottom = value;
    if (p.colorLeft !== value) this.colorLeft = value;
    if (p.colorRight !== value) this.colorRight = value;

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
    this.hasColorProps = value > 0;
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
    this.hasColorProps = value > 0;
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
    this.hasColorProps = value > 0;
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
    this.hasColorProps = value > 0;
    this.setUpdateType(UpdateType.PremultipliedColors);
  }

  get colorTl(): number {
    return this.props.colorTl;
  }

  set colorTl(value: number) {
    this.props.colorTl = value;
    this.hasColorProps = value > 0;
    this.setUpdateType(UpdateType.PremultipliedColors);
  }

  get colorTr(): number {
    return this.props.colorTr;
  }

  set colorTr(value: number) {
    this.props.colorTr = value;
    this.hasColorProps = value > 0;
    this.setUpdateType(UpdateType.PremultipliedColors);
  }

  get colorBl(): number {
    return this.props.colorBl;
  }

  set colorBl(value: number) {
    this.props.colorBl = value;
    this.hasColorProps = value > 0;
    this.setUpdateType(UpdateType.PremultipliedColors);
  }

  get colorBr(): number {
    return this.props.colorBr;
  }

  set colorBr(value: number) {
    this.props.colorBr = value;
    this.hasColorProps = value > 0;
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
    for (let i = 0, length = this.children.length; i < length; i++) {
      this.children[i]!.setUpdateType(UpdateType.CalculatedZIndex);
    }
  }

  get zIndex(): number {
    return this.props.zIndex;
  }

  set zIndex(value: number) {
    this.props.zIndex = value;
    this.setUpdateType(UpdateType.CalculatedZIndex | UpdateType.Children);
    for (let i = 0, length = this.children.length; i < length; i++) {
      this.children[i]!.setUpdateType(UpdateType.CalculatedZIndex);
    }
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

      // If the new parent has an RTT enabled, apply RTT inheritance
      if (newParent.rtt || newParent.parentHasRenderTexture) {
        this.applyRTTInheritance(newParent);
      }
    }

    // fetch render bounds from parent
    this.setUpdateType(UpdateType.RenderBounds | UpdateType.Children);
  }

  get rtt(): boolean {
    return this.props.rtt;
  }

  set rtt(value: boolean) {
    if (this.props.rtt === value) {
      return;
    }
    this.props.rtt = value;

    if (value === true) {
      this.initRenderTexture();
      this.markChildrenWithRTT();
    } else {
      this.cleanupRenderTexture();
    }

    this.setUpdateType(UpdateType.RenderTexture);

    if (this.parentHasRenderTexture === true) {
      this.notifyParentRTTOfUpdate();
    }
  }
  private initRenderTexture() {
    this.framebufferDimensions = {
      w: this.props.w,
      h: this.props.h,
    };
    this.texture = this.stage.txManager.createTexture(
      'RenderTexture',
      this.framebufferDimensions,
    );
    this.stage.renderer.renderToTexture(this);
  }

  private cleanupRenderTexture() {
    this.unloadTexture();
    this.clearRTTInheritance();

    this.hasRTTupdates = false;
    this.texture = null;
    this.framebufferDimensions = null;
  }

  private markChildrenWithRTT(node: CoreNode | null = null) {
    const parent = node || this;

    for (const child of parent.children) {
      child.setUpdateType(UpdateType.All);
      child.parentHasRenderTexture = true;
      child.markChildrenWithRTT();
    }
  }

  // Apply RTT inheritance when a node has an RTT-enabled parent
  private applyRTTInheritance(parent: CoreNode) {
    if (parent.rtt) {
      // Only the RTT node should be added to `renderToTexture`
      parent.setUpdateType(UpdateType.RenderTexture);
    }

    // Propagate `parentHasRenderTexture` downwards
    this.markChildrenWithRTT(parent);
  }

  // Clear RTT inheritance when detaching from an RTT chain
  private clearRTTInheritance() {
    // if this node is RTT itself stop the propagation important for nested RTT nodes
    // for the initial RTT node this is already handled in `set rtt`
    if (this.rtt) {
      return;
    }

    for (const child of this.children) {
      // force child to update everything as the RTT inheritance has changed
      child.parentHasRenderTexture = false;
      child.rttParent = null;
      child.setUpdateType(UpdateType.All);
      child.clearRTTInheritance();
    }
  }

  get shader(): CoreShaderNode<any> | null {
    return this.props.shader;
  }

  set shader(shader: CoreShaderNode<any> | null) {
    if (this.props.shader === shader) {
      return;
    }
    if (shader === null) {
      this.hasShaderUpdater = false;
      this.props.shader = this.stage.defShaderNode;
      this.setUpdateType(UpdateType.IsRenderable);
      return;
    }
    if (shader.shaderKey !== 'default') {
      this.hasShaderUpdater = shader.update !== undefined;
      this.hasShaderTimeFn = shader.time !== undefined;
      shader.attachNode(this);
    }

    if (this.hasShaderTimeFn === true) {
      this.stage.trackTimedNode(this);
    } else {
      this.stage.untrackTimedNode(this);
    }
    this.props.shader = shader;
    this.setUpdateType(UpdateType.IsRenderable | UpdateType.RecalcUniforms);
  }

  get src(): string | null {
    return this.props.src;
  }

  set src(imageUrl: string | null) {
    if (this.props.src === imageUrl) {
      return;
    }

    this.props.src = imageUrl;

    if (!imageUrl) {
      this.texture = null;
      return;
    }

    this.texture = this.stage.txManager.createTexture('ImageTexture', {
      src: imageUrl,
      w: this.props.w,
      h: this.props.h,
      type: this.props.imageType,
      sx: this.props.srcX,
      sy: this.props.srcY,
      sw: this.props.srcWidth,
      sh: this.props.srcHeight,
    });
  }

  set imageType(type: 'regular' | 'compressed' | 'svg' | null) {
    if (this.props.imageType === type) {
      return;
    }

    this.props.imageType = type;
  }

  get imageType() {
    return this.props.imageType || null;
  }

  get srcHeight(): number | undefined {
    return this.props.srcHeight;
  }

  set srcHeight(value: number) {
    this.props.srcHeight = value;
  }

  get srcWidth(): number | undefined {
    return this.props.srcWidth;
  }

  set srcWidth(value: number) {
    this.props.srcWidth = value;
  }

  get srcX(): number | undefined {
    return this.props.srcX;
  }

  set srcX(value: number) {
    this.props.srcX = value;
  }

  get srcY(): number | undefined {
    return this.props.srcY;
  }

  set srcY(value: number) {
    this.props.srcY = value;
  }

  /**
   * Returns the framebuffer dimensions of the RTT parent
   */
  get parentFramebufferDimensions(): Dimensions {
    if (this.rttParent !== null) {
      return this.rttParent.framebufferDimensions as Dimensions;
    }
    this.rttParent = this.findParentRTTNode() as CoreNode;
    return this.rttParent.framebufferDimensions as Dimensions;
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

  set texture(value: Texture | null) {
    if (this.props.texture === value) {
      return;
    }

    const oldTexture = this.props.texture;
    if (oldTexture) {
      this.unloadTexture();
    }

    this.textureCoords = undefined;
    this.props.texture = value;
    if (value !== null) {
      value.setRenderableOwner(this, this.isRenderable);
      this.loadTexture();
    }

    this.setUpdateType(UpdateType.IsRenderable);
  }

  set textureOptions(value: TextureOptions) {
    this.props.textureOptions = value;
  }

  get textureOptions(): TextureOptions {
    return this.props.textureOptions;
  }

  set interactive(value: boolean | undefined) {
    this.props.interactive = value;
    // Update Stage's interactive Set
    if (value === true) {
      this.stage.interactiveNodes.add(this);
    }
  }

  get interactive(): boolean | undefined {
    return this.props.interactive;
  }

  setRTTUpdates(type: number) {
    this.hasRTTupdates = true;
    this.parent?.setRTTUpdates(type);
  }

  get strictBounds(): boolean {
    return this.props.strictBounds;
  }

  set strictBounds(v) {
    if (v === this.props.strictBounds) {
      return;
    }

    this.props.strictBounds = v;
    this.setUpdateType(UpdateType.RenderBounds | UpdateType.Children);
    this.childUpdateType |= UpdateType.RenderBounds | UpdateType.Children;
  }

  animate(
    props: Partial<CoreNodeAnimateProps>,
    settings: Partial<AnimationSettings>,
  ): IAnimationController {
    const animation = new CoreAnimation(this, props, settings);

    const controller = new CoreAnimationController(
      this.stage.animationManager,
      animation,
    );

    return controller;
  }

  flush() {
    // no-op
  }

  //#endregion Properties
}
