import type { CoreNode } from '../../../CoreNode.js';
import {
  calcFactoredRadius,
  calcFactoredRadiusArray,
  getNormalizedRgbaComponents,
} from '../../../lib/utils.js';
import {
  BorderTemplate,
  type BorderProps,
} from '../../../shaders/BorderTemplate.js';
import type { WebGlCoreRenderer } from '../WebGlCoreRenderer.js';
import type { WebGlShaderConfig } from '../WebGlShaderProgram.js';

export const Border: WebGlShaderConfig<BorderProps> = {
  name: BorderTemplate.name,
  props: BorderTemplate.props,
  update(node: CoreNode) {
    const props = this.props!;
    this.uniform1f('u_width', props.width);
    this.uniform4fv(
      'u_color',
      new Float32Array(getNormalizedRgbaComponents(props.color)),
    );
    if (!Array.isArray(props.radius)) {
      this.uniform1f(
        'u_radius',
        calcFactoredRadius(props.radius, node.width, node.height),
      );
    } else {
      const fRadius = calcFactoredRadiusArray(
        props.radius,
        node.width,
        node.height,
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
  getCacheMarkers(props: BorderProps) {
    return `radiusArray:${Array.isArray(props.radius)}`;
  },
  fragment(renderer: WebGlCoreRenderer, props: BorderProps) {
    return `
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
      uniform ${Array.isArray(props.radius) ? 'vec4' : 'float'} u_radius;

      varying vec4 v_color;
      varying vec2 v_textureCoordinate;

      void main() {
        vec4 color = texture2D(u_texture, v_textureCoordinate) * v_color;
        vec2 halfDimensions = u_dimensions * 0.5;
        vec2 size = halfDimensions + 0.5;

        vec2 pos = v_textureCoordinate.xy * u_dimensions - halfDimensions;

        ${
          Array.isArray(props.radius)
            ? `
            float radius = u_radius[0] * step(v_textureCoordinate.x, 0.5) * step(v_textureCoordinate.y, 0.5);
            radius = radius + u_radius[1] * step(0.5, v_textureCoordinate.x) * step(v_textureCoordinate.y, 0.5);
            radius = radius + u_radius[2] * step(0.5, v_textureCoordinate.x) * step(0.5, v_textureCoordinate.y);
            radius = radius + u_radius[3] * step(v_textureCoordinate.x, 0.5) * step(0.5, v_textureCoordinate.y);
          `
            : `
            float radius = u_radius;
          `
        }

        //calc shape of rectangle
        size -= vec2(radius);
        vec2 dist = abs(pos) - size;
        float shape = (min(max(dist.x, dist.y), 0.0) + length(max(dist, 0.0)) - radius) + 1.0;
        color = mix(vec4(0.0), color, clamp(-shape, 0.0, 1.0));

        //calc signed distance for border
        shape = clamp(shape + u_width, 0.0, 1.0) - clamp(shape, 0.0, 1.0);
        gl_FragColor = mix(color, mix(color, u_color, u_color.a), shape) * u_alpha;
      }
    `;
  },
};
