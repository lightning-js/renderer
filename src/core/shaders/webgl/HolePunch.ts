import { calcFactoredRadiusArray } from '../../lib/utils.js';
import {
  HolePunchTemplate,
  type HolePunchProps,
} from '../templates/HolePunchTemplate.js';
import type { Vec4 } from '../../renderers/webgl/internal/ShaderUtils.js';
import type { WebGlShaderType } from '../../renderers/webgl/WebGlShaderNode.js';

export const HolePunch: WebGlShaderType<HolePunchProps> = {
  name: HolePunchTemplate.name,
  props: HolePunchTemplate.props,
  update() {
    this.uniform2f('u_pos', this.props!.x, this.props!.y);
    //precalculate to halfSize once instead of for every pixel
    this.uniform2f('u_size', this.props!.width * 0.5, this.props!.height * 0.5);

    this.uniform4fa(
      'u_radius',
      calcFactoredRadiusArray(
        this.props!.radius as Vec4,
        this.props!.width,
        this.props!.height,
      ),
    );
  },
  getCacheMarkers(props: HolePunchProps) {
    return `radiusArray:${Array.isArray(props.radius)}`;
  },
  fragment: `
    # ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif

    uniform float u_alpha;
    uniform float u_pixelRatio;
    uniform vec2 u_dimensions;
    uniform sampler2D u_texture;

    uniform vec2 u_size;
    uniform vec2 u_pos;

    uniform vec4 u_radius;

    uniform vec4 u_color;
    varying vec4 v_color;
    varying vec2 v_textureCoords;

    void main() {
      vec4 color = texture2D(u_texture, v_textureCoords) * v_color;
      vec2 p = (v_textureCoords.xy * u_dimensions.xy - u_pos) - u_size;
      vec4 r = u_radius;
      r.xy = (p.x > 0.0) ? r.yz : r.xw;
      r.x = (p.y > 0.0) ? r.y : r.x;
      p = abs(p) - u_size + r.x;
      float dist = min(max(p.x, p.y), 0.0) + length(max(p, 0.0)) - r.x + 2.0;
      float roundedAlpha = 1.0 - smoothstep(0.0, u_pixelRatio, dist);
      gl_FragColor = mix(color, vec4(0.0), min(color.a, roundedAlpha));
    }
  `,
};
