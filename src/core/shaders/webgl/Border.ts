import { assertTruthy } from '../../../utils.js';
import type { CoreNode } from '../../CoreNode.js';
import { calcFactoredRadiusArray, valuesAreEqual } from '../../lib/utils.js';
import {
  BorderTemplate,
  type BorderProps,
} from '../templates/BorderTemplate.js';
import type { Vec4 } from '../../renderers/webgl/internal/ShaderUtils.js';
import type { WebGlShaderType } from '../../renderers/webgl/WebGlShaderNode.js';

export const Border: WebGlShaderType<BorderProps> = {
  name: BorderTemplate.name,
  props: BorderTemplate.props,
  update(node: CoreNode) {
    assertTruthy(this.props);
    this.uniform4fv('u_width', new Float32Array(this.props.width as Vec4));
    this.uniform1i(
      'u_asymWidth',
      valuesAreEqual(this.props.width as number[]) ? 0 : 1,
    );

    this.uniform4fv('u_shadow', new Float32Array([20, 40, 30, 30]));

    this.uniformRGBA('u_color', this.props.color);
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

    uniform vec2 u_resolution;
    uniform float u_pixelRatio;
    uniform vec2 u_dimensions;
    uniform vec4 u_shadow;

    varying vec4 v_color;
    varying vec2 v_textureCoordinate;

    void main() {

      vec2 screenSpace = vec2(2.0 / u_resolution.x,  -2.0 / u_resolution.y);

      vec2 outerEdge = clamp(a_textureCoordinate * 2.0 - vec2(1.0), -1.0, 1.0);

      vec2 shadowEdge = outerEdge * max(vec2(0.0), u_shadow.xy + u_shadow.w + u_shadow.z);
      vec2 vertexPos = a_position * u_pixelRatio;// (a_position + outerEdge + shadowEdge) * u_pixelRatio;
      vec2 normVertexPos = a_position * u_pixelRatio;

      gl_Position = vec4(vertexPos.x * screenSpace.x - 1.0, -sign(screenSpace.y) * (vertexPos.y * -abs(screenSpace.y)) + 1.0, 0.0, 1.0);

      v_color = a_color;
      v_textureCoordinate = a_textureCoordinate;// + ((vertexPos - normVertexPos) / u_dimensions) * ((u_resolution / u_dimensions) * u_pixelRatio);
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

    uniform int u_asymWidth;

    varying vec4 v_color;
    varying vec2 v_position;
    varying vec2 v_textureCoordinate;

    float roundedBox(vec2 p, vec2 s, vec4 r) {
      r.xy = (p.x > 0.0) ? r.yz : r.xw;
      r.x = (p.y > 0.0) ? r.y : r.x;
      vec2 q = abs(p) - s + r.x;
      return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
    }

    float asymBorderWidth(vec2 p, float d, vec4 r, vec4 w) {
      r.x = r.x - (max(w.w, w.x) - min(w.w, w.x));
      r.y = r.y - (max(w.y, w.x) - min(w.y, w.x));
      r.z = r.x - (max(w.y, w.z) - min(w.y, w.z));
      r.w = r.w - (max(w.w, w.z) - min(w.w, w.z));
      p.x = p.x + w[1] * 0.5;
      p.y = p.y + w[2] * 0.5;
      vec2 size = vec2(u_dimensions.x - (w.w + w.y), u_dimensions.y - (w.x + w.z)) * 0.5 + u_pixelRatio;
      float borderDist = roundedBox(p, size, r);
      return 1.0 - smoothstep(0.0, u_pixelRatio, max(-borderDist, d));
    }

    void main() {
      vec4 color = texture2D(u_texture, v_textureCoordinate) * v_color;
      vec2 halfDimensions = (u_dimensions * 0.5);

      vec2 outerBoxUv = v_textureCoordinate.xy * u_dimensions - halfDimensions;
      float outerBoxDist = roundedBox(outerBoxUv, halfDimensions, u_radius);

      float roundedAlpha = 1.0 - smoothstep(0.0, 1.0, outerBoxDist);
      float borderAlpha = 0.0;

      if(u_asymWidth == 1) {
        borderAlpha = asymBorderWidth(outerBoxUv, outerBoxDist, u_radius, u_width);
      }
      else {
        borderAlpha = 1.0 - smoothstep(u_width[0], u_width[0], abs(outerBoxDist));
      }

      // float shadowDist = roundedBox(outerBoxUv - u_shadow.xy, halfDimensions, u_radius);
      // float shadowAlpha = 1.0 - smoothstep(-u_shadow.z, u_shadow.z, shadowDist);

      vec4 resColor = vec4(0.0);
      // resColor = mix(resColor, vec4(vec3(0.2), shadowAlpha), shadowAlpha);
      resColor = mix(resColor, color, min(color.a, roundedAlpha));
      resColor = mix(resColor, u_color , min(u_color.a, min(borderAlpha, roundedAlpha)));
      gl_FragColor = resColor * u_alpha;
    }
  `,
};
