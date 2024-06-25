import type { EffectMap } from '../core/CoreShaderManager.js';
import type { ExtractProps } from '../core/CoreTextureManager.js';
import type { EffectDesc } from '../core/renderers/webgl/shaders/DynamicShader.js';
import type { ShaderController } from './ShaderController.js';

type MapEffectProps<
  Effects extends [...{ name: string; type: keyof EffectMap }[]],
> = {
  [K in Effects[number] as K['name']]: ExtractProps<EffectMap[K['type']]>;
};

export type DynamicEffects<
  T extends [...{ name: string; type: keyof EffectMap }[]],
> = {
  [K in keyof T]: EffectDesc<T[K]>;
};

export interface DynamicShaderController<
  Effects extends [...{ name: string; type: keyof EffectMap }[]],
> extends ShaderController<'DynamicShader'> {
  props: MapEffectProps<Effects>;
}
