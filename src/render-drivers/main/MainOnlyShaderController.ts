import type { ShaderMap } from '../../core/CoreShaderManager.js';
import type { ExtractProps } from '../../core/CoreTextureManager.js';
import { IShaderController } from '../../main-api/IShaderController.js';
import type { MainOnlyNode } from './MainOnlyNode.js';

export class MainOnlyShaderController extends IShaderController {
  override getProp(propName: string): unknown {
    return (this.node as MainOnlyNode).coreNode.shaderProps![propName];
  }

  override setProp(propName: string, value: unknown): void {
    (this.node as MainOnlyNode).coreNode.shaderProps![propName] = value;
  }

  override loadShader(): void {
    const coreNode = (this.node as MainOnlyNode).coreNode;
    coreNode.loadShader(this.shaderRef.shType, this.shaderRef.props);
    this.defineProps(
      coreNode.shaderProps as ExtractProps<ShaderMap[keyof ShaderMap]>,
    );
  }
}
