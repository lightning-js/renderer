import { assertTruthy } from '../../../../utils.js';
import type { CoreNode } from '../../../CoreNode.js';
import { getNormalizedRgbaComponents } from '../../../lib/utils.js';
import {
  RadialGradientTemplate,
  type RadialGradientProps,
} from '../../../shaders/RadialGradientTemplate.js';
import { genGradientColors } from '../internal/ShaderUtils.js';
import type { WebGlCoreRenderer } from '../WebGlCoreRenderer.js';
import type { WebGlShaderType } from '../WebGlShaderNode.js';

export const RadialGradient: WebGlShaderType<RadialGradientProps> = {
  name: RadialGradientTemplate.name,
  props: RadialGradientTemplate.props,
  update(node: CoreNode) {
    assertTruthy(this.props);

    this.uniform2f(
      'u_projection',
      this.props.pivot[0] * node.width,
      this.props.pivot[1] * node.height,
    );
    this.uniform2f('u_size', this.props.width * 0.5, this.props.height * 0.5);
    this.uniform1fv('u_stops', new Float32Array(this.props.stops));
    const colors: number[] = [];
    for (let i = 0; i < this.props.colors.length; i++) {
      const norm = getNormalizedRgbaComponents(this.props.colors[i]!);
      colors.push(norm[0], norm[1], norm[2], norm[3]);
    }
    this.uniform4fv('u_colors', new Float32Array(colors));
  },
  getCacheMarkers(props: RadialGradientProps) {
    return `colors:${props.colors.length}`;
  },
  fragment(renderer: WebGlCoreRenderer, props: RadialGradientProps) {
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

    uniform vec2 u_projection;
    uniform vec2 u_size;
    uniform float u_stops[${props.stops.length}];
    uniform vec4 u_colors[${props.colors.length}];

    varying vec4 v_color;
    varying vec2 v_textureCoordinate;

    vec2 calcPoint(float d, float angle) {
      return d * vec2(cos(angle), sin(angle)) + (u_dimensions * 0.5);
    }

    void main() {
      vec4 color = texture2D(u_texture, v_textureCoordinate) * v_color;
      vec2 point = v_textureCoordinate.xy * u_dimensions;
      float dist = length((point - u_projection) / u_size);
      ${genGradientColors(props.stops.length)}
      gl_FragColor = mix(color, colorOut, clamp(colorOut.a, 0.0, 1.0));
    }
  `;
  },
};
