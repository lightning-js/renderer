import type { EffectMap, ShaderMap } from '../core/CoreShaderManager.js';
import type { ExtractProps } from '../core/CoreTextureManager.js';
import type { Stage } from '../core/Stage.js';
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

export class DynamicShaderControllerInstance<
  Effects extends [...{ name: string; type: keyof EffectMap }[]],
> implements DynamicShaderController<Effects>
{
  private resolvedProps: ExtractProps<ShaderMap['DynamicShader']>;
  props: MapEffectProps<Effects>;
  type: 'DynamicShader';

  constructor(
    readonly shader: InstanceType<ShaderMap['DynamicShader']>,
    props: ExtractProps<ShaderMap['DynamicShader']>,
    stage: Stage,
  ) {
    this.type = 'DynamicShader';
    this.resolvedProps = props;

    const definedProps = {};

    const effects = props.effects!;
    const effectsLength = effects.length;

    let i = 0;
    for (; i < effectsLength; i++) {
      const { name: effectName, props: effectProps } = effects[i]!;
      const effectIndex = i;
      const definedEffectProps = {};
      const propEntries = Object.keys(effectProps);
      const propEntriesLength = propEntries.length;
      let j = 0;
      for (; j < propEntriesLength; j++) {
        const propName = propEntries[j]!;
        Object.defineProperty(definedEffectProps, propName, {
          get: () => {
            return this.resolvedProps.effects![effectIndex]!.props[propName];
          },
          set: (value) => {
            this.resolvedProps.effects![effectIndex]!.props[propName] = value;
            stage.requestRender();
          },
        });
      }

      Object.defineProperty(definedProps, effectName, {
        get: () => {
          return definedEffectProps;
        },
      });
    }

    this.props = definedProps as MapEffectProps<Effects>;
  }

  getResolvedProps() {
    return this.resolvedProps;
  }
}
