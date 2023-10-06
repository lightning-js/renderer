/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2023 Comcast Cable Communications Management, LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import type { ExtractProps } from '../../../CoreTextureManager.js';
import type { WebGlCoreRenderer } from '../WebGlCoreRenderer.js';
import {
  WebGlCoreShader,
  type DimensionsShaderProp,
  type AlphaShaderProp,
} from '../WebGlCoreShader.js';
import type { UniformInfo } from '../internal/ShaderUtils.js';
import type { WebGlCoreCtxTexture } from '../WebGlCoreCtxTexture.js';
import { RadiusEffect } from './effects/RadiusEffect.js';
import { BorderEffect } from './effects/BorderEffect.js';
import { LinearGradientEffect } from './effects/LinearGradientEffect.js';
import { GrayscaleEffect } from './effects/GrayscaleEffect.js';
import { ShaderEffect } from './effects/ShaderEffect.js';
import { BorderRightEffect } from './effects/BorderRightEffect.js';
import { BorderTopEffect } from './effects/BorderTopEffect.js';
import { BorderBottomEffect } from './effects/BorderBottomEffect.js';
import { BorderLeftEffect } from './effects/BorderLeftEffect.js';
import { GlitchEffect } from './effects/GlitchEffect.js';
import { FadeOutEffect } from './effects/FadeOutEffect.js';
import { RadialGradientEffect } from './effects/RadialGradientEffect.js';

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
 *     type: 'radius',
 *     props?: {
 *       radius?: number | number[];
 *     }
 *   } |
 *   {
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
  ? SpecificEffectDesc<T>
  : never;

type EffectDesc = MapEffectDescs<keyof EffectMap>;

export interface DynamicShaderProps
  extends DimensionsShaderProp,
    AlphaShaderProp {
  effects?: EffectDesc[];
}

export interface EffectMap {
  radius: typeof RadiusEffect;
  border: typeof BorderEffect;
  borderBottom: typeof BorderBottomEffect;
  borderLeft: typeof BorderLeftEffect;
  borderRight: typeof BorderRightEffect;
  borderTop: typeof BorderTopEffect;
  fadeOut: typeof FadeOutEffect;
  linearGradient: typeof LinearGradientEffect;
  radialGradient: typeof RadialGradientEffect;
  grayscale: typeof GrayscaleEffect;
  glitch: typeof GlitchEffect;
}

const Effects = {
  radius: RadiusEffect,
  border: BorderEffect,
  borderBottom: BorderBottomEffect,
  borderLeft: BorderLeftEffect,
  borderRight: BorderRightEffect,
  borderTop: BorderTopEffect,
  fadeOut: FadeOutEffect,
  linearGradient: LinearGradientEffect,
  radialGradient: RadialGradientEffect,
  grayscale: GrayscaleEffect,
  glitch: GlitchEffect,
};

export interface SpecificEffectDesc<
  FxType extends keyof EffectMap = keyof EffectMap,
> {
  type: FxType;
  props?: ExtractProps<EffectMap[FxType]>;
}

export class DynamicShader extends WebGlCoreShader {
  effects: Array<InstanceType<EffectMap[keyof EffectMap]>> = [];

  constructor(renderer: WebGlCoreRenderer, props: DynamicShaderProps) {
    const shader = DynamicShader.createShader(props);
    super({
      renderer,
      attributes: ['a_position', 'a_textureCoordinate', 'a_color'],
      uniforms: [
        { name: 'u_resolution', uniform: 'uniform2fv' },
        { name: 'u_pixelRatio', uniform: 'uniform1f' },
        { name: 'u_texture', uniform: 'uniform2fv' },
        { name: 'u_dimensions', uniform: 'uniform2fv' },
        { name: 'u_alpha', uniform: 'uniform1f' },
        ...shader.uniforms,
      ],
      shaderSources: {
        vertex: shader.vertex,
        fragment: shader.fragment,
      },
    });

    this.effects = shader.effects as Array<
      InstanceType<EffectMap[keyof EffectMap]>
    >;
  }

  override bindTextures(textures: WebGlCoreCtxTexture[]) {
    const { gl } = this;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[0]!.ctxTexture);
  }

  protected override bindProps(props: Required<DynamicShaderProps>): void {
    props.effects?.forEach((eff, index) => {
      const effect = this.effects[index]!;
      const fxClass = Effects[effect.name as keyof EffectMap];
      const props = eff.props ?? {};
      const uniInfo = effect.uniformInfo;
      Object.keys(props).forEach((p) => {
        const fxProp = fxClass.uniforms[p]!;
        const propInfo = uniInfo[p]!;
        let value = fxProp.validator
          ? fxProp.validator(props[p], props)
          : props[p];
        if (Array.isArray(value)) {
          value = new Float32Array(value);
        }
        this.setUniform(propInfo.name, value);
      });
    });
  }

  static createShader(props: DynamicShaderProps) {
    //counts duplicate effects
    const effectNameCount: Record<string, number> = {};
    const methods: Record<string, string> = {};

    let declareUniforms = '';
    const uniforms: UniformInfo[] = [];

    const uFx: Record<string, unknown>[] = [];

    const effects = props.effects!.map((effect) => {
      const baseClass = Effects[effect.type];
      const key = baseClass.getEffectKey(effect.props || {});

      effectNameCount[key] = effectNameCount[key] ? ++effectNameCount[key] : 1;

      const nr = effectNameCount[key]!;

      if (nr === 1) {
        uFx.push({ key, type: effect.type, props: effect.props });
      }

      //initialize new effect class;
      const fxClass = new baseClass({
        ref: `${key}${nr === 1 ? '' : nr}`,
        target: key,
        props: effect.props,
      }) as ShaderEffect;

      declareUniforms += fxClass.declaredUniforms;
      uniforms.push(...Object.values(fxClass.uniformInfo));
      return fxClass;
    });

    //build source
    let effectMethods = '';

    uFx?.forEach((fx) => {
      const fxClass = Effects[fx.type as keyof EffectMap];
      const fxProps = fxClass.resolveDefaults(
        (fx.props ?? {}) as Record<string, unknown>,
      );

      const remap: Record<string, string>[] = [];
      for (const m in fxClass.methods) {
        let cm = m;
        const fxMethod = fxClass.methods[m]!;
        if (methods[m] && methods[m] !== fxMethod) {
          cm = DynamicShader.resolveMethodDuplicate(m, fxMethod, methods);
        }
        methods[cm] = fxMethod.replace('function', cm);
        remap.push({ m, cm });
      }

      let onShaderMask =
        fxClass.onShaderMask instanceof Function
          ? fxClass.onShaderMask(fxProps)
          : fxClass.onShaderMask;

      let onColorize =
        fxClass.onColorize instanceof Function
          ? fxClass.onColorize(fxProps)
          : fxClass.onColorize;

      let onEffectMask =
        fxClass.onEffectMask instanceof Function
          ? fxClass.onEffectMask(fxProps)
          : fxClass.onEffectMask;

      remap.forEach((r) => {
        const { m, cm } = r;
        const reg = new RegExp(`\\$${m!}`, 'g');
        if (onShaderMask) {
          onShaderMask = onShaderMask.replace(reg, cm!);
        }
        if (onColorize) {
          onColorize = onColorize.replace(reg, cm!);
        }
        if (onEffectMask) {
          onEffectMask = onEffectMask.replace(reg, cm!);
        }
      });

      const methodParameters = fxClass.getMethodParameters(
        fxClass.uniforms,
        fxProps,
      );
      const pm = methodParameters.length > 0 ? `, ${methodParameters}` : '';
      if (onShaderMask) {
        effectMethods += `
        float fx_${fx.key as string}_onShaderMask(float shaderMask ${pm}) {
          ${onShaderMask}
        }
        `;
      }
      if (onColorize) {
        effectMethods += `
          vec4 fx_${
            fx.key as string
          }_onColorize(float shaderMask, vec4 maskColor, vec4 shaderColor${pm}) {
            ${onColorize}
          }
        `;
      }

      if (onEffectMask) {
        effectMethods += `
          vec4 fx_${
            fx.key as string
          }_onEffectMask(float shaderMask, vec4 maskColor, vec4 shaderColor${pm}) {
            ${onEffectMask}
          }
        `;
      }
    });

    let sharedMethods = '';
    for (const m in methods) {
      sharedMethods += methods[m];
    }

    //fill main functions
    let currentMask = `mix(shaderColor, maskColor, clamp(-(lng_DefaultMask), 0.0, 1.0))`;
    let drawEffects = `

    `;
    for (let i = 0; i < effects.length; i++) {
      const current = effects[i]!;
      const pm =
        current.passParameters.length > 0 ? `, ${current.passParameters}` : '';
      const currentClass = Effects[current.name as keyof EffectMap];

      if (currentClass.onShaderMask) {
        drawEffects += `
        shaderMask = fx_${current.target}_onShaderMask(shaderMask ${pm});
        `;
      }
      if (currentClass.onColorize) {
        drawEffects += `
        maskColor = fx_${current.target}_onColorize(shaderMask, maskColor, shaderColor${pm});
        `;
      }
      if (currentClass.onEffectMask) {
        currentMask = `fx_${current.target}_onEffectMask(shaderMask, maskColor, shaderColor${pm})`;
      }

      const next = effects[i + 1]!;
      if (
        next === undefined ||
        Effects[next.name as keyof EffectMap].onEffectMask
      ) {
        drawEffects += `
          shaderColor = ${currentMask};
        `;
      }
    }

    return {
      effects,
      uniforms,
      fragment: DynamicShader.fragment(
        declareUniforms,
        sharedMethods,
        effectMethods,
        drawEffects,
      ),
      vertex: DynamicShader.vertex(),
    };
  }

  static resolveMethodDuplicate(
    key: string,
    effectMethod: string,
    methodCollection: Record<string, string>,
    increment = 0,
  ): string {
    const m = key + (increment > 0 ? (increment as unknown as string) : '');
    if (methodCollection[m] && methodCollection[m] !== effectMethod) {
      return this.resolveMethodDuplicate(
        key,
        effectMethod,
        methodCollection,
        ++increment,
      );
    }
    return m;
  }

  static override resolveDefaults(
    props: DynamicShaderProps,
  ): Required<DynamicShaderProps> {
    return {
      effects: (props.effects ?? []).map((effect) => ({
        type: effect.type,
        props: Effects[effect.type].resolveDefaults(effect.props || {}),
      })) as MapEffectDescs<keyof EffectMap>[],
      $dimensions: {
        width: 0,
        height: 0,
      },
      $alpha: 0,
    };
  }

  static override makeCacheKey(props: DynamicShaderProps): string {
    let fx = '';
    props.effects?.forEach((effect) => {
      const baseClass = Effects[effect.type];
      const key = baseClass.getEffectKey(effect.props || {});
      fx += `,${key}`;
    });
    return `DynamicShader${fx}`;
  }

  static z$__type__Props: DynamicShaderProps;

  static vertex = () => `
    # ifdef GL_FRAGMENT_PRESICISON_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif

    attribute vec2 a_textureCoordinate;
    attribute vec2 a_position;
    attribute vec4 a_color;
    attribute float a_textureIndex;

    uniform vec2 u_resolution;
    uniform float u_pixelRatio;

    varying vec4 v_color;
    varying vec2 v_textureCoordinate;
    varying float v_textureIndex;

    void main(){
      vec2 normalized = a_position * u_pixelRatio / u_resolution;
      vec2 zero_two = normalized * 2.0;
      vec2 clip_space = zero_two - 1.0;

      // pass to fragment
      v_color = a_color;
      v_textureCoordinate = a_textureCoordinate;
      v_textureIndex = a_textureIndex;

      // flip y
      gl_Position = vec4(clip_space * vec2(1.0, -1.0), 0, 1);
    }
  `;

  static fragment = (
    uniforms: string,
    methods: string,
    effectMethods: string,
    drawEffects: string,
  ) => `
    # ifdef GL_FRAGMENT_PRESICISON_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif

    #define PI 3.14159265359

    uniform vec2 u_resolution;
    uniform vec2 u_dimensions;
    uniform float u_alpha;
    uniform float u_radius;
    uniform sampler2D u_texture;
    uniform float u_pixelRatio;

    ${uniforms}

    varying vec4 v_color;
    varying vec2 v_textureCoordinate;

    ${methods}

    ${effectMethods}

    void main() {
      vec2 p = v_textureCoordinate.xy * u_dimensions - u_dimensions * 0.5;
      vec2 d = abs(p) - (u_dimensions) * 0.5;
      float lng_DefaultMask = min(max(d.x, d.y), 0.0) + length(max(d, 0.0));

      vec4 shaderColor = vec4(0.0);
      float shaderMask = lng_DefaultMask;

      vec4 maskColor = texture2D(u_texture, v_textureCoordinate) * v_color;

      shaderColor = mix(shaderColor, maskColor, clamp(-(lng_DefaultMask + 0.5), 0.0, 1.0));

      ${drawEffects}

      gl_FragColor = shaderColor * u_alpha;
    }
  `;
}
