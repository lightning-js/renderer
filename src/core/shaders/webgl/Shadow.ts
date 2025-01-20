import type { WebGlShaderType } from '../../renderers/webgl/WebGlShaderNode.js';
import {
  ShadowTemplate,
  type ShadowProps,
} from '../templates/ShadowTemplate.js';

export const Shadow: WebGlShaderType<ShadowProps> = {
  name: ShadowTemplate.name,
  props: ShadowTemplate.props,
  update() {
    this.uniformRGBA('u_color', this.props!.color);
    this.uniform4fa('u_shadow', this.props!.projection);
  },
  vertex: `
    # ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif

    attribute vec2 a_position;
    attribute vec2 a_textureCoordinate;
    attribute vec4 a_color;

    uniform vec2 u_resolution;
    uniform float u_pixelRatio;
    uniform vec2 u_dimensions;

    uniform vec4 u_shadow;

    varying vec4 v_color;
    varying vec2 v_textureCoordinate;

    void main() {
      vec2 screenSpace = vec2(2.0 / u_resolution.x,  -2.0 / u_resolution.y);
      vec2 outerEdge = clamp(a_textureCoordinate * 2.0 - vec2(1.0), -1.0, 1.0);

      vec2 shadowEdge = outerEdge * (u_shadow.w + u_shadow.z) + u_shadow.xy;
      vec2 normVertexPos = a_position * u_pixelRatio;

      vec2 vertexPos = (a_position + outerEdge + shadowEdge) * u_pixelRatio;
      gl_Position = vec4(vertexPos.x * screenSpace.x - 1.0, -sign(screenSpace.y) * (vertexPos.y * -abs(screenSpace.y)) + 1.0, 0.0, 1.0);

      v_color = a_color;
      v_textureCoordinate = a_textureCoordinate + (screenSpace + shadowEdge) / u_dimensions;
    }
  `,
  fragment: `
    # ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    # else
    precision mediump float;
    # endif

    uniform vec2 u_resolution;
    uniform float u_pixelRatio;
    uniform float u_alpha;
    uniform vec2 u_dimensions;
    uniform sampler2D u_texture;

    uniform vec4 u_color;
    uniform vec4 u_shadow;

    varying vec4 v_color;
    varying vec2 v_textureCoordinate;

    float box(vec2 p, vec2 s) {
      vec2 q = abs(p) - s;
      return (min(max(q.x, q.y), 0.0) + length(max(q, 0.0))) + 2.0;
    }

    float shadowBox(vec2 p, vec2 s, vec4 r) {
      r.xy = (p.x > 0.0) ? r.yz : r.xw;
      r.x = (p.y > 0.0) ? r.y : r.x;
      vec2 q = abs(p) - s + r.x;
      float dist = min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
      return 1.0 - smoothstep(-u_shadow.z, u_shadow.z, dist);
    }

    void main() {
      vec4 color = texture2D(u_texture, v_textureCoordinate) * v_color;
      vec2 halfDimensions = (u_dimensions * 0.5);

      vec2 boxUv = v_textureCoordinate.xy * u_dimensions - halfDimensions;
      float boxDist = box(boxUv, halfDimensions);

      float boxAlpha = 1.0 - smoothstep(0.0, u_pixelRatio, boxDist);
      float shadowAlpha = shadowBox(boxUv - u_shadow.xy, halfDimensions + u_shadow.w, u_shadow.z);

      vec4 resColor = vec4(0.0);
      resColor = mix(resColor, u_color, shadowAlpha);
      resColor = mix(resColor, color, min(color.a, boxAlpha));
      gl_FragColor = resColor * u_alpha;
    }
  `,
};
