import type { CoreRenderer } from './renderers/CoreRenderer.js';
import type { CoreShader } from './renderers/CoreShader.js';

import { DefaultShader } from './renderers/webgl/shaders/DefaultShader.js';
import { DefaultShaderBatched } from './renderers/webgl/shaders/DefaultShaderBatched.js';

export interface ShaderMap {
  DefaultShader: typeof DefaultShader;
  DefaultShaderBatched: typeof DefaultShaderBatched;
}

export class CoreShaderManager {
  protected shCache: Map<string, CoreShader> = new Map();
  protected shConstructors: Partial<ShaderMap> = {};
  protected attachedShader: CoreShader | null = null;

  constructor(protected renderer: CoreRenderer) {
    this.registerShaderType('DefaultShader', DefaultShader);
    this.registerShaderType('DefaultShaderBatched', DefaultShaderBatched);
  }

  registerShaderType<Type extends keyof ShaderMap>(
    shType: Type,
    shClass: ShaderMap[Type],
  ): void {
    this.shConstructors[shType] = shClass;
  }

  loadShader<Type extends keyof ShaderMap>(shType: Type): CoreShader {
    console.log('loadShader', shType);
    if (!this.renderer) {
      throw new Error(`Renderer is not been defined`);
    }
    const ShaderClass = this.shConstructors[shType];
    if (!ShaderClass) {
      throw new Error(`Shader type "${shType as string}" is not registered`);
    }

    const cacheKey = ShaderClass.makeCacheKey({});

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
    shader.useProgram();
  }
}
