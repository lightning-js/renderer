import type { ShaderMap } from '../core/CoreShaderManager.js';
import type { ExtractProps } from '../core/CoreTextureManager.js';
import type { INode } from './INode.js';
import type { SpecificShaderRef } from './RendererMain.js';

export abstract class IShaderController {
  node: INode | null = null;

  constructor(readonly shaderRef: SpecificShaderRef<keyof ShaderMap>) {}

  defineProps(props: ExtractProps<ShaderMap[keyof ShaderMap]>) {
    const keys = Object.keys(props);
    const l = keys.length;
    let i = 0;
    for (; i < l; i++) {
      const propName = keys[i] as string;
      Object.defineProperty(this, propName, {
        get: () => {
          return this.getProp(propName);
        },
        set: (value) => {
          this.setProp(propName, value);
        },
        enumerable: true,
        configurable: true,
      });
    }
  }

  attachNode(node: INode) {
    this.node = node;
    this.loadShader();
  }

  abstract loadShader(): void;
  abstract setProp(propName: string, value: unknown): void;
  abstract getProp(propName: string): unknown;
}
