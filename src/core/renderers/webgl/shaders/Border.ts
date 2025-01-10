import { assertTruthy } from '../../../../utils.js';
import type { CoreNode } from '../../../CoreNode.js';
import { calcFactoredRadiusArray } from '../../../lib/utils.js';
import {
  BorderTemplate,
  type BorderProps,
} from '../../../shaders/BorderTemplate.js';
import type { Vec4 } from '../internal/ShaderUtils.js';
import type { WebGlShaderType } from '../WebGlShaderNode.js';

export const Border: WebGlShaderType<BorderProps> = {
  name: BorderTemplate.name,
  props: BorderTemplate.props,
  update(node: CoreNode) {
    assertTruthy(this.props);
    this.uniform4fv('u_width', new Float32Array(this.props.width as Vec4));
    this.uniformRGBA('u_color', this.props.color);

    // this.uniform4fv('u_shadow', new Float32Array([0, 10, 30, 10]))

    const fRadius = calcFactoredRadiusArray(
      this.props.radius as Vec4,
      node.width,
      node.height,
    );
    this.uniform4f('u_radius', fRadius[0], fRadius[1], fRadius[2], fRadius[3]);
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
    attribute vec2 a_nodeCoordinate;

    uniform vec2 u_resolution;
    uniform float u_pixelRatio;
    uniform vec2 u_dimensions;
    uniform vec4 u_shadow;

    varying vec4 v_color;
    varying vec2 v_textureCoordinate;

    void main() {
      vec2 normalized = a_position * u_pixelRatio;
      vec2 screenSpace = vec2(2.0 / u_resolution.x, -2.0 / u_resolution.y);

      vec2 outerEdge = clamp(a_textureCoordinate * 2.0 - vec2(1.0), -1.0, 1.0);
      vec2 shadowEdge = outerEdge;
      vec2 vertexPos = normalized + outerEdge + shadowEdge;
      v_color = a_color;
      v_textureCoordinate = a_textureCoordinate;

      gl_Position = vec4(vertexPos.x * screenSpace.x - 1.0, -sign(screenSpace.y) * (vertexPos.y * -abs(screenSpace.y)) + 1.0, 0.0, 1.0);
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

    uniform vec4 u_width;
    uniform vec4 u_color;
    uniform vec4 u_radius;
    uniform vec4 u_shadow;

    varying vec4 v_color;
    varying vec2 v_position;
    varying vec2 v_textureCoordinate;

    float roundedBox(vec2 p, vec2 s, vec4 r) {
      r.xy = (p.x > 0.0) ? r.yz : r.xw;
      r.x = (p.y > 0.0) ? r.y : r.x;
      vec2 q = abs(p) - s + r.x;
      return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
    }

    void main() {
      vec4 color = texture2D(u_texture, v_textureCoordinate) * v_color;
      vec2 halfDimensions = (u_dimensions * 0.5);

      vec2 outerBoxUv = v_textureCoordinate.xy * u_dimensions - halfDimensions;
      float outerBoxDist = roundedBox(outerBoxUv, halfDimensions, u_radius);

      float roundedAlpha = 1.0 - smoothstep(0.0, u_pixelRatio, outerBoxDist);

      vec4 borderWidth = u_width;
      // borderWidth.xy = (outerBoxUv.x > 0.0) > borderWidth.xy ? borderWidth.xw;
      // borderWidth.x = (outerBoxUv.x > 0.0) > borderWidth.x ? borderWidth.y;

      float borderAlpha = 1.0 - smoothstep(borderWidth.x - u_pixelRatio, borderWidth.x, abs(outerBoxDist));
      // float shadowDist = roundedBox(outerBoxUv + u_shadow.xy, halfDimensions, u_radius);
      // float shadowAlpha = 1.0 - smoothstep(-u_shadow.z, u_shadow.z, shadowDist);

      vec4 resColor = vec4(0.0);
      //resColor = mix(resColor, vec4(vec3(0.4), shadowAlpha), shadowAlpha);
      resColor = mix(resColor, color, min(color.a, roundedAlpha));
      resColor = mix(resColor, u_color , min(u_color.a, min(borderAlpha, roundedAlpha)));

      gl_FragColor = resColor;
    }
  `,
};
