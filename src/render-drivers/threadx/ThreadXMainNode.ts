import type { IAnimationController } from '../../core/IAnimationController.js';
import type { INode, INodeAnimatableProps } from '../../core/INode.js';
import type { NodeStruct } from './NodeStruct.js';
import { SharedNode } from './SharedNode.js';
import { ThreadXMainAnimationController } from './ThreadXMainAnimationController.js';

export class ThreadXMainNode extends SharedNode implements INode {
  private nextAnimationId = 1;
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

  override animate(
    props: Partial<INodeAnimatableProps>,
    duration: number,
  ): IAnimationController {
    const id = this.nextAnimationId++;
    this.emit('createAnimation', { id, props, duration });
    const controller = new ThreadXMainAnimationController(this, id);
    this.animationRegistry.register(controller, id);
    return controller;
  }

  get props() {
    return this.curProps;
  }
}
