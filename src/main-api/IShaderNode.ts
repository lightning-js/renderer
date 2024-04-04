import type { IAnimationController } from '../common/IAnimationController.js';
import type { ShaderMap } from '../core/CoreShaderManager.js';
import type { Stage } from '../core/Stage.js';
import type { AnimationSettings } from '../core/animations/CoreAnimation.js';
import type { INode } from './INode.js';
import type { SpecificShaderRef } from './RendererMain.js';

export abstract class IShaderNode {
  propsList: string[] = [];
  node: INode | null = null;
  stage: Stage | null = null;

  constructor(
    public shaderType: keyof ShaderMap,
    public props: SpecificShaderRef<keyof ShaderMap>['props'],
  ) {
    const keys = Object.keys(props);
    this.propsList = keys.filter((prop) => prop.charAt(0) !== '$');
  }
  //called by node when node is initialized
  connectNode(node: INode) {
    this.node = node;
    this.loadShader();
  }

  abstract loadShader(): void;

  abstract animate(
    props: Record<string, number>,
    settings: Partial<AnimationSettings>,
  ): IAnimationController;
}
