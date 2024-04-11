import type { ShaderMap } from '../../core/CoreShaderManager.js';
import type { ExtractProps } from '../../core/CoreTextureManager.js';
import { IShaderController } from '../../main-api/IShaderController.js';
import type { ThreadXMainNode } from './ThreadXMainNode.js';

export class ThreadXMainShaderController extends IShaderController {
  override getProp(propName: string): unknown {
    // return (this.node as ThreadXMainNode).coreNode.shaderProps![propName];
    return false;
  }

  override setProp(propName: string, value: unknown): void {
    // (this.node as MainOnlyNode).coreNode.shaderProps![propName] = value;
  }

  override loadShader(): void {
    // const coreNode = (this.node as MainOnlyNode).coreNode;
    // coreNode.loadShader(this.shType, this.props);
    // this.defineProps(coreNode.shaderProps as ExtractProps<ShaderMap[keyof ShaderMap]>);
  }
}
