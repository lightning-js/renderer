import { EventEmitter } from '../../common/EventEmitter.js';
import type { IAnimationController } from '../../common/IAnimationController.js';
import type { AnimationSettings } from '../../core/animations/CoreAnimation.js';
import { IShaderNode } from '../../main-api/IShaderNode.js';
import { ThreadXMainAnimationController } from './ThreadXMainAnimationController.js';

export class ThreadXMainShaderNode extends IShaderNode {
  override loadShader(): void {
    //load shader
  }

  override animate(
    props: Record<string, number>,
    settings: Partial<AnimationSettings>,
  ): IAnimationController {
    // const id = this.nextAnimationId++;
    // // this.emit('createAnimation', {id, props, settings});
    // const controller = new ThreadXMainAnimationController(this, 1);
    return {} as IAnimationController;
  }
}
