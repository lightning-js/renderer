import type { CoreNode } from '../../CoreNode.js';
import { calcFactoredRadiusArray, valuesAreEqual } from '../../lib/utils.js';
import type { Vec4 } from '../../renderers/webgl/internal/ShaderUtils.js';
import type { WebGlShaderType } from '../../renderers/webgl/WebGlShaderNode.js';
import {
  RoundedWithBorderAndShadowTemplate,
  type RoundedWithBorderAndShadowProps,
} from '../templates/RoundedWithBorderAndShadowTemplate.js';
import { Shadow } from './Shadow.js';

export const RoundedWithBorderAndShadow: WebGlShaderType<RoundedWithBorderAndShadowProps> =
  {
    name: RoundedWithBorderAndShadowTemplate.name,
    props: RoundedWithBorderAndShadowTemplate.props,
    update(node: CoreNode) {
      this.uniformRGBA('u_border_color', this.props!['border-color']);
      this.uniform4fa('u_border_width', this.props!['border-width'] as Vec4);

      this.uniform1i(
        'u_border_asym',
        valuesAreEqual(this.props!['border-width'] as number[]) ? 0 : 1,
      );

      this.uniformRGBA('u_shadow_color', this.props!['shadow-color']);
      this.uniform4fa('u_shadow', this.props!['shadow-projection']);

      this.uniform4fa(
        'u_radius',
        calcFactoredRadiusArray(
          this.props!.radius as Vec4,
          node.width,
          node.height,
        ),
      );
    },
    vertex: Shadow.vertex as string,
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
    uniform vec4 u_shadow_color;
    uniform vec4 u_shadow;

    varying vec4 v_color;
    varying vec2 v_position;
    varying vec2 v_textureCoordinate;

    float roundedBox(vec2 p, vec2 s, vec4 r) {
      r.xy = (p.x > 0.0) ? r.yz : r.xw;
      r.x = (p.y > 0.0) ? r.y : r.x;
      vec2 q = abs(p) - s + r.x;
      return (min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x) + 2.0;
    }

    float asymBorderWidth(vec2 p, float d, vec4 r, vec4 w) {
      r.x = r.x - (max(w.w, w.x) - min(w.w, w.x));
      r.y = r.y - (max(w.y, w.x) - min(w.y, w.x));
      r.z = r.x - (max(w.y, w.z) - min(w.y, w.z));
      r.w = r.w - (max(w.w, w.z) - min(w.w, w.z));

      p.x = p.x + (w[1] - w[3]) * u_pixelRatio;
      p.y = p.y - (w[0] - w[2]) * u_pixelRatio;
      vec2 size = vec2(u_dimensions.x - (w[3] + w[1]), u_dimensions.y - (w[0] + w[2])) * 0.5 + u_pixelRatio;
      float borderDist = roundedBox(p, size, r);
      return 1.0 - smoothstep(0.0, u_pixelRatio, max(-borderDist, d));
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
      float outerBoxDist = roundedBox(boxUv, halfDimensions, u_radius);

      float roundedAlpha = 1.0 - smoothstep(0.0, u_pixelRatio, outerBoxDist);
      float borderAlpha = 0.0;

      if(u_border_asym == 1) {
        borderAlpha = asymBorderWidth(boxUv, outerBoxDist, u_radius, u_border_width);
      }
      else {
        borderAlpha = 1.0 - smoothstep(u_border_width[0], u_border_width[0], abs(outerBoxDist));
      }

      float shadowAlpha = shadowBox(boxUv - u_shadow.xy, halfDimensions + u_shadow.w, u_radius + u_shadow.z);

      vec4 resColor = vec4(0.0);
      resColor = mix(resColor, u_shadow_color, shadowAlpha);
      resColor = mix(resColor, color, min(color.a, roundedAlpha));
      resColor = mix(resColor, u_border_color, min(u_border_color.a, min(borderAlpha, roundedAlpha)));
      gl_FragColor = resColor * u_alpha;
    }
  `,
  };
