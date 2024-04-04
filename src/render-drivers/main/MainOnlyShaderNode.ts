import type { IAnimationController } from '../../common/IAnimationController.js';
import { UpdateType } from '../../core/CoreNode.js';
import {
  CoreAnimation,
  type AnimationSettings,
} from '../../core/animations/CoreAnimation.js';
import { CoreAnimationController } from '../../core/animations/CoreAnimationController.js';
import { IShaderNode } from '../../main-api/IShaderNode.js';
import { assertTruthy } from '../../utils.js';
import type { MainOnlyNode } from './MainOnlyNode.js';

export class MainOnlyShaderNode extends IShaderNode {
  override loadShader(): void {
    const node = (this.node as MainOnlyNode).coreNode;
    node.loadShader(this.shaderType, this.props);

    const l = this.propsList.length;
    let i = 0;
    for (; i < l; i++) {
      const propName = this.propsList[i] as string;
      Object.defineProperty(this, propName, {
        get: () => {
          return node.shaderProps![propName] as number;
        },
        set: (newValue) => {
          node.shaderProps![propName] = newValue;
          node.setUpdateType(UpdateType.Local);
        },
        enumerable: true,
        configurable: true,
      });
    }
  }

  animate(
    props: Record<string, number>,
    settings: Partial<AnimationSettings>,
  ): IAnimationController {
    const node = this.node as MainOnlyNode;
    const animation = new CoreAnimation(
      this as Record<string, unknown>,
      props,
      settings,
    );

    const controller = new CoreAnimationController(
      node.stage.animationManager,
      animation,
    );
    return controller;
  }
}
