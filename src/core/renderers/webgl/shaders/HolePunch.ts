import { assertTruthy } from '../../../../utils.js';
import {
  calcFactoredRadius,
  calcFactoredRadiusArray,
} from '../../../lib/utils.js';
import {
  HolePunchTemplate,
  type HolePunchProps,
} from '../../../shaders/HolePunchTemplate.js';
import type { WebGlCoreRenderer } from '../WebGlCoreRenderer.js';
import type { WebGlShaderType } from '../WebGlShaderProgram.js';

export const HolePunch: WebGlShaderType<HolePunchProps> = {
  name: HolePunchTemplate.name,
  props: HolePunchTemplate.props,
  update() {
    assertTruthy(this.props);

    this.uniform2f('u_pos', this.props.x, this.props.y);
    //precalculate to halfSize once instead of for every pixel
    this.uniform2f('u_size', this.props.width * 0.5, this.props.height * 0.5);

    if (!Array.isArray(this.props.radius)) {
      this.uniform1f(
        'u_radius',
        calcFactoredRadius(
          this.props.radius,
          this.props.width,
          this.props.height,
        ),
      );
    } else {
      const fRadius = calcFactoredRadiusArray(
        this.props.radius,
        this.props.width,
        this.props.height,
      );
      this.uniform4f(
        'u_radius',
        fRadius[0],
        fRadius[1],
        fRadius[2],
        fRadius[3],
      );
    }
  },
  getCacheMarkers(props: HolePunchProps) {
    return `radiusArray:${Array.isArray(props.radius)}`;
  },
  fragment(renderer: WebGlCoreRenderer, props: HolePunchProps) {
    return `
    # ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif

    uniform float u_alpha;
    uniform vec2 u_dimensions;
    uniform sampler2D u_texture;

    uniform vec2 u_size;
    uniform vec2 u_pos;

    uniform ${Array.isArray(props.radius) ? 'vec4' : 'float'} u_radius;

    uniform vec4 u_color;
    varying vec4 v_color;
    varying vec2 v_textureCoordinate;

    void main() {
      vec4 color = texture2D(u_texture, v_textureCoordinate) * v_color;
      vec2 basePos = v_textureCoordinate.xy * u_dimensions.xy - u_pos;
      vec2 pos = basePos - u_size;
      ${
        Array.isArray(props.radius)
          ? `
          float radius = u_radius[0] * step(pos.x, 0.5) * step(pos.y, 0.5);
          radius = radius + u_radius[1] * step(0.5, pos.x) * step(pos.y, 0.5);
          radius = radius + u_radius[2] * step(0.5, pos.x) * step(0.5, pos.y);
          radius = radius + u_radius[3] * step(pos.x, 0.5) * step(0.5, pos.y);
        `
          : `
          float radius = u_radius;
        `
      }

      vec2 size = u_size - vec2(radius);
      pos = abs(pos) - size;
      float dist = min(max(pos.x, pos.y), 0.0) + length(max(pos, 0.0)) - radius;
      gl_FragColor = mix(color, vec4(0.0), clamp(-dist, 0.0, 1.0));
    }
  `;
  },
};
