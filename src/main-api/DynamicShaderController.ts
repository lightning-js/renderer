import type {
  CoreShaderManager,
  EffectMap,
  ShaderMap,
} from '../core/CoreShaderManager.js';
import type { ExtractProps } from '../core/CoreTextureManager.js';
import type { EffectDesc } from '../core/renderers/webgl/shaders/DynamicShader.js';
import type { BaseShaderController } from './ShaderController.js';

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

export class DynamicShaderController<
  Effects extends [...{ name: string; type: keyof EffectMap }[]],
> implements BaseShaderController
{
  private resolvedProps: ExtractProps<ShaderMap['DynamicShader']>;
  props: MapEffectProps<Effects>;
  type: 'DynamicShader';

  constructor(
    readonly shader: InstanceType<ShaderMap['DynamicShader']>,
    props: ExtractProps<ShaderMap['DynamicShader']>,
    shManager: CoreShaderManager,
  ) {
    this.type = 'DynamicShader';
    this.resolvedProps = props;

    const definedProps = {};

    const effects = props.effects!;
    const effectsLength = effects.length;

    let i = 0;
    for (; i < effectsLength; i++) {
      const {
        name: effectName,
        props: effectProps,
        type: effectType,
      } = effects[i]!;
      const effectIndex = i;
      const definedEffectProps = {};
      const propEntries = Object.keys(effectProps);
      const propEntriesLength = propEntries.length;
      let j = 0;
      for (; j < propEntriesLength; j++) {
        const propName = propEntries[j]!;
        Object.defineProperty(definedEffectProps, propName, {
          get: () => {
            return (
              this.resolvedProps.effects![effectIndex]!.props[
                propName
              ] as Record<string, any>
            ).value;
          },
          set: (value) => {
            const target = this.resolvedProps.effects![effectIndex]!.props[
              propName
            ] as Record<string, any>;
            target.value = value;
            if (target.programValues.hasValidator) {
              const effectConstructor =
                shManager.getRegisteredEffects()[effectType];
              value = effectConstructor?.uniforms[propName]?.validator!(
                value,
                effectProps,
              );
            }
            if (Array.isArray(value)) {
              value = new Float32Array(value);
            }
            target.programValues.value = value;
            shManager.renderer.stage.requestRender();
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
