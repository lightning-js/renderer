import { assertTruthy } from '../../../../utils.js';
import { getNormalizedRgbaComponents } from '../../../lib/utils.js';
import {
  LinearGradientTemplate,
  type LinearGradientProps,
} from '../../../shaders/LinearGradientTemplate.js';
import { genGradientColors } from '../internal/ShaderUtils.js';
import type { WebGlRenderer } from '../WebGlRenderer.js';
import type { WebGlShaderType } from '../WebGlShaderNode.js';

export const LinearGradient: WebGlShaderType<LinearGradientProps> = {
  name: LinearGradientTemplate.name,
  props: LinearGradientTemplate.props,
  update() {
    assertTruthy(this.props);
    this.uniform1f('u_angle', this.props.angle - (Math.PI / 180) * 90);
    this.uniform1fv('u_stops', new Float32Array(this.props.stops));
    const colors: number[] = [];
    for (let i = 0; i < this.props.colors.length; i++) {
      const norm = getNormalizedRgbaComponents(this.props.colors[i]!);
      colors.push(norm[0], norm[1], norm[2], norm[3]);
    }
    this.uniform4fv('u_colors', new Float32Array(colors));
  },
  getCacheMarkers(props: LinearGradientProps) {
    return `colors:${props.colors.length}`;
  },
  fragment(renderer: WebGlRenderer, props: LinearGradientProps) {
    return `
    # ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif

    #define PI 3.14159265359

    uniform float u_alpha;
    uniform vec2 u_dimensions;

    uniform sampler2D u_texture;

    uniform float u_angle;
    uniform float u_stops[${props.stops.length}];
    uniform vec4 u_colors[${props.colors.length}];

    varying vec4 v_color;
    varying vec2 v_textureCoordinate;

    vec2 calcPoint(float d, float angle) {
      return d * vec2(cos(angle), sin(angle)) + (u_dimensions * 0.5);
    }

    void main() {
      vec4 color = texture2D(u_texture, v_textureCoordinate) * v_color;
      float a = u_angle;
      float lineDist = abs(u_dimensions.x * cos(a)) + abs(u_dimensions.y * sin(a));
      vec2 f = calcPoint(lineDist * 0.5, a);
      vec2 t = calcPoint(lineDist * 0.5, a + PI);
      vec2 gradVec = t - f;
      float dist = dot(v_textureCoordinate.xy * u_dimensions - f, gradVec) / dot(gradVec, gradVec);
      ${genGradientColors(props.stops.length)}
      gl_FragColor = mix(color, colorOut, clamp(colorOut.a, 0.0, 1.0));
    }
  `;
  },
};
