import type { ShaderEffectValueMap } from '../../exports/index.js';
import type {
  CoreShaderManager,
  EffectMap,
  ShaderMap,
} from '../core/CoreShaderManager.js';
import type { ExtractProps } from '../core/CoreTextureManager.js';
import type { EffectDesc } from '../core/renderers/webgl/shaders/effects/ShaderEffect.js';
import type { BaseShaderController } from './ShaderController.js';

type OptionalName<T> = T extends string ? T : never;

type MapEffectProps<
  Effects extends [...{ name?: string; type: keyof EffectMap }[]],
> = {
  [K in Effects[number] as OptionalName<K['name']>]: ExtractProps<
    EffectMap[K['type']]
  >;
};

export type DynamicEffects<
  T extends [...{ name?: string; type: keyof EffectMap }[]],
> = {
  [K in keyof T]: EffectDesc<T[K]>;
};

export class DynamicShaderController<
  Effects extends [...{ name?: string; type: keyof EffectMap }[]],
> implements BaseShaderController
{
  private resolvedProps: ExtractProps<ShaderMap['DynamicShader']>;
  props: MapEffectProps<Effects>;
  type: 'DynamicShader';
  /**
   * Whether the shader controller has been destroyed
   */
  isDestroyed = false;

  constructor(
    readonly shader: InstanceType<ShaderMap['DynamicShader']>,
    props: ExtractProps<ShaderMap['DynamicShader']>,
    shManager: CoreShaderManager,
  ) {
    this.type = 'DynamicShader';
    this.resolvedProps = props;
    const effectConstructors = shManager.getRegisteredEffects();
    const definedProps = {};

    const effects = props.effects!;
    const effectsLength = effects.length;

    for (let i = 0; i < effectsLength; i++) {
      const {
        name: effectName,
        props: effectProps,
        type: effectType,
      } = effects[i]!;
      if (effectName === undefined) {
        continue;
      }
      const definedEffectProps = {};
      const propEntries = Object.keys(effectProps);
      const propEntriesLength = propEntries.length;
      for (let j = 0; j < propEntriesLength; j++) {
        const propName = propEntries[j]!;
        Object.defineProperty(definedEffectProps, propName, {
          get: () => {
            return (
              this.resolvedProps.effects![i]!.props[propName] as Record<
                string,
                any
              >
            ).value;
          },
          set: (value) => {
            const target = this.resolvedProps.effects![i]!.props[
              propName
            ] as Record<string, any>;
            target.value = value;
            if (target.hasValidator) {
              value = target.validatedValue = effectConstructors[effectType]!
                .uniforms[propName]?.validator!(value, effectProps);
            }
            if (target.hasProgramValueUpdater) {
              effectConstructors[effectType]!.uniforms[propName]
                ?.updateProgramValue!(target as ShaderEffectValueMap);
            } else {
              target.programValue = value;
            }
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

  /**
   * Destroys the dynamic shader controller and cleans up resources
   *
   * @remarks
   * This method cleans up all retained values on the dynamic shader controller instance,
   * helping to prevent memory leaks when a shader is no longer needed.
   *
   * It clears the content of the props and effects objects while maintaining
   * the object structure to avoid type errors.
   */
  destroy(): void {
    // Clear out the properties in the resolved props object
    if (this.resolvedProps) {
      // Handle effects array specially
      if (this.resolvedProps.effects) {
        // Clear each effect's props
        this.resolvedProps.effects.forEach((effect) => {
          if (effect && effect.props) {
            Object.keys(effect.props).forEach((propKey) => {
              (effect.props as Record<string, unknown>)[propKey] = undefined;
            });
          }
        });
      }

      // Clear other top-level props
      Object.keys(this.resolvedProps).forEach((key) => {
        if (key !== 'effects') {
          // Skip effects as we've already processed it
          (this.resolvedProps as Record<string, unknown>)[key] = undefined;
        }
      });
    }

    // Destroy the underlying WebGL shader resources
    this.shader.destroy();

    // Mark this shader controller as destroyed
    this.isDestroyed = true;

    // We don't null out the props or shader reference since they are readonly
    // or required by the interface, but we've cleared the content
  }
}
