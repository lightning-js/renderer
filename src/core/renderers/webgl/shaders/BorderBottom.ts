import { assertTruthy } from '../../../../utils.js';
import {
  BorderBottomTemplate,
  type BorderBottomProps,
} from '../../../shaders/BorderBottomTemplate.js';
import type { WebGlShaderType } from '../WebGlShaderNode.js';

export const BorderBottom: WebGlShaderType<BorderBottomProps> = {
  name: BorderBottomTemplate.name,
  props: BorderBottomTemplate.props,
  update() {
    assertTruthy(this.props);
    this.uniform1f('u_width', this.props.width);
    this.uniformRGBA('u_color', this.props.color);
  },
  fragment: `
    # ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif

    uniform float u_alpha;
    uniform vec2 u_dimensions;
    uniform sampler2D u_texture;

    uniform float u_width;
    uniform vec4 u_color;

    varying vec4 v_color;
    varying vec2 v_textureCoordinate;

    void main() {
      vec4 color = texture2D(u_texture, v_textureCoordinate) * v_color;

      vec2 pos = vec2(0.0, u_dimensions.y - u_width * 0.5);
      vec2 p = v_textureCoordinate.xy * u_dimensions - pos + 1.0;
      vec2 size = vec2(u_dimensions.x, u_width * 0.5) + 1.5;
      vec2 dist = abs(p) - size;
      float shape = min(max(dist.x, dist.y), 0.0) + length(max(dist, 0.0));
      gl_FragColor = mix(color, u_color, clamp(-shape, 0.0, 1.0)) * u_alpha;
    }
  `,
};
