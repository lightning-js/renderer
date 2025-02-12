import type { CoreNode } from '../../CoreNode.js';
import { calcFactoredRadiusArray, valuesAreEqual } from '../../lib/utils.js';
import type { Vec4 } from '../../renderers/webgl/internal/ShaderUtils.js';
import type { WebGlShaderType } from '../../renderers/webgl/WebGlShaderNode.js';
import {
  RoundedWithBorderTemplate,
  type RoundedWithBorderProps,
} from '../templates/RoundedWithBorderTemplate.js';
import { Rounded } from './Rounded.js';

export const RoundedWithBorder: WebGlShaderType<RoundedWithBorderProps> = {
  name: RoundedWithBorderTemplate.name,
  props: RoundedWithBorderTemplate.props,
  update(node: CoreNode) {
    this.uniformRGBA('u_border_color', this.props!['border-color']);
    this.uniform4fa('u_border_width', this.props!['border-width'] as Vec4);
    this.uniform1i(
      'u_border_asym',
      valuesAreEqual(this.props!['border-width'] as number[]) ? 0 : 1,
    );
    this.uniform4fa(
      'u_radius',
      calcFactoredRadiusArray(
        this.props!.radius as Vec4,
        node.width,
        node.height,
      ),
    );
  },
  vertex: Rounded.vertex,
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

    uniform vec4 u_radius;

    uniform vec4 u_border_width;
    uniform vec4 u_border_color;
    uniform int u_border_asym;

    varying vec4 v_color;
    varying vec2 v_textureCoords;
    varying vec2 v_nodeCoords;

    float roundedBox(vec2 p, vec2 s, vec4 r) {
      r.xy = (p.x > 0.0) ? r.yz : r.xw;
      r.x = (p.y > 0.0) ? r.y : r.x;
      vec2 q = abs(p) - s + r.x;
      return (min(max(q.x, q.y), 0.0) + length(max(q, 0.0))) - r.x;
    }

    float asymBorderWidth(vec2 p, float d, vec4 r, vec4 w) {
      r.x = (r.x - (max(w.w, w.x) - min(w.w, w.x))) * 0.5;
      r.y = (r.y - (max(w.y, w.x) - min(w.y, w.x))) * 0.5;
      r.z = (r.z - (max(w.y, w.z) - min(w.y, w.z))) * 0.5;
      r.w = (r.w - (max(w.w, w.z) - min(w.w, w.z))) * 0.5;

      p.x += w.y > w.w ? (w.y - w.w) * 0.5 : -(w.w - w.y) * 0.5;
      p.y += w.z > w.x ? (w.z - w.x) * 0.5 : -(w.x - w.z) * 0.5;

      vec2 size = vec2(u_dimensions.x - (w[3] + w[1]), u_dimensions.y - (w[0] + w[2])) * 0.5;
      float borderDist = roundedBox(p, size + u_pixelRatio, r);
      return 1.0 - smoothstep(0.0, u_pixelRatio, max(-borderDist, d));
    }

    void main() {
      vec4 color = texture2D(u_texture, v_textureCoords) * v_color;
      vec2 halfDimensions = (u_dimensions * 0.5);

      vec2 boxUv = v_nodeCoords.xy * u_dimensions - halfDimensions;
      float boxDist = roundedBox(boxUv, halfDimensions, u_radius);

      float roundedAlpha = 1.0 - smoothstep(0.0, u_pixelRatio, boxDist);
      float borderAlpha = 0.0;

      if(u_border_asym == 1) {
        borderAlpha = asymBorderWidth(boxUv, boxDist, u_radius, u_border_width);
      }
      else {
        borderAlpha = 1.0 - smoothstep(u_border_width[0] - u_pixelRatio, u_border_width[0], abs(boxDist));
      }

      vec4 resColor = vec4(0.0);
      resColor = mix(resColor, color, min(color.a, roundedAlpha));
      resColor = mix(resColor, u_border_color, min(u_border_color.a, min(borderAlpha, roundedAlpha)));
      gl_FragColor = resColor * u_alpha;
    }
  `,
};
