import type { RenderProps } from '../renderProperties.js';
import type { RendererMain } from './RendererMain.js';
import { SpecialElementId } from './SpecialElementId.js';

export interface PrimitiveProps extends RenderProps {
  src: string;
}

/**
 * Main thread representation/abstraction of a rendered primitive element
 *
 * @privateRemarks
 * While we might want to call this "Element" I've decided to call it `Primitive` to avoid confusion
 * with the DOM `Element` type which is also available in the global scope. -Frank
 */
export class Primitive {
  private rendererMain: RendererMain;
  readonly id: number;
  readonly props: PrimitiveProps;

  /**
   * Mutable array of this primitive's children
   */
  private _children: Primitive[] = [];
  /**
   * Read-only array of this primitive's children
   */
  readonly children: readonly Primitive[] = this._children;

  /**
   * Mutations that are pending to be applied to the props
   */
  private pendingMutations: Partial<PrimitiveProps> = {};

  constructor(rendererMain: RendererMain, props: Partial<PrimitiveProps>) {
    this.rendererMain = rendererMain;
    if (!props.elementId) {
      throw new Error('elementId is required');
    }
    this.id = props.elementId;

    this.props = {
      memBlockIndex: props.memBlockIndex ?? 0,
      elementId: props.elementId,
      parentId: props.parentId ?? SpecialElementId.Detached,
      w: props.w ?? 0,
      h: props.h ?? 0,
      x: props.x ?? 0,
      y: props.y ?? 0,
      z: props.z ?? 0,
      color: props.color ?? 0xffffffff,
      alpha: props.alpha ?? 0,
      parentAlpha: props.parentAlpha ?? 0,
      rotation: props.rotation ?? 0,
      pivotX: props.pivotX ?? 0,
      pivotY: props.pivotY ?? 0,
      scaleX: props.scaleX ?? 0,
      scaleY: props.scaleY ?? 0,
      mountX: props.mountX ?? 0,
      mountY: props.mountY ?? 0,
      visible: props.visible ?? 0,
      zIndex: props.zIndex ?? 0,
      clippingX: props.clippingX ?? 0,
      clippingY: props.clippingY ?? 0,
      clippingW: props.clippingW ?? 0,
      clippingH: props.clippingH ?? 0,
      renderToTexture: props.renderToTexture ?? 0,
      shaderId: props.shaderId ?? 0,

      // PrimitiveProps
      src: props.src ?? '',
    };

    // Add this primative to the parent's children
    if (this.props.parentId !== SpecialElementId.Detached) {
      const parent = this.rendererMain.getPrimitiveById(this.props.parentId);
      if (parent) {
        parent._addChild(this);
      }
    }

    // Don't create the primitive on the renderer worker if it's the root element
    // since it should already be created
    if (props.elementId > SpecialElementId.Root) {
      rendererMain.driver.createPrimitiveRaw(this);
    }
  }

  get parent(): Primitive | null {
    return this.rendererMain.getPrimitiveById(this.props.parentId);
  }

  set parent(newParent: Primitive | null) {
    // If the new parent is different from the current parent
    // remove this primitive from the current parent's children
    const oldParent = this.parent;
    if (oldParent && newParent !== oldParent) {
      oldParent._removeChild(this);
    }
    if (newParent === null) {
      this.props.parentId = SpecialElementId.Detached;
    } else {
      this.props.parentId = newParent.id;
      newParent._addChild(this);
    }
    this.pendingMutations.parentId = this.props.parentId;
    this.mutate();
  }

  addChild(child: Primitive): void {
    child.parent = this;
  }

  removeChild(child: Primitive): void {
    child.parent = null;
  }

  destroy(): void {
    this.parent = null;
    this.rendererMain.driver.destroyPrimitiveRaw(this);
  }

  //#region Properties
  get memBlockIndex(): number {
    return this.props.memBlockIndex;
  }

  get parentId(): number {
    return this.props.parentId;
  }

  get w(): number {
    return this.props.w;
  }

  set w(value: number) {
    this.props.w = value;
    this.pendingMutations.w = value;
    // TODO: Think about triggering mutate() via queueMicrotask for performance
    this.mutate();
  }

  get h(): number {
    return this.props.h;
  }

  set h(value: number) {
    this.props.h = value;
    this.pendingMutations.h = value;
    // TODO: Think about triggering mutate() via queueMicrotask for performance
    this.mutate();
  }

  get x(): number {
    return this.props.x;
  }

  set x(value: number) {
    this.props.x = value;
    this.pendingMutations.x = value;
    // TODO: Think about triggering mutate() via queueMicrotask for performance
    this.mutate();
  }

  get y(): number {
    return this.props.y;
  }

  set y(value: number) {
    this.props.y = value;
    this.pendingMutations.y = value;
    // TODO: Think about triggering mutate() via queueMicrotask for performance
    this.mutate();
  }

  get z(): number {
    return this.props.z;
  }

  set z(value: number) {
    this.props.z = value;
    this.pendingMutations.z = value;
    // TODO: Think about triggering mutate() via queueMicrotask for performance
    this.mutate();
  }

  get color(): number {
    return this.props.color;
  }

  set color(value: number) {
    this.props.color = value;
    this.pendingMutations.color = value;
    // TODO: Think about triggering mutate() via queueMicrotask for performance
    this.mutate();
  }

  get alpha(): number {
    return this.props.alpha;
  }

  set alpha(value: number) {
    this.props.alpha = value;
    this.pendingMutations.alpha = value;
    // TODO: Think about triggering mutate() via queueMicrotask for performance
    this.mutate();
  }

  set src(value: string) {
    this.props.src = value;
    this.pendingMutations.src = value;
    this.mutate();
  }

  get src(): string {
    return this.props.src;
  }

  get parentAlpha(): number {
    return this.props.parentAlpha;
  }

  get rotation(): number {
    return this.props.rotation;
  }

  get pivotX(): number {
    return this.props.pivotX;
  }

  get pivotY(): number {
    return this.props.pivotY;
  }

  get scaleX(): number {
    return this.props.scaleX;
  }

  get scaleY(): number {
    return this.props.scaleY;
  }

  get mountX(): number {
    return this.props.mountX;
  }

  get mountY(): number {
    return this.props.mountY;
  }

  get visible(): number {
    return this.props.visible;
  }

  get zIndex(): number {
    return this.props.zIndex;
  }

  get clippingX(): number {
    return this.props.clippingX;
  }

  get clippingY(): number {
    return this.props.clippingY;
  }

  get clippingW(): number {
    return this.props.clippingW;
  }

  get clippingH(): number {
    return this.props.clippingH;
  }

  get renderToTexture(): number {
    return this.props.renderToTexture;
  }

  get shaderId(): number {
    return this.props.shaderId;
  }
  //#endregion

  //#region Protected/Private methods
  /**
   * Takes the prending mutations, sends them to the renderer, then
   * clears the pending mutations.
   */
  private mutate(): void {
    this.rendererMain.driver.mutatePrimitiveRaw(this, this.pendingMutations);
    this.pendingMutations = {};
  }

  /**
   * Add a child from this primitive's children array
   *
   * @remarks
   * Only to be used by public methods that mutate the children array
   *
   * @param child
   */
  private _addChild(child: Primitive): void {
    this._children.push(child);
  }

  /**
   * Remove a child from this primitive's children array
   *
   * @remarks
   * Only to be used by public methods that mutate the children array
   *
   * @param child
   */
  private _removeChild(child: Primitive): void {
    const index = this.children.indexOf(child);
    if (index >= 0) {
      this._children.splice(index, 1);
    }
  }
  //#endregion Protected/Private methods
}
