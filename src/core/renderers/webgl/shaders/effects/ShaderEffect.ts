import type {
  AlphaShaderProp,
  DimensionsShaderProp,
} from '../../WebGlCoreShader.js';
import type {
  UniformInfo,
  UniformMethodMap,
} from '../../internal/ShaderUtils.js';

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

export interface ShaderEffectValueMap
  extends DimensionsShaderProp,
    AlphaShaderProp {
  value: ShaderEffectUniform['value'];
  programValue: number | Float32Array | undefined;
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
