import type { EffectMap } from '../../../../CoreShaderManager.js';
import type { ExtractProps } from '../../../../CoreTextureManager.js';
import type { WebGlContextWrapper } from '../../../../lib/WebGlContextWrapper.js';
import type {} from '../../WebGlCoreShader.js';
import type {
  UniformInfo,
  UniformMethodMap,
} from '../../internal/ShaderUtils.js';

export interface BaseEffectDesc {
  name?: string;
  type: keyof EffectMap;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: Record<string, any>;
}

export interface EffectDesc<
  T extends { name?: string; type: keyof EffectMap } = {
    name?: string;
    type: keyof EffectMap;
  },
> extends BaseEffectDesc {
  name?: T['name'];
  type: T['type'];
  props: ExtractProps<EffectMap[T['type']]>;
}

/**
 * Allows the `keyof EffectMap` to be mapped over and form an discriminated
 * union of all the EffectDescs structures individually.
 *
 * @remarks
 * When used like the following:
 * ```
 * MapEffectDescs<keyof EffectMap>[]
 * ```
 * The resultant type will be a discriminated union like so:
 * ```
 * (
 *   {
 *     name: 'effect1',
 *     type: 'radius',
 *     props?: {
 *       radius?: number | number[];
 *     }
 *   } |
 *   {
 *     name: 'effect2',
 *     type: 'border',
 *     props?: {
 *       width?: number;
 *       color?: number;
 *     }
 *   } |
 *   // ...
 * )[]
 * ```
 * Which means TypeScript will now base its type checking on the `type` field
 * and will know exactly what the `props` field should be based on the `type`
 * field.
 */
type MapEffectDescs<T extends keyof EffectMap> = T extends keyof EffectMap
  ? EffectDesc<{ type: T; name: string }>
  : never;

export type EffectDescUnion = MapEffectDescs<keyof EffectMap>;

export interface ShaderEffectUniform {
  value: number | number[] | boolean | string;
  type: string;
  method: keyof UniformMethodMap;
  name?: string;
  size?: (value: Record<string, unknown>) => number;
  updateOnBind?: boolean;
  updateProgramValue?: (
    programValues: ShaderEffectValueMap,
    shaderProps?: Record<string, unknown>,
  ) => void;
  validator?: (
    value: any,
    props: Record<string, unknown>,
  ) => number | number[] | number[][];
}

export interface ShaderEffectValueMap {
  value: ShaderEffectUniform['value'];
  programValue: number | Float32Array | undefined;
  method: keyof UniformMethodMap;
  setUniformValue?: () => void | null;
  hasValidator: boolean;
  hasProgramValueUpdater: boolean;
  updateOnBind: boolean;
  validatedValue?: number | number[];
}

export interface ShaderEffectUniforms {
  [key: string]: ShaderEffectUniform;
}

export interface DefaultEffectProps {
  [key: string]: unknown;
}

export interface ShaderEffectOptions {
  ref: string;
  target: string;
  props?: Record<string, unknown>;
  uniforms?: ShaderEffectUniforms;
  methods?: Record<string, string>;
  onShaderMask?: ((value: Record<string, unknown>) => string) | string;
  onColorize?: ((value: Record<string, unknown>) => string) | string;
  onEffectMask?: ((value: Record<string, unknown>) => string) | string;
}

export abstract class ShaderEffect {
  readonly priority = 1;
  readonly name: string = '';

  ref: string;
  target: string;

  passParameters = '';
  declaredUniforms = '';
  uniformInfo: Record<string, UniformInfo> = {};

  static uniforms: ShaderEffectUniforms = {};
  static methods?: Record<string, string>;

  static onShaderMask?: ((value: Record<string, unknown>) => string) | string;

  static onColorize?: ((value: Record<string, unknown>) => string) | string;
  static onEffectMask?: ((value: Record<string, unknown>) => string) | string;

  static getEffectKey(props: Record<string, unknown>): string {
    return '';
  }

  static getMethodParameters(
    uniforms: ShaderEffectUniforms,
    props: Record<string, unknown>,
  ): string {
    const res: string[] = [];
    for (const u in uniforms) {
      const uni = uniforms[u]!;
      let define = '';
      if (uni.size) {
        define = `[${uni.size(props)}]`;
      }
      res.push(`${uni.type} ${u}${define}`);
    }
    return res.join(',');
  }

  constructor(options: ShaderEffectOptions) {
    const { ref, target, props = {} } = options;
    this.ref = ref;
    this.target = target;

    const uniformInfo: Record<string, UniformInfo> = {};
    const passParameters: string[] = [];
    let declaredUniforms = '';
    const uniforms = (this.constructor as typeof ShaderEffect).uniforms || {};

    for (const u in uniforms) {
      const unif = uniforms[u]!;
      const uniType = unif.type;
      //make unique uniform name
      const uniformName = `${ref}_${u}`;
      let define = '';
      if (unif.size) {
        define = `[${unif.size(props)}]`;
      }
      passParameters.push(uniformName);
      declaredUniforms += `uniform ${uniType} ${uniformName}${define};`;
      uniformInfo[u] = { name: uniformName, uniform: uniforms[u]!.method };
    }

    this.passParameters = passParameters.join(',');
    this.declaredUniforms = declaredUniforms;
    this.uniformInfo = uniformInfo;
  }

  static resolveDefaults(
    props: Record<string, unknown>,
  ): Record<string, unknown> {
    return {};
  }

  static makeEffectKey(props: Record<string, unknown>): string | false {
    return false;
  }
}
