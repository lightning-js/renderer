import {
  ShaderEffect,
  type DefaultEffectProps,
  type ShaderEffectUniforms,
} from './ShaderEffect.js';

export interface GlitchEffectProps extends DefaultEffectProps {
  amplitude?: number;
  narrowness?: number;
  blockiness?: number;
  minimizer?: number;
  time?: number;
}

export class GlitchEffect extends ShaderEffect {
  static z$__type__Props: GlitchEffectProps;
  override readonly name = 'glitch';

  static override getEffectKey(props: GlitchEffectProps): string {
    return `glitch`;
  }

  static override resolveDefaults(
    props: GlitchEffectProps,
  ): Required<GlitchEffectProps> {
    return {
      amplitude: props.amplitude ?? 0.2,
      narrowness: props.narrowness ?? 4.0,
      blockiness: props.blockiness ?? 2.0,
      minimizer: props.minimizer ?? 8.0,
      time: props.time ?? Date.now(),
    };
  }

  static override uniforms: ShaderEffectUniforms = {
    amplitude: {
      value: 0,
      method: 'uniform1f',
      type: 'float',
    },
    narrowness: {
      value: 0,
      method: 'uniform1f',
      type: 'float',
    },
    blockiness: {
      value: 0,
      method: 'uniform1f',
      type: 'float',
    },
    minimizer: {
      value: 0,
      method: 'uniform1f',
      type: 'float',
    },
    time: {
      value: 0,
      method: 'uniform1f',
      validator: (value: number) => {
        return (Date.now() - value) % 1000;
      },
      type: 'float',
    },
  };

  static override methods: Record<string, string> = {
    rand: `
      float function(vec2 p, float time) {
        float t = floor(time * 20.) / 10.;
        return fract(sin(dot(p, vec2(t * 12.9898, t * 78.233))) * 43758.5453);
      }
    `,
    noise: `
      float function(vec2 uv, float blockiness, float time) {
        vec2 lv = fract(uv);
        vec2 id = floor(uv);

        float n1 = rand(id, time);
        float n2 = rand(id+vec2(1,0), time);
        float n3 = rand(id+vec2(0,1), time);
        float n4 = rand(id+vec2(1,1), time);
        vec2 u = smoothstep(0.0, 1.0 + blockiness, lv);
        return mix(mix(n1, n2, u.x), mix(n3, n4, u.x), u.y);
      }
    `,
    fbm: `
      float function(vec2 uv, int count, float blockiness, float complexity, float time) {
        float val = 0.0;
        float amp = 0.5;
        const int MAX_ITERATIONS = 10;

        for(int i = 0; i < MAX_ITERATIONS; i++) {
          if(i >= count) {break;}
          val += amp * noise(uv, blockiness, time);
          amp *= 0.5;
          uv *= complexity;
        }
        return val;
      }
    `,
  };

  static override onColorize = `
    vec2 uv = v_textureCoordinate.xy;
    float aspect = u_dimensions.x / u_dimensions.y;
    vec2 a = vec2(uv.x * aspect , uv.y);
    vec2 uv2 = vec2(a.x / u_dimensions.x, exp(a.y));

    float shift = amplitude * pow($fbm(uv2, 4, blockiness, narrowness, time), minimizer);
    float colR = texture2D(u_texture, vec2(uv.x + shift, uv.y)).r * (1. - shift);
    float colG = texture2D(u_texture, vec2(uv.x - shift, uv.y)).g * (1. - shift);
    float colB = texture2D(u_texture, vec2(uv.x - shift, uv.y)).b * (1. - shift);

    vec3 f = vec3(colR, colG, colB);
    return vec4(f, texture2D(u_texture, vec2(uv.x - shift, uv.y)).a);
  `;
}
