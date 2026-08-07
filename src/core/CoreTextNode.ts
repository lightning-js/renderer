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
  FontHandler,
  TextRenderer,
  TrProps,
  TextRenderInfo,
  SdfVertexCache,
} from './text-rendering/TextRenderer.js';
import {
  CoreNode,
  CoreNodeRenderState,
  UpdateType,
  type CoreNodeProps,
} from './CoreNode.js';
import type { Stage } from './Stage.js';
import type {
  NodeTextFailedPayload,
  NodeTextLoadedPayload,
  NodeTextureLoadedPayload,
} from '../common/CommonTypes.js';
import type { RectWithValid } from './lib/utils.js';
import type { CoreRenderer } from './renderers/CoreRenderer.js';
import type { TextureLoadedEventHandler } from './textures/Texture.js';
import { Matrix3d } from './lib/Matrix3d.js';
import type { WebGlCtxTexture } from './renderers/webgl/WebGlCtxTexture.js';
export interface CoreTextNodeProps extends CoreNodeProps, TrProps {
  /**
   * Force Text Node to use a specific Text Renderer
   */
  textRendererOverride?: string | null;
  forceLoad: boolean;
}

export enum TextConstraint {
  'none' = 0,
  'width' = 1,
  'height' = 2,
  'both' = 3,
}

export class CoreTextNode extends CoreNode implements CoreTextNodeProps {
  private textRenderer: TextRenderer;
  private fontHandler: FontHandler;

  private _layoutGenerated = false;
  private _waitingForFont = false;
  private _containType: TextConstraint = TextConstraint.none;

  private _sdfCache: SdfVertexCache | null = null;

  // Text renderer properties - stored directly on the node
  textProps: CoreTextNodeProps;

  private _renderInfo: TextRenderInfo | null = null;

  constructor(
    stage: Stage,
    props: CoreTextNodeProps,
    textRenderer: TextRenderer,
  ) {
    super(stage, props);
    this.textRenderer = textRenderer;
    this.fontHandler = textRenderer.font;

    // Initialize text properties from props
    // Props are guaranteed to have all defaults resolved by Stage.createTextNode
    this.textProps = props;
    this._containType = TextConstraint[props.contain];

    this.setUpdateType(UpdateType.All);
  }

  protected override onTextureLoaded: TextureLoadedEventHandler = (
    _,
    dimensions,
  ) => {
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
    this.setUpdateType(UpdateType.IsRenderable);
  };

  /**
   * Drop the cached SDF vertex data. The GPU buffers are shared (owned by the
   * renderer), so this only frees the per-node CPU snapshot. Safe to call from
   * destroy(), on text change, or when the node leaves the viewport.
   */
  private releaseSdfCache(): void {
    this._sdfCache = null;
  }

  allowTextGeneration() {
    const p = this.props.parent;
    if (p === null) {
      return false;
    }
    if (p.worldAlpha > 0 && p.renderState > CoreNodeRenderState.OutOfBounds) {
      return true;
    }
    return false;
  }

  override updateLocalTransform() {
    const p = this.props;
    let { x, y, w, h } = p;
    const mountX = p.mountX;
    const mountY = p.mountY;
    let mountTranslateX = p.mountX * w;
    let mountTranslateY = p.mountY * h;

    let localTextTransform: Matrix3d | null = null;

    const tProps = this.textProps;
    const { textAlign, verticalAlign, maxWidth, maxHeight } = tProps;
    const contain = this._containType;

    const hasMaxWidth = maxWidth > 0;
    const hasMaxHeight = maxHeight > 0;

    if (contain > 0 && (hasMaxWidth || hasMaxHeight)) {
      let containX = 0;
      let containY = 0;
      if (contain & TextConstraint.width && hasMaxWidth === true) {
        if (textAlign === 'right') {
          containX = maxWidth - w;
        } else if (textAlign === 'center') {
          containX = (maxWidth - w) * 0.5;
        }
        mountTranslateX = mountX * maxWidth;
      }
      if (contain & TextConstraint.height && maxHeight > 0) {
        if (verticalAlign === 'bottom') {
          containY = maxHeight - h;
        } else if (verticalAlign === 'middle') {
          containY = (maxHeight - h) * 0.5;
        }
        mountTranslateY = mountY * maxHeight;
      }
      localTextTransform = Matrix3d.translate(containX, containY);
    }

    if (p.rotation !== 0 || p.scaleX !== 1 || p.scaleY !== 1) {
      const scaleRotate = Matrix3d.rotate(p.rotation).scale(p.scaleX, p.scaleY);
      const pivotW =
        contain & TextConstraint.width && maxWidth > 0 ? maxWidth : w;
      const pivotH =
        contain & TextConstraint.height && maxHeight > 0 ? maxHeight : h;
      const pivotTranslateX = p.pivotX * pivotW;
      const pivotTranslateY = p.pivotY * pivotH;

      this.localTransform = Matrix3d.translate(
        x - mountTranslateX + pivotTranslateX,
        y - mountTranslateY + pivotTranslateY,
        this.localTransform,
      )
        .multiply(scaleRotate)
        .translate(-pivotTranslateX, -pivotTranslateY);
    } else {
      this.localTransform = Matrix3d.translate(
        x - mountTranslateX,
        y - mountTranslateY,
        this.localTransform,
      );
    }

    if (localTextTransform !== null) {
      this.localTransform = this.localTransform.multiply(localTextTransform);
    }
  }

  /**
   * Override CoreNode's update method to handle text-specific updates
   */
  override update(delta: number, parentClippingRect: RectWithValid): void {
    const hasValidText =
      typeof this.textProps.text === 'string' && this.textProps.text.length > 0;

    if (
      hasValidText === true &&
      (this.textProps.forceLoad === true ||
        this.allowTextGeneration() === true) &&
      this._layoutGenerated === false
    ) {
      if (this.fontHandler.isFontLoaded(this.textProps.fontFamily) === true) {
        this._waitingForFont = false;
        this._renderInfo = null; // Clear any previous render info before generating new layout
        this.releaseSdfCache(); // Drop the stale SDF vertex cache
        const resp = this.textRenderer.renderText(this.textProps);
        this.handleRenderResult(resp);
        this._layoutGenerated = true;
      } else if (this._waitingForFont === false) {
        this.fontHandler.waitingForFont(this.textProps.fontFamily, this);
        this._waitingForFont = true;
      }
    } else if (hasValidText === false) {
      this.props.w = 0;
      this.props.h = 0;
      // If text is invalid, ensure node is not renderable
      this.setRenderable(false);
      this._layoutGenerated = false;
      this._renderInfo = null;
      this.releaseSdfCache(); // Drop the stale SDF vertex cache
    }

    // First run the standard CoreNode update
    super.update(delta, parentClippingRect);
  }

  /**
   * Override is renderable check for SDF text nodes
   */
  override updateIsRenderable(): void {
    // Guard: Text nodes are never renderable without valid text
    const hasValidText =
      typeof this.textProps.text === 'string' && this.textProps.text.length > 0;

    const renderInfo = this._renderInfo;
    if (hasValidText === false || renderInfo === null) {
      this.setRenderable(false);
      return;
    }

    // SDF text nodes are always renderable if they have a valid layout
    if (renderInfo.type === 'canvas') {
      super.updateIsRenderable();
      return;
    }
    this.setRenderable(true);
  }

  /**
   * Handle the result of text rendering for both Canvas and SDF renderers
   */
  private handleRenderResult(result: TextRenderInfo): void {
    // Host paths on top
    const textRendererType = result.type;
    let width = result.width;
    let height = result.height;

    // Handle zero-dimension case (can happen with certain text inputs or font issues)
    if (width === 0 || height === 0) {
      this.emit('failed', {
        type: 'text',
        error: new Error('Text rendering failed, width or height zero'),
      } satisfies NodeTextFailedPayload);
      return;
    }

    // Handle Canvas renderer (uses ImageData)
    if (textRendererType === 'canvas') {
      if (result.imageData === undefined) {
        this.emit('failed', {
          type: 'text',
          error: new Error(
            'Canvas text rendering failed, no image data returned',
          ),
        } satisfies NodeTextFailedPayload);
        return;
      }

      this.texture = this.stage.txManager.createTexture('ImageTexture', {
        premultiplyAlpha: true,
        src: result.imageData,
      });

      this.props.w = width;
      this.props.h = height;
      // It isn't renderable until the texture is loaded we have to set it to false here to avoid it
      // being detected as a renderable default color node in the next frame
      // it will be corrected once the texture is loaded
      this.setRenderable(false);

      if (this.renderState > CoreNodeRenderState.OutOfBounds) {
        // We do want the texture to load immediately
        this.texture.setRenderableOwner(this._id, true);
      }
    } else {
      const layout = result.layout;
      // For SDF, we rely on the presence of a valid layout to determine renderability
      if (layout === undefined) {
        this.emit('failed', {
          type: 'text',
          error: new Error(
            'SDF text rendering failed, no layout data returned',
          ),
        } satisfies NodeTextFailedPayload);
        return;
      }

      this.props.w = width;
      this.props.h = height;
      this.setUpdateType(UpdateType.Local);
      this.setRenderable(true);
      this.numQuads = layout.totalQuadCount;

      // Fresh CPU vertex cache — the previous one (if any) was tied to the old
      // layout and would only be evicted via a layoutRef mismatch anyway.
      this._sdfCache = {
        vertices: null,
        glyphCount: 0,
        color: 0,
        alpha: 0,
        transform: new Float32Array(6),
        layoutRef: null,
        lastStartQuad: 0,
        lastWriteDirty: false,
      };

      this.renderOpTextures = [result.atlasTexture as WebGlCtxTexture];
    }

    this._renderInfo = result;
    queueMicrotask(this.emitTextLoadedEvent);
  }

  // Reusable bound method for emitting loaded event
  private emitTextLoadedEvent = () => {
    if (this._renderInfo === null) return; // Guard against unexpected null

    this.emit('loaded', {
      type: 'text',
      dimensions: {
        w: this._renderInfo.width,
        h: this._renderInfo.height,
      },
    } satisfies NodeTextLoadedPayload);
  };

  /**
   * Override renderQuads to handle SDF vs Canvas rendering
   */
  override renderQuads(renderer: CoreRenderer): void {
    if (this.parentHasRenderTexture === true) {
      const rtt = renderer.renderToTextureActive;
      if (rtt === false || this.parentRenderTexture !== renderer.activeRttNode)
        return;
    }

    // Early return if no renderInfo
    if (this._renderInfo === null) {
      return;
    }

    // Canvas renderer: use standard texture rendering via CoreNode
    if (this._renderInfo.type === 'canvas') {
      super.renderQuads(renderer);
      return;
    }

    // SDF renderer: submit glyphs into the renderer's shared batched SDF
    // buffer. The renderer merges consecutive text nodes into a single draw
    // call (see WebGlRenderer.addSdfQuads / finalizeSdfBatch).
    const layout = this._renderInfo.layout;
    this.textRenderer.renderQuads(renderer, layout, null, {
      fontFamily: this.textProps.fontFamily,
      fontSize: this.textProps.fontSize,
      color: this.props.color,
      offsetY: this.textProps.offsetY,
      worldAlpha: this.worldAlpha,
      globalTransform: this.globalTransform!.getFloatArr(),
      clippingRect: this.clippingRect,
      width: layout.width,
      height: layout.height,
      parentHasRenderTexture: this.parentHasRenderTexture,
      framebufferDimensions: this.parentFramebufferDimensions,
      stage: this.stage,
      sdfCache: this._sdfCache ?? undefined,
    });
  }

  override updateRenderState(renderState: CoreNodeRenderState): void {
    super.updateRenderState(renderState);
    if (
      this._renderInfo !== null &&
      this._renderInfo.type === 'sdf' &&
      renderState === CoreNodeRenderState.OutOfBounds
    ) {
      this.releaseSdfCache();
    }
  }

  override destroy(): void {
    if (this._waitingForFont === true && this.fontHandler) {
      this.fontHandler.stopWaitingForFont(this.textProps.fontFamily, this);
    }

    // Clear cached layout and vertex cache
    this._renderInfo = null;
    this.releaseSdfCache();

    this.fontHandler = null!; // Clear reference to avoid memory leaks
    this.textRenderer = null!; // Clear reference to avoid memory leaks

    super.destroy();
  }

  override set w(value: number) {
    this.maxWidth = value;
  }

  override get w(): number {
    return this.props.w;
  }

  override set h(value: number) {
    this.maxHeight = value;
  }

  override get h(): number {
    return this.props.h;
  }

  get maxWidth() {
    return this.textProps.maxWidth;
  }

  set maxWidth(value: number) {
    if (this.textProps.maxWidth !== value) {
      this.textProps.maxWidth = value;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
    }
  }

  // Property getters and setters
  get maxHeight() {
    return this.textProps.maxHeight;
  }

  set maxHeight(value: number) {
    if (this.textProps.maxHeight !== value) {
      this.textProps.maxHeight = value;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get contain(): TrProps['contain'] {
    return this.textProps.contain;
  }

  set contain(value: TrProps['contain']) {
    if (this.textProps.contain !== value) {
      this.textProps.contain = value;
      this._containType = TextConstraint[value];
      this.setUpdateType(UpdateType.Local);
    }
  }

  get text(): string {
    return this.textProps.text;
  }

  set text(value: string) {
    let normalizedValue = value;
    if (value === undefined || value === null) {
      normalizedValue = '';
    } else if (typeof value !== 'string') {
      normalizedValue = String(value);
    }

    if (this.textProps.text !== normalizedValue) {
      this.textProps.text = normalizedValue;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get fontSize(): number {
    return this.textProps.fontSize;
  }

  set fontSize(value: number) {
    if (this.textProps.fontSize !== value) {
      this.textProps.fontSize = value;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get fontFamily(): string {
    return this.textProps.fontFamily;
  }

  set fontFamily(value: string) {
    if (this.textProps.fontFamily !== value) {
      if (this._waitingForFont === true) {
        this.fontHandler.stopWaitingForFont(this.textProps.fontFamily, this);
      }
      this.textProps.fontFamily = value;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get fontStyle(): TrProps['fontStyle'] {
    return this.textProps.fontStyle;
  }

  set fontStyle(value: TrProps['fontStyle']) {
    if (this.textProps.fontStyle !== value) {
      this.textProps.fontStyle = value;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get textAlign(): TrProps['textAlign'] {
    return this.textProps.textAlign;
  }

  set textAlign(value: TrProps['textAlign']) {
    if (this.textProps.textAlign !== value) {
      this.textProps.textAlign = value;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get letterSpacing(): number {
    return this.textProps.letterSpacing;
  }

  set letterSpacing(value: number) {
    if (this.textProps.letterSpacing !== value) {
      this.textProps.letterSpacing = value;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get lineHeight(): number {
    return this.textProps.lineHeight;
  }

  set lineHeight(value: number) {
    if (this.textProps.lineHeight !== value) {
      this.textProps.lineHeight = value;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get maxLines(): number {
    return this.textProps.maxLines;
  }

  set maxLines(value: number) {
    if (this.textProps.maxLines !== value) {
      this.textProps.maxLines = value;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get verticalAlign(): TrProps['verticalAlign'] {
    return this.textProps.verticalAlign;
  }

  set verticalAlign(value: TrProps['verticalAlign']) {
    if (this.textProps.verticalAlign !== value) {
      this.textProps.verticalAlign = value;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get overflowSuffix(): string {
    return this.textProps.overflowSuffix;
  }

  set overflowSuffix(value: string) {
    if (this.textProps.overflowSuffix !== value) {
      this.textProps.overflowSuffix = value;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get wordBreak(): TrProps['wordBreak'] {
    return this.textProps.wordBreak;
  }

  set wordBreak(value: TrProps['wordBreak']) {
    if (this.textProps.wordBreak !== value) {
      this.textProps.wordBreak = value;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get offsetY(): number {
    return this.textProps.offsetY;
  }

  set offsetY(value: number) {
    if (this.textProps.offsetY !== value) {
      this.textProps.offsetY = value;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get forceLoad() {
    return this.textProps.forceLoad;
  }

  set forceLoad(value: boolean) {
    if (this.textProps.forceLoad !== value) {
      this.textProps.forceLoad = value;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get richText(): boolean {
    return this.textProps.richText;
  }

  set richText(value: boolean) {
    if (this.textProps.richText !== value) {
      this.textProps.richText = value;
      this._layoutGenerated = false;
      this.setUpdateType(UpdateType.Local);
    }
  }

  get renderInfo(): TextRenderInfo | null {
    return this._renderInfo;
  }
}
