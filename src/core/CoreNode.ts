import { assertTruthy } from '../utils.js';
import type {
  ExtractProps,
  TextureMap,
  TextureOptions,
} from './CoreTextureManager.js';
import type { CoreRenderer } from './renderers/CoreRenderer.js';
import type { CoreShader } from './renderers/CoreShader.js';
import type { Stage } from './stage.js';
import type { Texture } from './textures/Texture.js';

export interface CoreNodeProps {
  id: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  alpha?: number;
  color?: number;
  parent?: CoreNode | null;
  zIndex?: number;
  texture?: Texture | null;
  textureOptions?: TextureOptions | null;
  shader?: CoreShader | null;
}

export class CoreNode {
  readonly children: CoreNode[] = [];
  private props: Required<CoreNodeProps>;

  constructor(private stage: Stage, props: CoreNodeProps) {
    this.props = {
      id: props.id,
      x: props.x ?? 0,
      y: props.y ?? 0,
      w: props.w ?? 0,
      h: props.h ?? 0,
      alpha: props.alpha ?? 0,
      color: props.color ?? 0,
      zIndex: props.zIndex ?? 0,
      parent: props.parent ?? null,
      texture: props.texture ?? null,
      textureOptions: props.textureOptions ?? null,
      shader: props.shader ?? null,
    };
  }

  loadTexture<Type extends keyof TextureMap>(
    textureType: Type,
    props: ExtractProps<TextureMap[Type]>,
    options: TextureOptions | null = null,
  ): void {
    const { txManager } = this.stage;
    this.props.texture = txManager.loadTexture(textureType, props, options);
    this.props.textureOptions = options;
  }

  unloadTexture(): void {
    this.props.texture = null;
    this.props.textureOptions = null;
  }

  update(delta: number): void {
    // TODO: Implement
  }

  renderQuads(renderer: CoreRenderer): void {
    const { x, y, w, h, color, texture, parent, textureOptions } = this.props;
    renderer.addQuad(
      x + (parent?.x || 0),
      y + (parent?.y || 0),
      w,
      h,
      color,
      texture,
      textureOptions,
    );
  }

  //#region Properties
  get id(): number {
    return this.props.id;
  }

  get x(): number {
    return this.props.x;
  }

  set x(value: number) {
    this.props.x = value;
  }

  get y(): number {
    return this.props.y;
  }

  set y(value: number) {
    this.props.y = value;
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

  get zIndex(): number {
    return this.props.zIndex;
  }

  set zIndex(value: number) {
    this.props.zIndex = value;
  }

  get parent(): CoreNode | null {
    return this.props.parent;
  }

  set parent(newParent: CoreNode | null) {
    const oldParent = this.props.parent;
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
  }

  get shader(): CoreShader | null {
    return this.props.shader;
  }

  set shader(value: CoreShader | null) {
    this.props.shader = value;
  }
  //#endregion Properties
}
