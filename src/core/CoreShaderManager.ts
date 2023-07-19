import type { CoreRenderer } from './renderers/CoreRenderer.js';
import type { CoreShader } from './renderers/CoreShader.js';

import { DefaultShader } from './renderers/webgl/shaders/DefaultShader.js';
import { DefaultShaderBatched } from './renderers/webgl/shaders/DefaultShaderBatched.js';
import { RoundedRectangle } from './renderers/webgl/shaders/RoundedRectangle.js';

export interface ShaderMap {
  DefaultShader: typeof DefaultShader;
  DefaultShaderBatched: typeof DefaultShaderBatched;
  RoundedRectangle: typeof RoundedRectangle;
}

export class CoreShaderManager {
  protected shCache: Map<string, CoreShader> = new Map();
  protected shConstructors: Partial<ShaderMap> = {};
  protected attachedShader: CoreShader | null = null;

  renderer!: CoreRenderer;

  constructor() {
    this.registerShaderType('DefaultShader', DefaultShader);
    this.registerShaderType('DefaultShaderBatched', DefaultShaderBatched);
    this.registerShaderType('RoundedRectangle', RoundedRectangle);
  }

  registerShaderType<Type extends keyof ShaderMap>(
    shType: Type,
    shClass: ShaderMap[Type],
  ): void {
    this.shConstructors[shType] = shClass;
  }

  loadShader<Type extends keyof ShaderMap>(shType: Type): CoreShader {
    if (!this.renderer) {
      throw new Error(`Renderer is not been defined`);
    }
    const ShaderClass = this.shConstructors[shType];
    if (!ShaderClass) {
      throw new Error(`Shader type "${shType as string}" is not registered`);
    }

    const cacheKey = ShaderClass.name;
    if (cacheKey && this.shCache.has(cacheKey)) {
      return this.shCache.get(cacheKey) as CoreShader;
    }

    // @ts-expect-error ShaderClass WILL accept a Renderer
    const shader = new ShaderClass(this.renderer) as CoreShader;
    if (cacheKey) {
      this.shCache.set(cacheKey, shader);
    }
    return shader;
  }

  useShader(shader: CoreShader): void {
    if (this.attachedShader === shader) {
      return;
    }
    if (this.attachedShader) {
      this.attachedShader.detach();
    }
    shader.attach();
    this.attachedShader = shader;
  }
}
