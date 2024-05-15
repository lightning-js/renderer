import type { ShaderMap } from '../../core/CoreShaderManager.js';
import type { ExtractProps } from '../../core/CoreTextureManager.js';
import { IShaderController } from '../../main-api/IShaderController.js';
import type { MainOnlyNode } from '../main/MainOnlyNode.js';
import type { ThreadXMainNode } from './ThreadXMainNode.js';

export class ThreadXMainShaderController extends IShaderController {
  override getProp(propName: string): unknown {
    return false;
  }

  override setProp(propName: string, value: unknown): void {
    if (this.node) {
      this.node.emit('setShaderProperty', { propName, value });
    }
  }
  override loadShader(): void {
    this.defineProps(
      this.shaderRef.props as ExtractProps<ShaderMap[keyof ShaderMap]>,
    );
  }
}
