import type { IAnimationController } from '../../core/IAnimationController.js';
import type { INode, INodeAnimatableProps } from '../../main-api/INode.js';
import type { TextureDesc } from '../../main-api/RendererMain.js';
import { assertTruthy } from '../../utils.js';
import type { NodeStruct } from './NodeStruct.js';
import { SharedNode } from './SharedNode.js';
import { ThreadXMainAnimationController } from './ThreadXMainAnimationController.js';

export class ThreadXMainNode extends SharedNode implements INode {
  private nextAnimationId = 1;
  protected _parent: ThreadXMainNode | null = null;
  protected _children: ThreadXMainNode[] = [];
  protected _texture: TextureDesc | null = null;

  /**
   * FinalizationRegistry for animation controllers. When an animation
   * controller is garbage collected, we let the render worker know so that
   * it can remove it's corresponding animation controler from it's stored
   * Set. This should ultimately allow the render worker to garbage collect
   * it's animation controller. The animation itself independent from the animation
   * controller, so it will continue to run until it's finished regardless of
   * whether or not the animation controller is garbage collected.
   */
  private animationRegistry = new FinalizationRegistry((id: number) => {
    this.emit('destroyAnimation', { id });
  });

  constructor(sharedNodeStruct: NodeStruct) {
    super(sharedNodeStruct);
  }

  get texture(): TextureDesc | null {
    return this._texture;
  }

  set texture(texture: TextureDesc | null) {
    this._texture = texture;
    if (!texture) {
      return;
    }
    // TODO: Check for texture type validity
    this.emit('loadTexture', texture as unknown as Record<string, unknown>);
  }

  animate(
    props: Partial<INodeAnimatableProps>,
    duration: number,
  ): IAnimationController {
    const id = this.nextAnimationId++;
    this.emit('createAnimation', { id, props, duration });
    const controller = new ThreadXMainAnimationController(this, id);
    this.animationRegistry.register(controller, id);
    return controller;
  }

  //#region Parent/Child Props
  get parent(): ThreadXMainNode | null {
    return this._parent;
  }

  set parent(newParent: ThreadXMainNode | null) {
    const oldParent = this._parent;
    this._parent = newParent;
    this.parentId = newParent?.id ?? 0;
    if (oldParent) {
      const index = oldParent.children.indexOf(this);
      assertTruthy(
        index !== -1,
        "ThreadXMainNode.parent: Node not found in old parent's children!",
      );
      oldParent.children.splice(index, 1);
    }
    if (newParent) {
      newParent.children.push(this);
    }
  }

  get children(): ThreadXMainNode[] {
    return this._children;
  }
  //#endregion Parent/Child Props

  get props() {
    return this.curProps;
  }
}
